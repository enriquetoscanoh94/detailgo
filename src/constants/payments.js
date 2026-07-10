/**
 * Payment methods and the money model.
 *
 * Money rule (the heart of the business):
 *   - The business earns a FIXED fee of $10 on every completed service.
 *   - The worker earns: total - 10.
 *   - Cash orders: the worker collects the full total in hand and therefore
 *     OWES the business its $10 fee (ledger entry of -10).
 *   - Zelle orders: the business receives the money and OWES the worker their
 *     payout (ledger entry of +(total - 10)).
 *
 * All money is finally computed and frozen server-side in a Cloud Function on
 * completion; the values here drive the UI and client-side validation only.
 */

export const PAYMENT_METHOD = {
  ZELLE: 'zelle',
  VENMO: 'venmo',
  CASH: 'cash',
};

/**
 * Transfer methods (Zelle / Venmo): the client sends the money to the business
 * up front, uploads a receipt, and the admin verifies it before the order goes
 * out to workers. Cash is collected in hand by the worker instead.
 */
export const isTransferMethod = (method) =>
  method === PAYMENT_METHOD.ZELLE || method === PAYMENT_METHOD.VENMO;

export const BUSINESS_FEE = 10; // USD earned by the business per completed service

/** A service total must leave a positive payout for the worker. */
export const MIN_SERVICE_TOTAL = BUSINESS_FEE + 1; // > $10

export const workerPayout = (total) => Math.max(0, total - BUSINESS_FEE);

/** Ledger entry types (mirrors users/{uid}/ledger). */
export const LEDGER_TYPE = {
  ZELLE_PAYOUT: 'zelle_payout', // +(total - fee): business owes worker
  CASH_FEE: 'cash_fee', // -fee: worker owes business
};

export default PAYMENT_METHOD;
