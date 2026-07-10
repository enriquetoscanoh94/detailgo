/**
 * Firebase initialization.
 *
 * IMPORTANT — auth imports come from `@firebase/auth`, NOT `firebase/auth`.
 * In Firebase JS SDK v12 the public `firebase/auth` entry point dropped its
 * React Native build, so `getReactNativePersistence` is no longer exported
 * there. The internal `@firebase/auth` package still ships the RN bundle
 * (resolved by Metro's "react-native" condition), which is the only place the
 * persistence helper lives. To avoid loading two different copies of the auth
 * module, EVERY auth import in this app must come from `@firebase/auth`.
 *
 * Firestore and Storage have no such caveat and use the normal entry points.
 *
 * ⚠️  Pega aquí la config de tu proyecto de Firebase (Console → Project
 *     settings → Your apps → SDK setup and configuration).
 */

import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from '@firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDu8F3IySoh08XX82TbsPl3Z8p-9axyIZk',
  authDomain: 'detailgo-3991f.firebaseapp.com',
  projectId: 'detailgo-3991f',
  storageBucket: 'detailgo-3991f.firebasestorage.app',
  messagingSenderId: '1019714598702',
  appId: '1:1019714598702:web:ea09243fb46404a0876cbf',
};

// Guard against re-initialization during Fast Refresh / hot reload.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * Auth persistence:
 *   - Native (iOS/Android): AsyncStorage so the session survives app restarts.
 *   - Web (dev preview only): default browser persistence — `getReactNativePersistence`
 *     does not exist in the web build, so we must not call it there.
 *
 * `initializeAuth` throws if auth was already initialized for this app (Fast
 * Refresh), so we fall back to `getAuth`.
 */
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage, firebaseConfig };
