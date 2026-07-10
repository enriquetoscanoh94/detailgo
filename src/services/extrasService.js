/**
 * Extra services ("Servicios Extras").
 * Collection: extras/{id}
 *
 * Unlike main service packages, extras have NO fixed price: they are quoted per
 * vehicle ("precio variable / cotizar según auto"). So an extra has no price,
 * duration or surcharges — just a name/description and active flag. When a
 * client picks extras on an order they are saved as requests to be quoted; they
 * never change the order total.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { toAppError } from '@/utils/errors';

const extrasRef = collection(db, 'extras');
const mapSnap = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const sortByOrder = (items) => [...items].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

/** Active extras, ordered — shown to clients in the catalog and booking. */
export const subscribeActiveExtras = (onData, onError) => {
  return onSnapshot(
    query(extrasRef, where('active', '==', true)),
    (snap) => onData(sortByOrder(mapSnap(snap))),
    onError
  );
};

/** All extras (active + inactive) — the admin management list. */
export const subscribeAllExtras = (onData, onError) => {
  return onSnapshot(
    query(extrasRef, orderBy('order', 'asc')),
    (snap) => onData(mapSnap(snap)),
    onError
  );
};

const normalize = (data) => ({
  name: data.name.trim(),
  description: (data.description ?? '').trim(),
  active: data.active !== false,
  order: Number(data.order) || 0,
});

export const createExtra = async (data) => {
  try {
    await addDoc(extrasRef, { ...normalize(data), createdAt: serverTimestamp() });
  } catch (error) {
    throw toAppError(error);
  }
};

export const updateExtra = async (id, data) => {
  try {
    await updateDoc(doc(db, 'extras', id), { ...normalize(data), updatedAt: serverTimestamp() });
  } catch (error) {
    throw toAppError(error);
  }
};

export const setExtraActive = async (id, active) => {
  try {
    await updateDoc(doc(db, 'extras', id), { active });
  } catch (error) {
    throw toAppError(error);
  }
};

export const deleteExtra = async (id) => {
  try {
    await deleteDoc(doc(db, 'extras', id));
  } catch (error) {
    throw toAppError(error);
  }
};
