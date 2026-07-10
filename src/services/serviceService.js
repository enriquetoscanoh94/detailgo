/**
 * Service packages (the wash/detail offerings the admin manages).
 * Collection: services/{id}
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { MIN_SERVICE_TOTAL } from '@/constants/payments';
import { AppError, toAppError } from '@/utils/errors';

const servicesRef = collection(db, 'services');

const mapSnap = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const sortByOrder = (items) => [...items].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

/** Active services only, ordered — what clients see in the booking wizard. */
export const subscribeActiveServices = (onData, onError) => {
  return onSnapshot(
    query(servicesRef, where('active', '==', true)),
    (snap) => onData(sortByOrder(mapSnap(snap))),
    onError
  );
};

/** All services (active + inactive) — the admin management list. */
export const subscribeAllServices = (onData, onError) => {
  return onSnapshot(
    query(servicesRef, orderBy('order', 'asc')),
    (snap) => onData(mapSnap(snap)),
    onError
  );
};

/** Guards the money rule: the base price must leave a payout for the worker. */
const assertValidPrice = (basePrice) => {
  if (!(Number(basePrice) >= MIN_SERVICE_TOTAL)) {
    throw new AppError('admin.priceTooLow');
  }
};

const normalize = (data) => ({
  name: data.name.trim(),
  description: (data.description ?? '').trim(),
  includes: (data.includes ?? []).map((s) => s.trim()).filter(Boolean),
  basePrice: Number(data.basePrice),
  durationMinutes: Number(data.durationMinutes) || 0,
  surcharges: {
    suv: Number(data.surcharges?.suv) || 0,
    truck: Number(data.surcharges?.truck) || 0,
  },
  active: data.active !== false,
  order: Number(data.order) || 0,
});

export const createService = async (data) => {
  try {
    assertValidPrice(data.basePrice);
    await addDoc(servicesRef, { ...normalize(data), createdAt: serverTimestamp() });
  } catch (error) {
    throw toAppError(error);
  }
};

export const updateService = async (id, data) => {
  try {
    assertValidPrice(data.basePrice);
    await updateDoc(doc(db, 'services', id), {
      ...normalize(data),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toAppError(error);
  }
};

export const setServiceActive = async (id, active) => {
  try {
    await updateDoc(doc(db, 'services', id), { active });
  } catch (error) {
    throw toAppError(error);
  }
};

export const deleteService = async (id) => {
  try {
    await deleteDoc(doc(db, 'services', id));
  } catch (error) {
    throw toAppError(error);
  }
};
