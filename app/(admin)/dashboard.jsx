import { useMemo } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen, Header, AppText, Card, LoadingState, ErrorState } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { subscribeBookingsSince, subscribePendingPayments } from '@/services/bookingService';
import { BOOKING_STATUS } from '@/constants/bookingStatus';
import { confirmAction } from '@/utils/confirm';
import { formatMoney } from '@/utils/money';
import { colors, spacing, radius } from '@/constants/theme';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const IN_PROGRESS_STATUSES = [
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.ON_THE_WAY,
  BOOKING_STATUS.ARRIVED,
  BOOKING_STATUS.IN_PROGRESS,
];

function StatCard({ icon, label, value, tint = colors.primary, onPress }) {
  return (
    <Card style={styles.stat} onPress={onPress} padded>
      <View style={[styles.statIcon, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <AppText variant="title" style={styles.statValue}>
        {value}
      </AppText>
      <AppText variant="caption">{label}</AppText>
    </Card>
  );
}

export default function AdminDashboard() {
  const { t } = useI18n();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const today = useMemo(startOfToday, []);

  const todaySub = useSubscription((onData, onError) => subscribeBookingsSince(today, onData, onError), [
    today.getTime(),
  ]);
  const pendingSub = useSubscription((onData, onError) => subscribePendingPayments(onData, onError), []);

  const metrics = useMemo(() => {
    const list = todaySub.data ?? [];
    const completed = list.filter((b) => b.status === BOOKING_STATUS.COMPLETED);
    return {
      todayOrders: list.length,
      inProgress: list.filter((b) => IN_PROGRESS_STATUSES.includes(b.status)).length,
      completedToday: completed.length,
      // Business keeps (total − detailer payout) per order, which now varies by
      // package and vehicle type — sum it rather than assuming a flat fee.
      revenueToday: completed.reduce((s, b) => s + (Number(b.businessFee) || 0), 0),
    };
  }, [todaySub.data]);

  const confirmSignOut = async () => {
    if (
      await confirmAction({
        title: t('auth.signOut'),
        confirmText: t('auth.signOut'),
        cancelText: t('common.cancel'),
        destructive: true,
      })
    ) {
      signOut();
    }
  };

  if (todaySub.loading || pendingSub.loading) {
    return (
      <Screen padded={false}>
        <View style={styles.headerWrap}>
          <Header title={t('admin.dashboard')} />
        </View>
        <LoadingState />
      </Screen>
    );
  }

  if (todaySub.error) {
    return (
      <Screen padded={false}>
        <View style={styles.headerWrap}>
          <Header title={t('admin.dashboard')} />
        </View>
        <ErrorState />
      </Screen>
    );
  }

  const pendingCount = (pendingSub.data ?? []).length;

  return (
    <Screen scroll padded={false}>
      <View style={styles.headerWrap}>
        <Header
          title={t('admin.dashboard')}
          right={
            <Pressable onPress={confirmSignOut} hitSlop={10}>
              <Ionicons name="log-out-outline" size={24} color={colors.textMuted} />
            </Pressable>
          }
        />
      </View>

      <View style={styles.body}>
        <AppText variant="body" muted style={styles.hello}>
          {t('client.greeting', { name: profile?.name ?? '' })}
        </AppText>

        {pendingCount > 0 ? (
          <Card style={styles.alertCard} onPress={() => router.push('/(admin)/verify')}>
            <View style={styles.alertRow}>
              <View style={styles.alertBadge}>
                <AppText style={styles.alertBadgeText}>{pendingCount}</AppText>
              </View>
              <View style={styles.flex}>
                <AppText variant="subtitle" color={colors.textOnPrimary}>
                  {t('admin.pendingPayments')}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.textOnPrimary} />
            </View>
          </Card>
        ) : null}

        <View style={styles.grid}>
          <StatCard icon="calendar-outline" label={t('admin.todayOrders')} value={metrics.todayOrders} />
          <StatCard icon="water-outline" label={t('admin.inProgress')} value={metrics.inProgress} tint={colors.warning} />
          <StatCard icon="checkmark-done-outline" label={t('admin.completedToday')} value={metrics.completedToday} tint={colors.success} />
          <StatCard icon="cash-outline" label={t('admin.revenueToday')} value={formatMoney(metrics.revenueToday)} tint={colors.success} />
        </View>

        <Card style={styles.linkCard} onPress={() => router.push('/(admin)/payouts')}>
          <View style={styles.linkRow}>
            <Ionicons name="wallet-outline" size={22} color={colors.primary} />
            <View style={styles.flex}>
              <AppText variant="subtitle">{t('payout.title')}</AppText>
              <AppText variant="caption">{t('payout.dashboardHint')}</AppText>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
          </View>
        </Card>

        <Card style={styles.linkCard} onPress={() => router.push('/(admin)/clients')}>
          <View style={styles.linkRow}>
            <Ionicons name="people-outline" size={22} color={colors.primary} />
            <View style={styles.flex}>
              <AppText variant="subtitle">{t('admin.clientsLink')}</AppText>
              <AppText variant="caption">{t('admin.clientsLinkHint')}</AppText>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  hello: { marginBottom: spacing.lg },
  flex: { flex: 1 },
  alertCard: { backgroundColor: colors.primary, borderColor: colors.primary, marginBottom: spacing.lg },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  alertBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.textOnPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBadgeText: { color: colors.primary, fontWeight: '800', fontSize: 18 },
  linkCard: { marginTop: spacing.lg },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: {
    width: '47%',
    flexGrow: 1,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  statValue: { marginBottom: 2 },
});
