/**
 * Cloud Function de despacho: cuando se crea una orden en estado
 * `searching_worker`, le "suena" (push tipo ring) a todos los detailers
 * activados (available === true) con token, diciendo a dónde va, qué servicio
 * es y cuánto gana. Cada uno puede Aceptar / Rechazar desde la notificación.
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const money = (n) => `$${Number(n || 0).toFixed(0)}`;

exports.onBookingCreated = onDocumentCreated('bookings/{id}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const b = snap.data();
  if (!b || b.status !== 'searching_worker') return;

  // Qué mostrar: cuánto gana, qué servicio y a dónde va.
  const pay = b.workerPayout ?? 0;
  const service =
    b.serviceSnapshot?.name ||
    (Array.isArray(b.items) && b.items[0]?.service?.name) ||
    'Servicio';
  const cars = b.carCount ?? (Array.isArray(b.items) ? b.items.length : 1);
  const area = b.address?.city || b.address?.zip || '';

  // Día de la semana (0=Dom) y hora de la orden, en horario de Los Ángeles.
  // Sirve para avisar solo a los detailers cuyo horario cubre esa hora.
  let slotDay = null;
  let slotHour = null;
  if (b.scheduledAt && typeof b.scheduledAt.toDate === 'function') {
    const when = b.scheduledAt.toDate();
    const DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short' }).format(when);
    slotDay = DOW[wd];
    slotHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false }).format(when)) % 24;
  }

  // ¿El horario del detailer cubre la hora de la orden? Si no tiene horario
  // configurado (o la orden no trae hora), no se filtra por horario.
  const scheduleCovers = (sched) => {
    if (slotDay === null || !sched || !Array.isArray(sched.days)) return true;
    return sched.days.includes(slotDay) && slotHour >= sched.startHour && slotHour < sched.endHour;
  };

  // Detailers activados, con push token válido y cuyo horario cubre la orden.
  const workersSnap = await db
    .collection('users')
    .where('role', '==', 'worker')
    .where('available', '==', true)
    .get();

  const tokens = [];
  workersSnap.forEach((d) => {
    const data = d.data();
    const tk = data.pushToken;
    if (typeof tk === 'string' && tk.startsWith('ExponentPushToken') && scheduleCovers(data.schedule)) {
      tokens.push(tk);
    }
  });
  if (tokens.length === 0) return;

  const title = `Nueva orden · ganas ${money(pay)}`;
  const body = cars > 1 ? `${cars} autos · ${service} · ${area}` : `${service} · ${area}`;

  const messages = tokens.map((to) => ({
    to,
    sound: 'ring.wav',
    title,
    body,
    priority: 'high',
    channelId: 'orders',
    categoryId: 'new_order',
    data: { bookingId: event.params.id, pay, service, area },
  }));

  // Expo Push API (hasta 100 mensajes por request; aquí suelen ser pocos).
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const json = await res.json();
    console.log('push enviado', { count: tokens.length, result: json });
  } catch (err) {
    console.error('error enviando push', err);
  }
});
