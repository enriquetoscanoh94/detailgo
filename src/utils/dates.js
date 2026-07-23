/**
 * Scheduling logic for the booking calendar.
 *
 * Rules (from BUSINESS.hours / BUSINESS.booking):
 *   - Orders can be scheduled for TODAY or TOMORROW only (maxLeadDays = 1).
 *   - Hourly slots live within [open, close): open 7 / close 20 → 7:00…19:00.
 *   - A slot must be at least `minLeadHours` ahead of "now". If today has no
 *     remaining valid slot, today becomes unavailable.
 *
 * We work with the device's local clock. For a single-region business this is
 * correct; the slot is persisted as a Firestore Timestamp (UTC internally) and
 * always rendered back in local time, so no drift is shown to the user.
 */

import { BUSINESS } from '../config/business';

const startOfDay = (d) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

const addDays = (d, n) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

/** A Date at a given whole hour on the given day. */
const atHour = (day, hour) => {
  const c = startOfDay(day);
  c.setHours(hour, 0, 0, 0);
  return c;
};

/** All candidate slot Dates for a day, before applying the lead-time filter. */
const allSlotsForDay = (day) => {
  const { open, close } = BUSINESS.hours;
  const slots = [];
  for (let h = open; h < close; h += 1) slots.push(atHour(day, h));
  return slots;
};

/** Earliest allowed booking time given "now" and the min lead hours. */
const earliestBookableTime = (now = new Date()) =>
  new Date(now.getTime() + BUSINESS.booking.minLeadHours * 60 * 60 * 1000);

/**
 * Slots for a specific day. Each entry: { date, hour, disabled }.
 * A slot is disabled when it falls before the earliest bookable time.
 */
export const getSlotsForDay = (day, now = new Date()) => {
  const floor = earliestBookableTime(now);
  return allSlotsForDay(day).map((date) => ({
    date,
    hour: date.getHours(),
    disabled: date.getTime() < floor.getTime(),
  }));
};

/** Whether a day has at least one selectable slot. */
export const dayHasOpenSlot = (day, now = new Date()) =>
  getSlotsForDay(day, now).some((s) => !s.disabled);

/**
 * The bookable days (today, tomorrow) with availability flags.
 * Returns [{ type: 'today'|'tomorrow', date, available }].
 */
export const getBookableDays = (now = new Date()) => {
  const today = startOfDay(now);
  const days = [{ type: 'today', date: today }];
  for (let i = 1; i <= BUSINESS.booking.maxLeadDays; i += 1) {
    days.push({ type: i === 1 ? 'tomorrow' : 'later', date: addDays(today, i) });
  }
  return days.map((d) => ({ ...d, available: dayHasOpenSlot(d.date, now) }));
};

// --- Formatting (locale-aware) ---------------------------------------------

const localeTag = (lang) => (lang === 'en' ? 'en-US' : 'es-MX');

/** "3:00 PM" */
export const formatHour = (date, lang = 'es') =>
  new Intl.DateTimeFormat(localeTag(lang), {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

/** "martes 8 de julio" */
export const formatLongDate = (date, lang = 'es') =>
  new Intl.DateTimeFormat(localeTag(lang), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);

/** "8 jul, 3:00 PM" — compact summary of a scheduled slot. */
export const formatSlotSummary = (date, lang = 'es') =>
  new Intl.DateTimeFormat(localeTag(lang), {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

/** Converts a Firestore Timestamp or Date into a JS Date safely. */
export const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
};
