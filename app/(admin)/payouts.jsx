/**
 * Admin → "Pagos a detailers" (settlement).
 *
 * One row per detailer with their ID, today's earnings, and the NET amount to
 * transfer manually (transfer payouts minus cash fees they owe). Expand to see
 * the pending orders, then "Marcar como pagado" once the transfer is done.
 */

import { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Header, AppText, Card, Button, LoadingState, EmptyState } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { useSubscription } from '@/hooks/useSubscription';
import { subscribeDetailers } from '@/services/adminService';
import { subscribeAllPayouts, settleOrders } from '@/services/payoutService';
import { ratingFace } from '@/screens/AvailabilityScreen';
import { formatMoney } from '@/utils/money';
import { colors, spacing, radius } from '@/constants/theme';

const DAY_KEYS = ['day.sun', 'day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat'];
const fmtH = (h) => `${(h % 12) || 12}${h < 12 || h === 24 ? 'am' : 'pm'}`;
const formatSchedule = (s, t) => {
  const days = (s.days ?? []).slice().sort((a, b) => a - b).map((d) => t(DAY_KEYS[d])).join(' ');
  return `${days} · ${fmtH(s.startHour)}–${fmtH(s.endHour)}`;
};

export default function AdminPayouts() {
  const { t } = useI18n();
  const detailers = useSubscription((d, e) => subscribeDetailers(d, e), []);
  const payouts = useSubscription((d, e) => subscribeAllPayouts(d, e), []);

  // Merge the detailer roster (id + name) with their money summary.
  const rows = useMemo(() => {
    const byId = new Map((payouts.data ?? []).map((p) => [p.workerId, p]));
    return (detailers.data ?? [])
      .map((det) => ({ detailer: det, summary: byId.get(det.id) ?? null }))
      .sort((a, b) => (b.summary?.pendingToPay ?? 0) - (a.summary?.pendingToPay ?? 0));
  }, [detailers.data, payouts.data]);

  const loading = detailers.loading || payouts.loading;

  return (
    <Screen scroll padded={false}>
      <View style={styles.headerWrap}>
        <Header title={t('payout.title')} showBack />
      </View>
      <View style={styles.body}>
        {loading ? (
          <LoadingState />
        ) : rows.length === 0 ? (
          <EmptyState icon="🧾" title={t('payout.empty')} />
        ) : (
          rows.map(({ detailer, summary }) => (
            <DetailerRow key={detailer.id} detailer={detailer} summary={summary} t={t} />
          ))
        )}
      </View>
    </Screen>
  );
}

function DetailerRow({ detailer, summary, t }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const pendingToPay = summary?.pendingToPay ?? 0;
  const pendingOrders = summary?.pendingOrders ?? [];
  const owesBusiness = pendingToPay < 0;

  const markPaid = async () => {
    if (pendingOrders.length === 0) return;
    setBusy(true);
    try {
      await settleOrders(pendingOrders.map((o) => o.id));
    } catch (err) {
      Alert.alert(t('common.close'), t(err.key ?? 'error.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <AppText variant="subtitle">{detailer.name || t('admin.applicantNoName')}</AppText>
          <AppText variant="caption" color={colors.primary}>
            {detailer.detailerCode ?? '—'}
          </AppText>
          {summary?.reviewCount ? (
            <AppText variant="caption">
              {t('review.avg')}: {ratingFace(summary.avgRating)} ({summary.reviewCount})
            </AppText>
          ) : null}
          {detailer.schedule?.days?.length ? (
            <AppText variant="caption" muted>
              🗓️ {formatSchedule(detailer.schedule, t)}
            </AppText>
          ) : (
            <AppText variant="caption" color={colors.textMuted}>
              {t('payout.noSchedule')}
            </AppText>
          )}
        </View>
        <View style={styles.amountBox}>
          <AppText variant="caption">{owesBusiness ? t('payout.owesBusiness') : t('payout.toPay')}</AppText>
          <AppText variant="title" color={owesBusiness ? colors.danger : colors.success}>
            {formatMoney(Math.abs(pendingToPay))}
          </AppText>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label={t('payout.todayEarnings')} value={formatMoney(summary?.todayEarnings ?? 0)} />
        <Stat label={t('payout.todayOrders')} value={String(summary?.todayCount ?? 0)} />
        <Stat label={t('payout.pendingOrders')} value={String(pendingOrders.length)} />
      </View>

      {pendingOrders.length > 0 ? (
        <>
          <Pressable onPress={() => setOpen((v) => !v)} style={styles.expandRow} hitSlop={8}>
            <AppText variant="caption" color={colors.primary}>
              {open ? t('payout.hideOrders') : t('payout.seeOrders')}
            </AppText>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
          </Pressable>

          {open
            ? pendingOrders.map((o) => (
                <View key={o.id} style={styles.orderLine}>
                  <View style={styles.flex}>
                    <AppText variant="caption">{o.serviceSnapshot?.name}</AppText>
                    <AppText variant="caption" muted>
                      {o.clientName} · {t(`payment.${o.payment?.method === 'cash' ? 'cash' : o.payment?.method === 'venmo' ? 'venmo' : 'zelle'}`)}
                    </AppText>
                  </View>
                  <AppText variant="label" color={o.payment?.method === 'cash' ? colors.danger : colors.success}>
                    {o.payment?.method === 'cash'
                      ? `-${formatMoney(o.businessFee)}`
                      : `+${formatMoney(o.workerPayout)}`}
                  </AppText>
                </View>
              ))
            : null}

          <Button
            title={t('payout.markPaid')}
            onPress={markPaid}
            loading={busy}
            variant="success"
            size="md"
            style={styles.payBtn}
          />
        </>
      ) : (
        <AppText variant="caption" muted style={styles.settled}>
          {t('payout.allSettled')}
        </AppText>
      )}
    </Card>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <AppText variant="title">{value}</AppText>
      <AppText variant="caption" center>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg },
  flex: { flex: 1 },
  card: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  amountBox: { alignItems: 'flex-end' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  expandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  orderLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  payBtn: { marginTop: spacing.sm },
  settled: { textAlign: 'center' },
});
