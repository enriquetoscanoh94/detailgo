/** Client vehicles. Subcollection: users/{uid}/vehicles/{id} */

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

export const VEHICLE_TYPE = { SEDAN: 'sedan', SUV: 'suv', TRUCK: 'truck' };

const ref = (uid) => collection(db, 'users', uid, 'vehicles');

export const subscribeVehicles = (uid, onData, onError) => {
  return onSnapshot(
    query(ref(uid), orderBy('createdAt', 'desc')),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
};

const normalize = (data) => ({
  make: data.make.trim(),
  model: data.model.trim(),
  year: (data.year ?? '').toString().trim(),
  color: (data.color ?? '').trim(),
  type: data.type,
  plate: (data.plate ?? '').trim(),
  photoUrl: data.photoUrl ?? null,
});

export const addVehicle = async (uid, data) => {
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

export const updateVehicle = async (uid, id, data) => {
  try {
    await updateDoc(doc(db, 'users', uid, 'vehicles', id), normalize(data));
  } catch (error) {
    throw toAppError(error);
  }
};

export const deleteVehicle = async (uid, id) => {
  try {
    await deleteDoc(doc(db, 'users', uid, 'vehicles', id));
  } catch (error) {
    throw toAppError(error);
  }
};
