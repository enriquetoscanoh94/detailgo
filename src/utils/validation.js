/** Lightweight, dependency-free validators. Return true when the value is valid. */

export const isNonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;

export const isEmail = (v) =>
  typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Accepts US-style phone numbers with optional +, spaces, dashes, parens. */
export const isPhone = (v) => {
  if (typeof v !== 'string') return false;
  const digits = v.replace(/[^\d]/g, '');
  return digits.length >= 10 && digits.length <= 15;
};

export const isStrongEnoughPassword = (v) =>
  typeof v === 'string' && v.length >= 6;

export const isPositiveNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
};

/** Normalizes a city string for comparison against the service-zone list. */
export const normalizeCity = (v) =>
  typeof v === 'string' ? v.trim().toLowerCase() : '';
