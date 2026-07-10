/**
 * Button with variants, sizes, loading and disabled states.
 *
 * While `loading` is true the button is disabled — this is our idempotency
 * guard against double-taps that would create duplicate orders / writes.
 */

import { Pressable, ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, radius, spacing, fontSize, fontWeight } from '../../constants/theme';
import { AppText } from './Typography';

const VARIANTS = {
  primary: { bg: colors.primary, fg: colors.textOnPrimary, border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.primary, border: colors.primary },
  danger: { bg: colors.danger, fg: colors.textOnPrimary, border: colors.danger },
  success: { bg: colors.success, fg: colors.textOnPrimary, border: colors.success },
  ghost: { bg: colors.transparent, fg: colors.primary, border: colors.transparent },
};

const SIZES = {
  lg: { height: 54, fontSize: fontSize.md, paddingH: spacing.xl },
  md: { height: 46, fontSize: fontSize.sm, paddingH: spacing.lg },
  sm: { height: 38, fontSize: fontSize.sm, paddingH: spacing.md },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
  style,
}) {
  const v = VARIANTS[variant] ?? VARIANTS.primary;
  const s = SIZES[size] ?? SIZES.lg;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingH,
          backgroundColor: v.bg,
          borderColor: v.border,
        },
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          <AppText
            style={{ color: v.fg, fontSize: s.fontSize, fontWeight: fontWeight.semibold }}
          >
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { marginRight: spacing.xs },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});

export default Button;
