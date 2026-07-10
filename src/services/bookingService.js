/**
 * Bookings — the operational core.
 * Collection: bookings/{id}
 *
 * Phase 1 covers: creation (Zelle → pending_payment, cash → searching_worker),
 * client tracking/history, and admin Zelle verification. The dispatch
 * ("first worker to accept wins") and money-freeze-on-completion are Cloud
 * Functions added in Phase 2 — see constants/bookingStatus + constants/payments.
 *
 * Snapshots (service/vehicle/address) are stored INLINE so historical orders
 * never change when the admin later edits a price or the client edits a vehicle.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  runTransaction,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import {
  BOOKING_STATUS,
  ACTIVE_STATUSES,
  WORKER_PROGRESS_FLOW,
  canTransition,
} from '@/constants/bookingStatus';
import { PAYMENT_METHOD, isTransferMethod } from '@/constants/payments';
import { computeOrderQuote } from '@/utils/pricing';
import { AppError, toAppError } from '@/utils/errors';

const bookingsRef = collection(db, 'bookings');
const mapDoc = (d) => ({ id: d.id, ...d.data() });

// millis() reads a Firestore Timestamp safely (a just-written serverTimestamp
// can be momentarily null on the local snapshot). Used for client-side sorting.
const millis = (ts) => (ts?.toMillis ? ts.toMillis() : 0);

/**
 * Creates a booking after verifying the client has no other active order.
 * The active-order check is a client-side query here; the hard guarantee is
 * added with a Cloud Function / security rule in Phase 2 (documented).
 */
