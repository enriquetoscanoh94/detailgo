/**
 * Booking lifecycle: the single source of truth for every order status, its
 * human label/color, and the ALLOWED transitions between statuses.
 *
 * The state machine is enforced in three places that must agree:
 *   1. This file (UI labels + client-side guard rails).
 *   2. Firestore security rules (so a malicious client cannot skip steps).
 *   3. Cloud Functions (dispatch + money are computed server-side).
 *
 * Never compare against raw status strings elsewhere — import BOOKING_STATUS.
 */

export const BOOKING_STATUS = {
  PENDING_PAYMENT: 'pending_payment', // Zelle receipt uploaded, awaiting admin review
  PAYMENT_REJECTED: 'payment_rejected', // admin rejected the receipt, client can re-upload
  PAYMENT_ISSUE: 'payment_issue', // cash order: worker reported client did not pay
  SEARCHING_WORKER: 'searching_worker', // broadcast to all available workers ("first to accept wins")
  ASSIGNED: 'assigned', // a worker claimed the order
  ON_THE_WAY: 'on_the_way',
  ARRIVED: 'arrived',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/**
 * Allowed forward transitions. A transition not listed here is illegal and must
 * be rejected by the service layer and the security rules.
 *
 * Cancellation is handled separately (see canClientCancel / admin can always cancel).
 */
export const STATUS_TRANSITIONS = {
  [BOOKING_STATUS.PENDING_PAYMENT]: [
    BOOKING_STATUS.SEARCHING_WORKER, // admin approves Zelle receipt
    BOOKING_STATUS.PAYMENT_REJECTED, // admin rejects
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.PAYMENT_REJECTED]: [
    BOOKING_STATUS.PENDING_PAYMENT, // client re-uploads receipt
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.SEARCHING_WORKER]: [
    BOOKING_STATUS.ASSIGNED, // a worker accepts (atomic transaction)
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.ASSIGNED]: [
    BOOKING_STATUS.ON_THE_WAY,
    BOOKING_STATUS.SEARCHING_WORKER, // admin re-dispatches (worker abandoned)
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.ON_THE_WAY]: [BOOKING_STATUS.ARRIVED, BOOKING_STATUS.CANCELLED],
  [BOOKING_STATUS.ARRIVED]: [BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.CANCELLED],
  [BOOKING_STATUS.IN_PROGRESS]: [
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.PAYMENT_ISSUE, // cash order: client did not pay
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.PAYMENT_ISSUE]: [
    BOOKING_STATUS.COMPLETED, // admin resolves as paid
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.COMPLETED]: [],
  [BOOKING_STATUS.CANCELLED]: [],
};

export const canTransition = (from, to) =>
  Boolean(STATUS_TRANSITIONS[from]?.includes(to));

/** The ordered steps a worker taps through once they own an order. */
export const WORKER_PROGRESS_FLOW = [
  BOOKING_STATUS.ON_THE_WAY,
  BOOKING_STATUS.ARRIVED,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.COMPLETED,
];

/** Statuses that count as an "active" order (client may only have one). */
export const ACTIVE_STATUSES = [
  BOOKING_STATUS.PENDING_PAYMENT,
  BOOKING_STATUS.PAYMENT_REJECTED,
  BOOKING_STATUS.PAYMENT_ISSUE,
  BOOKING_STATUS.SEARCHING_WORKER,
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.ON_THE_WAY,
  BOOKING_STATUS.ARRIVED,
  BOOKING_STATUS.IN_PROGRESS,
];

/** Client may cancel from the app only up to (and including) ASSIGNED. */
export const canClientCancel = (status) =>
  [
    BOOKING_STATUS.PENDING_PAYMENT,
    BOOKING_STATUS.PAYMENT_REJECTED,
    BOOKING_STATUS.SEARCHING_WORKER,
    BOOKING_STATUS.ASSIGNED,
  ].includes(status);

/**
 * Presentation metadata per status. `labelKey` resolves against the i18n
 * dictionary so the same status renders in the user's language.
 */
export const STATUS_META = {
  [BOOKING_STATUS.PENDING_PAYMENT]: { labelKey: 'status.pending_payment', tone: 'warning' },
  [BOOKING_STATUS.PAYMENT_REJECTED]: { labelKey: 'status.payment_rejected', tone: 'danger' },
  [BOOKING_STATUS.PAYMENT_ISSUE]: { labelKey: 'status.payment_issue', tone: 'danger' },
  [BOOKING_STATUS.SEARCHING_WORKER]: { labelKey: 'status.searching_worker', tone: 'info' },
  [BOOKING_STATUS.ASSIGNED]: { labelKey: 'status.assigned', tone: 'info' },
  [BOOKING_STATUS.ON_THE_WAY]: { labelKey: 'status.on_the_way', tone: 'info' },
  [BOOKING_STATUS.ARRIVED]: { labelKey: 'status.arrived', tone: 'info' },
  [BOOKING_STATUS.IN_PROGRESS]: { labelKey: 'status.in_progress', tone: 'info' },
  [BOOKING_STATUS.COMPLETED]: { labelKey: 'status.completed', tone: 'success' },
  [BOOKING_STATUS.CANCELLED]: { labelKey: 'status.cancelled', tone: 'muted' },
};

export default BOOKING_STATUS;
