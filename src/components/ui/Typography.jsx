/** Text primitives with consistent sizing/weight/color from the theme. */

import { Text, StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight } from '../../constants/theme';

const styles = StyleSheet.create({
  base: { color: colors.text },
  display: { fontSize: fontSize.display, fontWeight: fontWeight.bold, letterSpacing: -0.5 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
  heading: { fontSize: fontSize.xl, fontWeight: fontWeight.semibold },
  subtitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  body: { fontSize: fontSize.md, fontWeight: fontWeight.regular, lineHeight: 22 },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  caption: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.textMuted },
  muted: { color: colors.textMuted },
});

/**
 * <AppText variant="title" muted>…</AppText>
 * variant: display | title | heading | subtitle | body | label | caption
 */
export function AppText({ variant = 'body', muted, color, center, style, children, ...rest }) {
  return (
    <Text
      style={[
        styles.base,
        styles[variant],
        muted && styles.muted,
        color && { color },
        center && { textAlign: 'center' },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export default AppText;
