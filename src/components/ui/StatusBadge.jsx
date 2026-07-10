/** Colored pill that renders a booking status using STATUS_META + i18n. */

import { View, StyleSheet } from 'react-native';

import { colors, radius, spacing, fontSize, fontWeight } from '../../constants/theme';
import { STATUS_META } from '../../constants/bookingStatus';
import { useI18n } from '../../context/I18nContext';
import { AppText } from './Typography';

const TONES = {
  success: { bg: colors.successLight, fg: colors.success },
  warning: { bg: colors.warningLight, fg: colors.warning },
  danger: { bg: colors.dangerLight, fg: colors.danger },
  info: { bg: colors.primaryLight, fg: colors.primary },
  muted: { bg: colors.surfaceMuted, fg: colors.textMuted },
};

export function StatusBadge({ status }) {
  const { t } = useI18n();
  const meta = STATUS_META[status] ?? { labelKey: `status.${status}`, tone: 'muted' };
  const tone = TONES[meta.tone] ?? TONES.muted;

  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <View style={[styles.dot, { backgroundColor: tone.fg }]} />
      <AppText style={{ color: tone.fg, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
        {t(meta.labelKey)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

export default StatusBadge;
