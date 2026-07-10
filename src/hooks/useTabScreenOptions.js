/**
 * Shared bottom-tab styling for every role (client, worker, admin).
 * Icons only (no text labels) with the device's bottom safe-area inset so the
 * bar clears the screen edge / gesture bar.
 */

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

export function useTabScreenOptions() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);

  return {
    headerShown: false,
    tabBarShowLabel: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      height: 52 + bottom,
      paddingBottom: bottom,
      paddingTop: 8,
    },
  };
}

export default useTabScreenOptions;
