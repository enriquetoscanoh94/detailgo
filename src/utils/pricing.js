/**
 * Price quoting for a service + vehicle type + optional extras.
 *
 * Money model (owner-defined): every package sets BOTH the client price and the
 * amount the detailer earns, per vehicle type (SUV = truck). Each extra has a
 * price and pays the detailer a fixed amount. The business keeps the rest.
 *
 *   total          = service price (by type) + Σ extra prices
 *   workerPayout   = service detailer pay (by type) + Σ extra detailer pay
 *   businessFee    = total − workerPayout
 *
 * This is the single client-side calculator; the authoritative figures are
 * re-computed and frozen server-side (Cloud Function) when the order completes.
 */

import { VEHICLE_TYPE } from '@/services/vehicleService';

/** Extra charged on the client price for the given vehicle type (sedan = 0). */
export const surchargeForType = (service, type) => {
  if (!service) return 0;
  if (type === VEHICLE_TYPE.SUV) return Number(service.surcharges?.suv) || 0;
  if (type === VEHICLE_TYPE.TRUCK) return Number(service.surcharges?.truck) || 0;
  return 0;
};

/** What the detailer earns for this service + vehicle type. */
export const detailerPayForType = (service, type) => {
  const dp = service?.detailerPay;
  if (dp) {
    if (type === VEHICLE_TYPE.SUV) return Number(dp.suv) || 0;
    if (type === VEHICLE_TYPE.TRUCK) return Number(dp.truck) || 0;
    return Number(dp.sedan) || 0;
  }
  // Fallback for legacy docs without detailerPay: keep the old $10 fixed margin.
  const price = (Number(service?.basePrice) || 0) + surchargeForType(service, type);
  return Math.max(0, price - 10);
};

/** Full money breakdown for a service + vehicle type + selected extras. */
export const computeQuote = (service, vehicleType, extras = []) => {
  const basePrice = Number(service?.basePrice) || 0;
  const surcharge = surchargeForType(service, vehicleType);
  const list = extras ?? [];
  const extrasTotal = list.reduce((s, e) => s + (Number(e.price) || 0), 0);
  const extrasPay = list.reduce((s, e) => s + (Number(e.detailerPay) || 0), 0);

  const total = basePrice + surcharge + extrasTotal;
  const workerPayout = detailerPayForType(service, vehicleType) + extrasPay;
  const businessFee = Math.max(0, total - workerPayout);

  return { basePrice, surcharge, extrasTotal, total, businessFee, workerPayout };
};

/** Price + detailer pay for a single item (one car + its package). */
export const itemQuote = (service, vehicleType) => ({
  price: (Number(service?.basePrice) || 0) + surchargeForType(service, vehicleType),
  detailerPay: detailerPayForType(service, vehicleType),
});

/**
 * Whole-order money breakdown: up to 5 items (each a car + its own package),
 * plus order-level extras. Total and detailer payout are the sum across every
 * car; extras are added once.
 */
export const computeOrderQuote = (items, extras = []) => {
  const lines = (items ?? [])
    .filter((it) => it.service && it.vehicle)
    .map((it) => {
      const { price, detailerPay } = itemQuote(it.service, it.vehicle.type);
      return { service: it.service, vehicle: it.vehicle, price, detailerPay };
    });

  const list = extras ?? [];
  const extrasTotal = list.reduce((s, e) => s + (Number(e.price) || 0), 0);
  const extrasPay = list.reduce((s, e) => s + (Number(e.detailerPay) || 0), 0);

  const itemsTotal = lines.reduce((s, l) => s + l.price, 0);
  const itemsPay = lines.reduce((s, l) => s + l.detailerPay, 0);

  const total = itemsTotal + extrasTotal;
  const workerPayout = itemsPay + extrasPay;
  const businessFee = Math.max(0, total - workerPayout);

  return { lines, itemsTotal, extrasTotal, total, businessFee, workerPayout };
};
