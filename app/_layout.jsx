/**
 * Root layout: mounts the app-wide providers and the auth-aware navigator.
 *
 * Redirect rules (single source of truth for gating):
 *   - Not authenticated → only the (auth) group is reachable.
 *   - Authenticated → sent to their role's home; the (auth) group and any
 *     other role's group are off-limits (a client cannot open admin URLs).
 */

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';

import { I18nProvider } from '@/context/I18nContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { BrandLoader } from '@/components/BrandLoader';
import { ROLES } from '@/constants/roles';
import { colors } from '@/constants/theme';

const ROLE_GROUP = {
  [ROLES.ADMIN]: '(admin)',
  [ROLES.CLIENT]: '(client)',
  [ROLES.WORKER]: '(worker)',
};

const ROLE_HOME = {
  [ROLES.ADMIN]: '/(admin)/dashboard',
  [ROLES.CLIENT]: '/(client)/home',
  [ROLES.WORKER]: '/(worker)/available',
};

// Minimum time the animated brand loader stays on screen so the animation is
// always seen on open, not just flashed for a few frames.
const MIN_SPLASH_MS = 1600;

function RootNavigator() {
  const { initializing, isAuthenticated, role } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [minSplashDone, setMinSplashDone] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMinSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(id);
  }, []);
  const showLoader = initializing || !minSplashDone;

  useEffect(() => {
    if (initializing) return;

    const group = segments[0];
    const inAuthGroup = group === '(auth)';

    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    // Authenticated: keep users inside their own role group. Exception: a
    // logged-in client may open the "apply to work" screen (to become a
    // detailer), which lives in the (auth) group.
    if (segments[1] === 'apply') return;
    const targetGroup = ROLE_GROUP[role];
    if (inAuthGroup || (targetGroup && group !== targetGroup)) {
      router.replace(ROLE_HOME[role] ?? '/(auth)/login');
    }
  }, [initializing, isAuthenticated, role, segments, router]);

  // The Stack stays mounted even while initializing so route segments remain
  // valid for the redirect effect above; the splash is an overlay on top.
  return (
    <View style={styles.flex}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(client)" />
        <Stack.Screen name="(worker)" />
        <Stack.Screen name="(admin)" />
      </Stack>
      {showLoader ? (
        <View style={StyleSheet.absoluteFill}>
          <BrandLoader />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
