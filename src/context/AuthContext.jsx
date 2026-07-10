/**
 * Auth session state for the whole app.
 *
 * Combines two live sources:
 *   1. Firebase Auth state (is someone logged in?).
 *   2. That user's Firestore profile (role, active, name…).
 *
 * A disabled account (active === false) is signed out immediately so a worker
 * or client the admin deactivated cannot keep using the app.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { onAuthChange, logout as authLogout } from '../services/authService';
import { subscribeProfile } from '../services/userService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [initializing, setInitializing] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [disabledNotice, setDisabledNotice] = useState(false);
  const profileUnsub = useRef(null);

  useEffect(() => {
    const stopProfile = () => {
      if (profileUnsub.current) {
        profileUnsub.current();
        profileUnsub.current = null;
      }
    };

    const unsubAuth = onAuthChange((user) => {
      stopProfile();
      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setInitializing(false);
        return;
      }

      profileUnsub.current = subscribeProfile(
        user.uid,
        (data) => {
          if (data && data.active === false) {
            // Account was disabled: kick them out with a notice.
            setDisabledNotice(true);
            authLogout().catch(() => {});
            return;
          }
          setProfile(data);
          setInitializing(false);
        },
        () => setInitializing(false)
      );
    });

    return () => {
      stopProfile();
      unsubAuth();
    };
  }, []);

  const signOut = useMemo(
    () => async () => {
      await authLogout();
    },
    []
  );

  const value = useMemo(() => {
    return {
      initializing,
      user: firebaseUser,
      profile,
      role: profile?.role ?? null,
      isAuthenticated: Boolean(firebaseUser && profile),
      disabledNotice,
      clearDisabledNotice: () => setDisabledNotice(false),
      signOut,
    };
  }, [initializing, firebaseUser, profile, disabledNotice, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
