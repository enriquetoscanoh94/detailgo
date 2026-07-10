/** Client addresses. Subcollection: users/{uid}/addresses/{id} */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { toAppError } from '@/utils/errors';

const ref = (uid) => collection(db, 'users', uid, 'addresses');

export const subscribeAddresses = (uid, onData, onError) => {
  return onSnapshot(
    query(ref(uid), orderBy('createdAt', 'desc')),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
};

const normalize = (data) => ({
  alias: data.alias.trim(),
  fullAddress: data.fullAddress.trim(),
  city: data.city.trim(),
  notes: (data.notes ?? '').trim(),
});

export const addAddress = async (uid, data) => {
  try {
    const docRef = await addDoc(ref(uid), {
      ...normalize(data),
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    throw toAppError(error);
  }
};

export const updateAddress = async (uid, id, data) => {
  try {
    await updateDoc(doc(db, 'users', uid, 'addresses', id), normalize(data));
  } catch (error) {
    throw toAppError(error);
  }
};

export const deleteAddress = async (uid, id) => {
  try {
    await deleteDoc(doc(db, 'users', uid, 'addresses', id));
  } catch (error) {
    throw toAppError(error);
  }
};
