/**
 * Authentication service.
 *
 * Wraps Firebase Auth so screens never touch Firebase directly. Auth functions
 * are imported from `@firebase/auth` (see config/firebase.js for the rationale).
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updatePassword,
} from '@firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '../config/firebase';
import { ROLES } from '../constants/roles';
import { toAppError } from '../utils/errors';

/** Subscribe to auth state. Returns an unsubscribe function. */
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

export const getCurrentUser = () => auth.currentUser;

export const login = async (email, password) => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  } catch (error) {
    throw toAppError(error);
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw toAppError(error);
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    throw toAppError(error);
  }
};

/**
 * Registers a client: creates the auth user, then writes their profile doc
 * with role "client". The Firestore rules only allow a user to create their
 * own doc with role "client", so this cannot be used to self-promote.
 */
export const registerClient = async ({ name, email, phone, password }) => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      role: ROLES.CLIENT,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      active: true,
      createdAt: serverTimestamp(),
    });
    return cred.user;
  } catch (error) {
    throw toAppError(error);
  }
};

/** Change the current user's password (used by workers on first login). */
export const changePassword = async (newPassword) => {
  try {
    if (!auth.currentUser) throw new Error('no-user');
    await updatePassword(auth.currentUser, newPassword);
  } catch (error) {
    throw toAppError(error);
  }
};
