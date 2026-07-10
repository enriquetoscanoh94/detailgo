/**
 * Standard loading / empty / error views so no screen ever shows a blank page
 * or a stuck spinner. Used by every list and data-backed screen.
 */

import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { colors, spacing } from '../../constants/theme';
import { useI18n } from '../../context/I18nContext';
import { AppText } from './Typography';
import { Button } from './Button';

export function LoadingState({ label }) {
  const { t } = useI18n();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText variant="caption" style={styles.gap}>
        {label ?? t('common.loading')}
      </AppText>
    </View>
  );
}

export function EmptyState({ title, message, icon, action }) {
  const { t } = useI18n();
  return (
    <View style={styles.center}>
      {icon ? <AppText style={styles.emoji}>{icon}</AppText> : null}
      <AppText variant="subtitle" center>
        {title ?? t('common.emptyList')}
      </AppText>
      {message ? (
        <AppText variant="body" muted center style={styles.gap}>
          {message}
        </AppText>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }) {
  const { t } = useI18n();
  return (
    <View style={styles.center}>
      <AppText style={styles.emoji}>⚠️</AppText>
      <AppText variant="body" center muted>
        {message ?? t('error.generic')}
      </AppText>
      {onRetry ? (
        <View style={styles.action}>
          <Button title={t('common.retry')} onPress={onRetry} variant="secondary" fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 220,
  },
  gap: { marginTop: spacing.sm },
  emoji: { fontSize: 40, marginBottom: spacing.md },
  action: { marginTop: spacing.lg },
});

export default { LoadingState, EmptyState, ErrorState };
