/**
 * Detailer earnings & settlement.
 *
 * Money model: each completed order has `workerPayout` (what the detailer earns)
 * and `businessFee` (= total − workerPayout). How the business SETTLES with the
 * detailer depends on how the client paid:
 *
 *   - Transfer (Zelle/Venmo): the client paid the BUSINESS the full total, so
 *     the business OWES the detailer their `workerPayout`  → +workerPayout.
 *   - Cash: the detailer collected the full total in hand, so they OWE the
 *     business its `businessFee`                            → −businessFee.
 *
 * Net to transfer to a detailer = Σ(transfer payouts) − Σ(cash fees). Positive =
 * the admin pays the detailer; negative = the detailer owes the business.
 *
 * The admin marks orders as settled (`settledAt`) once paid by manual transfer.
 */

import {
  collection, query, where, onSnapshot, writeBatch, doc, serverTimestamp,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { BOOKING_STATUS } from '@/constants/bookingStatus';
import { isTransferMethod } from '@/constants/payments';
import { toAppError } from '@/utils/errors';

const bookingsRef = collection(db, 'bookings');
const mapDoc = (d) => ({ id: d.id, ...d.data() });
const millis = (ts) => (ts?.toMillis ? ts.toMillis() : 0);

/** What this completed order does to the detailer's balance with the business. */
export const settlementEffect = (order) => {
  const payout = Number(order.workerPayout) || 0;
  const fee = Number(order.businessFee) || 0;
  return isTransferMethod(order.payment?.method) ? payout : -fee;
};

/** True if the order happened today (local time). */
const isToday = (order) => {
  const ms = millis(order.updatedAt) || millis(order.createdAt);
  if (!ms) return false;
  const d = new Date(ms);
  const now = new Date();
  return d.toDateString() === now.toDateString();
};

/** Rolls a list of a detailer's completed orders into the numbers we show. */
export const summarizeDetailer = (orders) => {
  const completed = orders.filter((o) => o.status === BOOKING_STATUS.COMPLETED);
  const pending = completed.filter((o) => !o.settledAt);
  const today = completed.filter(isToday);
  const reviewed = completed.filter((o) => o.review?.rating);
  return {
    completedCount: completed.length,
    todayCount: today.length,
    todayEarnings: today.reduce((s, o) => s + (Number(o.workerPayout) || 0), 0),
    earningsTotal: completed.reduce((s, o) => s + (Number(o.workerPayout) || 0), 0),
    pendingOrders: pending.sort((a, b) => millis(b.updatedAt) - millis(a.updatedAt)),
    pendingToPay: pending.reduce((s, o) => s + settlementEffect(o), 0),
    reviewCount: reviewed.length,
    avgRating: reviewed.length
      ? reviewed.reduce((s, o) => s + (Number(o.review.rating) || 0), 0) / reviewed.length
      : 0,
  };
};

/**
 * A single detailer's earnings view. Queries by workerId only (single-field, no
 * composite index) and lets summarizeDetailer filter to completed orders.
 */
export const subscribeMyPayouts = (uid, onData, onError) =>
  onSnapshot(
    query(bookingsRef, where('workerId', '==', uid)),
    (snap) => onData(summarizeDetailer(snap.docs.map(mapDoc))),
    onError
  );

/** All completed orders (admin), grouped per detailer for settlement. */
export const subscribeAllPayouts = (onData, onError) =>
  onSnapshot(
    query(bookingsRef, where('status', '==', BOOKING_STATUS.COMPLETED)),
    (snap) => {
      const byWorker = new Map();
      for (const o of snap.docs.map(mapDoc)) {
        if (!o.workerId) continue;
        if (!byWorker.has(o.workerId)) byWorker.set(o.workerId, []);
        byWorker.get(o.workerId).push(o);
      }
      const groups = [...byWorker.entries()].map(([workerId, orders]) => ({
        workerId,
        workerName: orders[0]?.workerName ?? '',
        ...summarizeDetailer(orders),
      }));
      onData(groups);
    },
    onError
  );

/** Marks the given orders as paid to the detailer (manual transfer done). */
export const settleOrders = async (orderIds) => {
  try {
    const batch = writeBatch(db);
    for (const id of orderIds) {
      batch.update(doc(db, 'bookings', id), { settledAt: serverTimestamp() });
    }
    await batch.commit();
  } catch (error) {
    throw toAppError(error);
  }
};
