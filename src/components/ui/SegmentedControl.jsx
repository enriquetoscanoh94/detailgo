/** Horizontal single-select control (payment method, vehicle type, yes/no…). */

import { View, Pressable, StyleSheet } from 'react-native';

import { colors, radius, spacing, fontSize, fontWeight } from '../../constants/theme';
import { AppText } from './Typography';

/** options: [{ value, label }]. */
export function SegmentedControl({ options, value, onChange, style }) {
  return (
    <View style={[styles.wrap, style]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <AppText
              style={{
                color: active ? colors.textOnPrimary : colors.text,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
              }}
            >
              {opt.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 42,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: colors.primary },
});

export default SegmentedControl;
