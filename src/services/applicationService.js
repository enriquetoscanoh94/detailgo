/**
 * Public job applications ("I want to work here").
 * Collection: applications/{id}
 *
 * Anyone (unauthenticated) can CREATE an application; only the admin can read
 * them (enforced by security rules). Duplicate/anti-spam guarding and account
 * creation on approval are handled by a Cloud Function in a later phase.
 */

import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { toAppError } from '@/utils/errors';

const applicationsRef = collection(db, 'applications');

export const APPLICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const submitApplication = async (data) => {
  try {
    await addDoc(applicationsRef, {
      name: data.name.trim(),
      email: (data.email ?? '').trim(),
      phone: data.phone.trim(),
      address: (data.address ?? '').trim(),
      zone: data.zone.trim(),
      experienceYears: Number(data.experienceYears) || 0,
      hasTransport: Boolean(data.hasTransport),
      hasEquipment: Boolean(data.hasEquipment),
      comment: (data.comment ?? '').trim(),
      status: APPLICATION_STATUS.PENDING,
      // Si un cliente ya registrado pide trabajar, su solicitud queda ligada a
      // su cuenta (clientUid). El admin la aprueba cambiándole el rol a detailer
      // en vez de crear una cuenta nueva.
      source: data.source ?? 'app',
      ...(data.clientUid ? { clientUid: data.clientUid } : {}),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    throw toAppError(error);
  }
};

export const subscribeApplications = (onData, onError) => {
  const q = query(applicationsRef, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
    (error) => onError(toAppError(error))
  );
};

export const updateApplicationStatus = async (applicationId, status) => {
  try {
    await updateDoc(doc(db, 'applications', applicationId), {
      status,
      reviewedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toAppError(error);
  }
};
