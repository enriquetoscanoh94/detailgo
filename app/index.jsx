/**
 * Entry route. The root navigator (app/_layout) redirects to the right place
 * based on auth state, so this only shows a brief loader on cold start.
 */

import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { colors } from '@/constants/theme';

export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