export const createBooking = async ({
  client,
  items = [],
  extras = [],
  address,
  scheduledAt,
  paymentMethod,
  payment,
}) => {
  try {
    const activeSnap = await getDocs(
      query(
        bookingsRef,
        where('clientId', '==', client.uid),
        where('status', 'in', ACTIVE_STATUSES)
      )
    );
    if (!activeSnap.empty) throw new AppError('client.oneActiveOrderOnly');

    // An order can hold up to 5 cars, each with its own package. The quote sums
    // every car (priced by its type) plus the order-level extras.
    const quote = computeOrderQuote(items, extras);
    if (quote.lines.length === 0) throw new AppError('error.generic');

    // Zelle/Venmo require up-front payment + admin verification; cash goes
    // straight to dispatch since the worker collects it in hand.
    const isTransfer = isTransferMethod(paymentMethod);

    const orderItems = quote.lines.map((l) => ({
      service: { id: l.service.id, name: l.service.name, durationMinutes: l.service.durationMinutes ?? 0 },
      vehicle: {
        make: l.vehicle.make,
        model: l.vehicle.model,
        type: l.vehicle.type,
        color: l.vehicle.color ?? '',
        photoUrl: l.vehicle.photoUrl ?? null,
      },
      price: l.price,
      detailerPay: l.detailerPay,
    }));
    const first = orderItems[0];

    const docRef = await addDoc(bookingsRef, {
      clientId: client.uid,
      clientName: client.name,
      workerId: null,

      // Full list of cars + packages in this order.
      items: orderItems,
      carCount: orderItems.length,
      // First item duplicated as *Snapshot for older screens/back-compat.
      serviceSnapshot: first.service,
      vehicleSnapshot: first.vehicle,
      extras: (extras ?? []).map((e) => ({
        id: e.id,
        name: e.name,
        quantity: Number(e.quantity) || 1,
        price: Number(e.price) || 0,
        detailerPay: Number(e.detailerPay) || 0,
      })),
      addressSnapshot: {
        fullAddress: address.fullAddress,
        city: address.city,
        notes: address.notes ?? '',
      },

      scheduledAt: Timestamp.fromDate(scheduledAt),
      total: quote.total,
      businessFee: quote.businessFee,
      workerPayout: quote.workerPayout,

      status: isTransfer ? BOOKING_STATUS.PENDING_PAYMENT : BOOKING_STATUS.SEARCHING_WORKER,
      payment: {
        method: paymentMethod,
        receiptUrl: payment?.receiptUrl ?? null,
        confirmationCode: payment?.confirmationCode ?? null,
        verifiedBy: null,
        verifiedAt: null,
        rejectionReason: null,
      },
      rejectedBy: [],
      completionPhotos: [],
      review: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    throw toAppError(error);
  }
};

// --- Client reads -----------------------------------------------------------

/**
 * All of a client's bookings, newest first (history).
 *
 * Single-field `where` + client-side sort (a client's order list is small) so
 * this needs no composite index — same index-free pattern as the worker queues.
 */
export const subscribeClientBookings = (uid, onData, onError) => {
  return onSnapshot(
    query(bookingsRef, where('clientId', '==', uid)),
    (snap) => {
      const orders = snap.docs.map(mapDoc).sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
      onData(orders);
    },
    onError
  );
};

/** The client's current active order (most recent), or null. Index-free. */
export const subscribeClientActiveBooking = (uid, onData, onError) => {
  return onSnapshot(
    query(bookingsRef, where('clientId', '==', uid)),
    (snap) => {
      const active = snap.docs
        .map(mapDoc)
        .filter((b) => ACTIVE_STATUSES.includes(b.status))
        .sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
      onData(active[0] ?? null);
    },
    onError
  );
};

/** A single booking, live (tracking screen). */
export const subscribeBooking = (id, onData, onError) => {
  return onSnapshot(doc(db, 'bookings', id), (snap) => onData(snap.exists() ? mapDoc(snap) : null), onError);
};

// --- Admin: dashboard -------------------------------------------------------

/** All bookings created on/after `since` (used for today's dashboard metrics). */
export const subscribeBookingsSince = (since, onData, onError) => {
  return onSnapshot(
    query(
      bookingsRef,
      where('createdAt', '>=', Timestamp.fromDate(since)),
      orderBy('createdAt', 'desc')
    ),
    (snap) => onData(snap.docs.map(mapDoc)),
    onError
  );
};

// --- Worker/Admin: dispatch -------------------------------------------------

/** Statuses in which a worker is actively handling an order they own. */
const WORKER_ACTIVE_STATUSES = [
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.ON_THE_WAY,
  BOOKING_STATUS.ARRIVED,
  BOOKING_STATUS.IN_PROGRESS,
];

/**
 * Live queue of orders broadcast to available workers ("first to accept wins"),
 * oldest first so the longest-waiting client is served first.
 *
 * Sorted client-side (the queue is small) so this needs only a single-field
 * index, not a composite one — the dispatch works without extra setup.
 */
export const subscribeSearchingOrders = (onData, onError) => {
  return onSnapshot(
    query(bookingsRef, where('status', '==', BOOKING_STATUS.SEARCHING_WORKER)),
    (snap) => {
      const orders = snap.docs.map(mapDoc).sort((a, b) => millis(a.createdAt) - millis(b.createdAt));
      onData(orders);
    },
    onError
  );
};

/**
 * A worker's completed orders, newest first (their "recent work" history).
 * Single-field `where` + client-side sort keeps it index-free.
 */
export const subscribeWorkerHistory = (uid, onData, onError) => {
  return onSnapshot(
    query(bookingsRef, where('workerId', '==', uid)),
    (snap) => {
      const done = snap.docs
        .map(mapDoc)
        .filter((b) => b.status === BOOKING_STATUS.COMPLETED)
        .sort((a, b) => millis(b.updatedAt ?? b.createdAt) - millis(a.updatedAt ?? a.createdAt));
      onData(done);
    },
    onError
  );
};

/**
 * The order this worker currently owns and is still working, or null.
 * Single-field query + client-side pick keeps it index-free.
 */
export const subscribeWorkerActiveBooking = (uid, onData, onError) => {
  return onSnapshot(
    query(bookingsRef, where('workerId', '==', uid)),
    (snap) => {
      const active = snap.docs
        .map(mapDoc)
        .filter((b) => WORKER_ACTIVE_STATUSES.includes(b.status))
        .sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
      onData(active[0] ?? null);
    },
    onError
  );
};

/**
 * Claims a searching order for `worker`. The whole check-then-write runs in a
 * transaction so that if two workers tap "Accept" at the same time, only the
 * first commit wins and the loser gets `error.orderTaken`.
 */
export const acceptOrder = async (id, worker) => {
  const bookingDoc = doc(db, 'bookings', id);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(bookingDoc);
      if (!snap.exists()) throw new AppError('error.generic');
      const b = snap.data();
      if (b.status !== BOOKING_STATUS.SEARCHING_WORKER || b.workerId) {
        throw new AppError('error.orderTaken');
      }
      tx.update(bookingDoc, {
        status: BOOKING_STATUS.ASSIGNED,
        workerId: worker.uid,
        workerName: worker.name ?? null,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    throw toAppError(error);
  }
};

/**
 * Moves the worker's owned order to the next step of WORKER_PROGRESS_FLOW
 * (on the way → arrived → washing → completed). No-ops once completed.
 */
export const advanceWorkerStatus = async (booking) => {
  const idx = WORKER_PROGRESS_FLOW.indexOf(booking.status);
  const next = idx === -1 ? WORKER_PROGRESS_FLOW[0] : WORKER_PROGRESS_FLOW[idx + 1];
  if (!next) return; // already completed
  try {
    await transition(booking.id, next);
  } catch (error) {
    throw toAppError(error);
  }
};

// --- Admin: Zelle verification ---------------------------------------------

/**
 * Pending Zelle/Venmo receipts, oldest first (the verification queue).
 * Single-field `where` + client-side sort keeps it index-free.
 */
export const subscribePendingPayments = (onData, onError) => {
  return onSnapshot(
    query(bookingsRef, where('status', '==', BOOKING_STATUS.PENDING_PAYMENT)),
    (snap) => {
      const orders = snap.docs.map(mapDoc).sort((a, b) => millis(a.createdAt) - millis(b.createdAt));
      onData(orders);
    },
    onError
  );
};

/**
 * Runs a guarded status transition inside a transaction so concurrent taps or
 * stale list items cannot drive an illegal/duplicate change.
 */
const transition = async (id, toStatus, patch = {}) => {
  const bookingDoc = doc(db, 'bookings', id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(bookingDoc);
    if (!snap.exists()) throw new AppError('error.generic');
    const current = snap.data().status;
    if (current === toStatus) return; // idempotent: already there
    if (!canTransition(current, toStatus)) throw new AppError('error.generic');
    tx.update(bookingDoc, { status: toStatus, updatedAt: serverTimestamp(), ...patch });
  });
};

export const approvePayment = async (id, adminUid) => {
  try {
    await transition(id, BOOKING_STATUS.SEARCHING_WORKER, {
      'payment.verifiedBy': adminUid,
      'payment.verifiedAt': serverTimestamp(),
      'payment.rejectionReason': null,
    });
  } catch (error) {
    throw toAppError(error);
  }
};

export const rejectPayment = async (id, adminUid, reason) => {
  try {
    await transition(id, BOOKING_STATUS.PAYMENT_REJECTED, {
      'payment.verifiedBy': adminUid,
      'payment.verifiedAt': serverTimestamp(),
      'payment.rejectionReason': (reason ?? '').trim() || null,
    });
  } catch (error) {
    throw toAppError(error);
  }
};

/** Client re-uploads a receipt after rejection. */
export const reuploadReceipt = async (id, { receiptUrl, confirmationCode }) => {
  try {
    await transition(id, BOOKING_STATUS.PENDING_PAYMENT, {
      'payment.receiptUrl': receiptUrl ?? null,
      'payment.confirmationCode': confirmationCode ?? null,
      'payment.rejectionReason': null,
    });
  } catch (error) {
    throw toAppError(error);
  }
};

/** Cancel an order (client within allowed states, or admin any state). */
export const cancelBooking = async (id, { by, reason } = {}) => {
  try {
    await transition(id, BOOKING_STATUS.CANCELLED, {
      cancelledBy: by ?? null,
      cancelReason: (reason ?? '').trim() || null,
    });
  } catch (error) {
    throw toAppError(error);
  }
};

/**
 * Client rates the detailer after a completed order. rating is 1 (sad),
 * 2 (neutral) or 3 (happy). Stored on the booking so the detailer's average is
 * computed from their completed orders.
 */
export const submitReview = async (id, { rating, comment }) => {
  try {
    await updateDoc(doc(db, 'bookings', id), {
      review: {
        rating: Number(rating) || 0,
        comment: (comment ?? '').trim() || null,
        createdAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toAppError(error);
  }
};
