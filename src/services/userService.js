/** Reads/writes to the `users/{uid}` profile documents. */

import { doc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';

import { db } from '../config/firebase';
import { toAppError } from '../utils/errors';

/** One-shot fetch of a user profile. Returns { id, ...data } or null. */
export const fetchProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/**
 * Live subscription to a user profile. `onData` receives { id, ...data } or
 * null (missing doc). Returns an unsubscribe function.
 */
export const subscribeProfile = (uid, onData, onError) =>
  onSnapshot(
    doc(db, 'users', uid),
    (snap) => onData(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    onError
  );

/** Toggles a worker's availability to receive new-order alerts. */
export const setAvailability = async (uid, available) => {
  try {
    await updateDoc(doc(db, 'users', uid), { available: Boolean(available) });
  } catch (error) {
    throw toAppError(error);
  }
};

/** Sets the user's profile photo URL. */
export const setProfilePhoto = async (uid, photoUrl) => {
  try {
    await updateDoc(doc(db, 'users', uid), { photoUrl: photoUrl ?? null });
  } catch (error) {
    throw toAppError(error);
  }
};

/** Saves the detailer's Expo push token so the server can ring them. */
export const setPushToken = async (uid, pushToken) => {
  try {
    await updateDoc(doc(db, 'users', uid), { pushToken: pushToken ?? null });
  } catch (error) {
    throw toAppError(error);
  }
};
