/**
 * Screen wrapper: safe-area insets, background, optional scroll, and keyboard
 * avoidance. Every screen renders inside one of these so padding and safe-area
 * behavior stay consistent.
 */

import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../../constants/theme';

export function Screen({
  children,
  scroll = false,
  padded = true,
  keyboardAvoiding = false,
  backgroundColor = colors.background,
  contentContainerStyle,
  edges = ['top', 'bottom'],
}) {
  const insets = useSafeAreaInsets();
  const safePadding = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
  };
  const inner = padded ? styles.padded : null;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, inner, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, inner, contentContainerStyle]}>{children}</View>
  );

  const content = <View style={[styles.flex, safePadding, { backgroundColor }]}>{body}</View>;

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg },
  scrollContent: { paddingVertical: spacing.lg, flexGrow: 1 },
});

export default Screen;
