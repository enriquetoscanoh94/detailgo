import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen, Header, AppText, Card, StatusBadge, LoadingState, EmptyState, ErrorState } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { subscribeClientBookings } from '@/services/bookingService';
import { formatMoney } from '@/utils/money';
import { formatSlotSummary, toDate } from '@/utils/dates';
import { colors, spacing } from '@/constants/theme';

export default function ClientOrders() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading, error } = useSubscription(
    (onData, onError) => subscribeClientBookings(user.uid, onData, onError),
    [user.uid]
  );
  const list = data ?? [];

  return (
    <Screen scroll padded={false}>
      <View style={styles.headerWrap}>
        <Header title={t('client.history')} />
      </View>
      <View style={styles.list}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : list.length === 0 ? (
          <EmptyState icon="🧾" title={t('common.emptyList')} />
        ) : (
          list.map((b) => (
            <Card key={b.id} style={styles.card} onPress={() => router.push(`/(client)/order/${b.id}`)}>
              <View style={styles.cardTop}>
                <AppText variant="subtitle" style={styles.flex}>
                  {b.serviceSnapshot?.name}
                </AppText>
                <StatusBadge status={b.status} />
              </View>
              <View style={styles.cardMeta}>
                <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
                <AppText variant="caption">{formatSlotSummary(toDate(b.scheduledAt), lang)}</AppText>
                <AppText variant="caption" style={styles.dot}>·</AppText>
                <AppText variant="caption">{formatMoney(b.total)}</AppText>
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  flex: { flex: 1 },
  card: { gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { marginHorizontal: 2 },
});
