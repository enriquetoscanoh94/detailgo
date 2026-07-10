import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen, Header, AppText, Card, Button, StatusBadge, LoadingState } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { subscribeClientActiveBooking } from '@/services/bookingService';
import { formatMoney } from '@/utils/money';
import { formatSlotSummary, toDate } from '@/utils/dates';
import { colors, spacing, radius } from '@/constants/theme';

function QuickLink({ icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.quick}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <AppText variant="label">{label}</AppText>
    </Pressable>
  );
}

export default function ClientHome() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { user, profile } = useAuth();

  const { data: active, loading } = useSubscription(
    (onData, onError) => subscribeClientActiveBooking(user.uid, onData, onError),
    [user.uid]
  );

  return (
    <Screen scroll padded={false}>
      <View style={styles.headerWrap}>
        <Header title={t('common.appName')} />
      </View>

      <View style={styles.body}>
        <AppText variant="title">{t('client.greeting', { name: profile?.name ?? '' })}</AppText>

        {loading ? (
          <LoadingState />
        ) : active ? (
          <Card style={styles.activeCard} onPress={() => router.push(`/(client)/order/${active.id}`)}>
            <View style={styles.activeTop}>
              <AppText variant="caption">{t('client.activeOrder')}</AppText>
              <StatusBadge status={active.status} />
            </View>
            <AppText variant="subtitle" style={styles.activeService}>
              {active.serviceSnapshot?.name}
            </AppText>
            <View style={styles.activeMeta}>
              <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
              <AppText variant="caption">
                {formatSlotSummary(toDate(active.scheduledAt), lang)}
              </AppText>
              <AppText variant="caption" style={styles.dot}>
                ·
              </AppText>
              <AppText variant="caption">{formatMoney(active.total)}</AppText>
            </View>
            <View style={styles.detailLink}>
              <AppText variant="label" color={colors.primary}>
                Ver detalle
              </AppText>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </View>
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <AppText style={styles.bigEmoji}>🚗💦</AppText>
            <AppText variant="subtitle" center>
              {t('client.noActiveOrder')}
            </AppText>
            <Button
              title={t('client.bookNow')}
              onPress={() => router.push('/(client)/book')}
              style={styles.bookBtn}
            />
          </Card>
        )}

        <View style={styles.quickRow}>
          <QuickLink icon="car-outline" label={t('client.myVehicles')} onPress={() => router.push('/(client)/vehicles')} />
          <QuickLink icon="location-outline" label={t('client.myAddresses')} onPress={() => router.push('/(client)/addresses')} />
          <QuickLink icon="time-outline" label={t('client.history')} onPress={() => router.push('/(client)/orders')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg },
  activeCard: { gap: spacing.sm },
  activeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeService: { marginTop: spacing.xs },
  activeMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { marginHorizontal: 2 },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl },
  bigEmoji: { fontSize: 44, marginBottom: spacing.md },
  bookBtn: { marginTop: spacing.lg, alignSelf: 'stretch' },
  quickRow: { flexDirection: 'row', gap: spacing.md },
  quick: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
