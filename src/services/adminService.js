/**
 * Admin-only operations that need elevated actions.
 *
 * createDetailer: the admin creates a worker's login (email + password) — the
 * only way a detailer account comes to exist (workers never self-register).
 *
 * Creating a Firebase Auth user with the client SDK signs you IN as that new
 * user, which would kick the admin out of their session. To avoid that we spin
 * up a SECONDARY Firebase app instance, create the account there, then sign it
 * out and dispose it — the admin's primary session is untouched. The Firestore
 * profile doc is written with the PRIMARY db (the admin's auth), so the
 * admin-only create rule applies.
 */

import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from '@firebase/auth';
import {
  doc, serverTimestamp, setDoc, runTransaction, collection, query, where, onSnapshot,
} from 'firebase/firestore';

import { db, firebaseConfig } from '@/config/firebase';
import { ROLES } from '@/constants/roles';
import { toAppError } from '@/utils/errors';

let counter = 0;

/**
 * Next human-friendly detailer code (DET-001, DET-002…), assigned atomically so
 * two admins creating detailers at once never collide.
 */
const nextDetailerCode = async () => {
  const ref = doc(db, 'counters', 'detailers');
  const seq = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const next = (snap.exists() ? Number(snap.data().seq) || 0 : 0) + 1;
    tx.set(ref, { seq: next }, { merge: true });
    return next;
  });
  return `DET-${String(seq).padStart(3, '0')}`;
};

/**
 * Creates a detailer (worker) account and its profile doc.
 * Returns the new user's uid. Does NOT change the admin's session.
 */
export const createDetailer = async ({ name, email, phone, password }) => {
  // Unique name so repeated calls never clash with a lingering instance.
  const secondary = initializeApp(firebaseConfig, `detailer-creator-${Date.now()}-${counter++}`);
  try {
    const secondaryAuth = getAuth(secondary);
    const detailerCode = await nextDetailerCode();
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);

    // Written by the admin (primary db) → satisfies the admin-only create rule.
    await setDoc(doc(db, 'users', cred.user.uid), {
      role: ROLES.WORKER,
      detailerCode,
      name: name.trim(),
      email: email.trim(),
      phone: (phone ?? '').trim(),
      active: true,
      available: false,
      createdAt: serverTimestamp(),
    });

    await signOut(secondaryAuth).catch(() => {});
    return cred.user.uid;
  } catch (error) {
    throw toAppError(error);
  } finally {
    await deleteApp(secondary).catch(() => {});
  }
};

/**
 * Promotes an EXISTING client to detailer (worker): assigns a detailer code and
 * flips their role. Same account and login — used when a registered client
 * applies to work and the admin approves. Written by the admin (isAdmin rule).
 */
export const promoteToDetailer = async (uid) => {
  try {
    const detailerCode = await nextDetailerCode();
    await setDoc(
      doc(db, 'users', uid),
      { role: ROLES.WORKER, detailerCode, available: false },
      { merge: true }
    );
    return detailerCode;
  } catch (error) {
    throw toAppError(error);
  }
};

/** Live list of all detailers (workers), for the admin. */
export const subscribeDetailers = (onData, onError) =>
  onSnapshot(
    query(collection(db, 'users'), where('role', '==', ROLES.WORKER)),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );

/** Live list of all clients, for the admin. */
export const subscribeClients = (onData, onError) =>
  onSnapshot(
    query(collection(db, 'users'), where('role', '==', ROLES.CLIENT)),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
