/**
 * Worker / Admin dispatch screen (Phase 2).
 *
 * Shared by both the (worker) and (admin) tab groups so there is a single
 * source of truth for the dispatch experience. It has three states:
 *
 *   1. The worker owns an active order  → show it with a "next step" button
 *      that walks the order through on-the-way → arrived → washing → completed.
 *   2. No active order, available ON     → show the live queue of searching
 *      orders; a chime plays when a new one arrives ("first to accept wins").
 *   3. No active order, available OFF     → prompt to turn availability on.
 */

import { useEffect, useRef, useState } from 'react';
import { View, Switch, StyleSheet, Pressable, Alert, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Header, AppText, Card, Button, StatusBadge, EmptyState } from '@/components/ui';
import { AvatarUpload } from '@/components/AvatarUpload';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useOrderAlert } from '@/hooks/useOrderAlert';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { confirmAction } from '@/utils/confirm';
import { setAvailability, setSchedule } from '@/services/userService';
import { BUSINESS } from '@/config/business';
import {
  subscribeSearchingOrders,
  subscribeWorkerActiveBooking,
  subscribeWorkerHistory,
  acceptOrder,
  advanceWorkerStatus,
} from '@/services/bookingService';
import { subscribeMyPayouts } from '@/services/payoutService';
import { BOOKING_STATUS, WORKER_PROGRESS_FLOW } from '@/constants/bookingStatus';
import { formatMoney } from '@/utils/money';
import { formatLongDate } from '@/utils/dates';
import { colors, spacing, radius } from '@/constants/theme';

/** Turns a 1–3 average rating into the closest face (— when no reviews yet). */
export const ratingFace = (avg) =>
  avg >= 2.5 ? '😊' : avg >= 1.5 ? '😐' : avg > 0 ? '😞' : '—';

/** Label for the button that moves an owned order to its next step. */
const NEXT_ACTION_KEY = {
  [BOOKING_STATUS.ON_THE_WAY]: 'worker.goOnTheWay',
  [BOOKING_STATUS.ARRIVED]: 'worker.markArrived',
  [BOOKING_STATUS.IN_PROGRESS]: 'worker.startWash',
  [BOOKING_STATUS.COMPLETED]: 'worker.finish',
};

const nextStatus = (status) => {
  const idx = WORKER_PROGRESS_FLOW.indexOf(status);
  return idx === -1 ? WORKER_PROGRESS_FLOW[0] : WORKER_PROGRESS_FLOW[idx + 1];
};

const DAY_KEYS = ['day.sun', 'day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat'];
const fmtHour = (h) => `${(h % 12) || 12}${h < 12 || h === 24 ? 'am' : 'pm'}`;

/** Detailer's weekly schedule editor: which days + hour range they can work. */
function ScheduleCard({ profile, uid, t }) {
  const initial = profile?.schedule ?? {
    days: [1, 2, 3, 4, 5, 6],
    startHour: BUSINESS.hours.open,
    endHour: BUSINESS.hours.close,
  };
  const [days, setDays] = useState(initial.days ?? []);
  const [startHour, setStartHour] = useState(initial.startHour ?? BUSINESS.hours.open);
  const [endHour, setEndHour] = useState(initial.endHour ?? BUSINESS.hours.close);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = () => setSaved(false);
  const toggleDay = (d) => {
    dirty();
    setDays((arr) => (arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d].sort((a, b) => a - b)));
  };
  const bumpStart = (delta) => { dirty(); setStartHour((h) => Math.max(4, Math.min(h + delta, endHour - 1))); };
  const bumpEnd = (delta) => { dirty(); setEndHour((h) => Math.max(startHour + 1, Math.min(h + delta, 23))); };

  const save = async () => {
    setSaving(true);
    try {
      await setSchedule(uid, { days, startHour, endHour });
      setSaved(true);
    } catch (err) {
      Alert.alert(t('common.close'), t(err.key ?? 'error.generic'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.schedCard}>
      <AppText variant="subtitle">{t('worker.scheduleTitle')}</AppText>
      <AppText variant="caption" style={styles.schedHint}>{t('worker.scheduleHint')}</AppText>

      <View style={styles.dayRow}>
        {DAY_KEYS.map((key, d) => {
          const on = days.includes(d);
          return (
            <Pressable key={d} onPress={() => toggleDay(d)} style={[styles.dayChip, on && styles.dayChipOn]}>
              <AppText variant="caption" color={on ? colors.textOnPrimary : colors.text}>{t(key)}</AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.hourRow}>
        <View style={styles.hourCol}>
          <AppText variant="caption">{t('worker.scheduleFrom')}</AppText>
          <View style={styles.stepper}>
            <Pressable onPress={() => bumpStart(-1)} style={styles.stepBtn}><AppText variant="subtitle">−</AppText></Pressable>
            <AppText variant="subtitle">{fmtHour(startHour)}</AppText>
            <Pressable onPress={() => bumpStart(1)} style={styles.stepBtn}><AppText variant="subtitle">+</AppText></Pressable>
          </View>
        </View>
        <View style={styles.hourCol}>
          <AppText variant="caption">{t('worker.scheduleTo')}</AppText>
          <View style={styles.stepper}>
            <Pressable onPress={() => bumpEnd(-1)} style={styles.stepBtn}><AppText variant="subtitle">−</AppText></Pressable>
            <AppText variant="subtitle">{fmtHour(endHour)}</AppText>
            <Pressable onPress={() => bumpEnd(1)} style={styles.stepBtn}><AppText variant="subtitle">+</AppText></Pressable>
          </View>
        </View>
      </View>

      <Button
        title={saved ? t('common.saved') : t('common.save')}
        onPress={save}
        loading={saving}
        disabled={days.length === 0}
        style={styles.schedSave}
      />
    </Card>
  );
}

export default function AvailabilityScreen() {
  const { t, lang } = useI18n();
  const { profile, user, signOut } = useAuth();

  usePushRegistration();

  const available = profile?.available === true;
  const [savingToggle, setSavingToggle] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [advancing, setAdvancing] = useState(false);

  const { data: activeOrder } = useSubscription(
    (onData, onError) => subscribeWorkerActiveBooking(user.uid, onData, onError),
    [user.uid]
  );
  const { data: queue } = useSubscription(
    (onData, onError) => subscribeSearchingOrders(onData, onError),
    []
  );
  const { data: earnings } = useSubscription(
    (onData, onError) => subscribeMyPayouts(user.uid, onData, onError),
    [user.uid]
  );
  const { data: history } = useSubscription(
    (onData, onError) => subscribeWorkerHistory(user.uid, onData, onError),
    [user.uid]
  );

  // --- New-order chime ------------------------------------------------------
  const playAlert = useOrderAlert();
  const seenIds = useRef(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const orders = queue ?? [];
    const ids = new Set(orders.map((o) => o.id));
    const hasNew = orders.some((o) => !seenIds.current.has(o.id));
    // Skip the initial load (pre-existing orders) and only alert a free,
    // available worker — no point ringing while they're busy on another car.
    if (hasNew && !isFirstLoad.current && available && !activeOrder) {
      playAlert();
    }
    seenIds.current = ids;
    isFirstLoad.current = false;
  }, [queue, available, activeOrder, playAlert]);

  // --- Actions --------------------------------------------------------------
  const toggle = async (next) => {
    setSavingToggle(true);
    try {
      await setAvailability(user.uid, next);
    } catch (err) {
      Alert.alert(t('common.close'), t(err.key ?? 'error.generic'));
    } finally {
      setSavingToggle(false);
    }
  };

  const accept = async (order) => {
    setAcceptingId(order.id);
    try {
      await acceptOrder(order.id, { uid: user.uid, name: profile?.name });
    } catch (err) {
      Alert.alert(t('common.close'), t(err.key ?? 'error.orderTaken'));
    } finally {
      setAcceptingId(null);
    }
  };

  const advance = async (order) => {
    setAdvancing(true);
    try {
      await advanceWorkerStatus(order);
    } catch (err) {
      Alert.alert(t('common.close'), t(err.key ?? 'error.generic'));
    } finally {
      setAdvancing(false);
    }
  };

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

  const orders = queue ?? [];

  return (
    <Screen scroll padded={false}>
      <View style={styles.headerWrap}>
        <Header
          title={t('worker.title')}
          right={
            <Pressable
              onPress={confirmSignOut}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('auth.signOut')}
            >
              <Ionicons name="log-out-outline" size={24} color={colors.textMuted} />
            </Pressable>
          }
        />
      </View>

      <View style={styles.body}>
        <View style={styles.identityRow}>
          <AvatarUpload uid={user.uid} name={profile?.name} photoUrl={profile?.photoUrl} size={56} />
          <View style={styles.flex}>
            <AppText variant="subtitle">{profile?.name}</AppText>
            {profile?.detailerCode ? (
              <AppText variant="caption" color={colors.primary}>{profile.detailerCode}</AppText>
            ) : null}
          </View>
        </View>

        <Card style={styles.earnCard}>
          <View style={styles.earnHead}>
            <AppText variant="caption" color={colors.textOnPrimary}>{t('payout.myId')}</AppText>
            <AppText variant="subtitle" color={colors.textOnPrimary}>{profile?.detailerCode ?? '—'}</AppText>
          </View>
          <View style={styles.earnRow}>
            <View style={styles.flex}>
              <AppText variant="caption" color={colors.textOnPrimary}>{t('payout.todayEarnings')}</AppText>
              <AppText variant="title" color={colors.textOnPrimary}>{formatMoney(earnings?.todayEarnings ?? 0)}</AppText>
            </View>
            <View style={styles.flex}>
              <AppText variant="caption" color={colors.textOnPrimary}>{t('payout.pendingToReceive')}</AppText>
              <AppText variant="title" color={colors.textOnPrimary}>{formatMoney(Math.max(0, earnings?.pendingToPay ?? 0))}</AppText>
            </View>
          </View>
          {earnings?.reviewCount ? (
            <AppText variant="caption" color={colors.textOnPrimary}>
              {t('review.avg')}: {ratingFace(earnings.avgRating)} ({earnings.reviewCount})
            </AppText>
          ) : null}
        </Card>

        {activeOrder ? (
          <ActiveOrderCard
            order={activeOrder}
            busy={advancing}
            onAdvance={() => advance(activeOrder)}
            t={t}
          />
        ) : (
          <>
            <Card style={styles.toggleCard}>
              <View style={styles.toggleRow}>
                <View style={styles.flex}>
                  <AppText variant="subtitle">
                    {available ? t('worker.availableOn') : t('worker.availableOff')}
                  </AppText>
                  <AppText variant="caption">
                    {available ? t('worker.availableHint') : t('worker.unavailableHint')}
                  </AppText>
                </View>
                <Switch
                  value={available}
                  onValueChange={toggle}
                  disabled={savingToggle}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.surface}
                />
              </View>
            </Card>

            <ScheduleCard profile={profile} uid={user.uid} t={t} />

            {available ? (
              <View style={styles.listArea}>
                <AppText variant="label" style={styles.queueLabel}>
                  {t('worker.queueTitle')}
                </AppText>
                {orders.length === 0 ? (
                  <EmptyState
                    icon="🚗"
                    title={t('worker.noOrders')}
                    message={t('worker.noOrdersHint')}
                  />
                ) : (
                  orders.map((order) => (
                    <QueueCard
                      key={order.id}
                      order={order}
                      loading={acceptingId === order.id}
                      disabled={acceptingId !== null && acceptingId !== order.id}
                      onAccept={() => accept(order)}
                      t={t}
                    />
                  ))
                )}
              </View>
            ) : null}
          </>
        )}

        <HistorySection history={history ?? []} t={t} lang={lang} />
      </View>
    </Screen>
  );
}

/** The worker's completed orders — a compact "recent work" list. */
function HistorySection({ history, t, lang }) {
  return (
    <View style={styles.historyArea}>
      <AppText variant="label" style={styles.queueLabel}>
        {t('worker.historyTitle')}
      </AppText>
      {history.length === 0 ? (
        <AppText variant="caption" color={colors.textMuted}>{t('worker.noHistory')}</AppText>
      ) : (
        history.slice(0, 20).map((order) => {
          const when = order.updatedAt ?? order.createdAt;
          const date = when?.toDate ? when.toDate() : null;
          return (
            <Card key={order.id} style={styles.historyRow}>
              <View style={styles.flex}>
                <AppText variant="label">{order.serviceSnapshot?.name}</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {order.clientName}{date ? ` · ${formatLongDate(date, lang)}` : ''}
                </AppText>
              </View>
              <AppText variant="subtitle" style={styles.payout}>
                {formatMoney(order.workerPayout ?? 0)}
              </AppText>
            </Card>
          );
        })
      )}
    </View>
  );
}

/** A single order in the "available orders" queue. */
function QueueCard({ order, loading, disabled, onAccept, t }) {
  return (
    <Card style={styles.orderCard}>
      <View style={styles.orderTop}>
        <AppText variant="subtitle">{order.serviceSnapshot?.name}</AppText>
        <AppText variant="subtitle" style={styles.payout}>
          {t('worker.youEarn', { amount: formatMoney(order.workerPayout) })}
        </AppText>
      </View>
      <OrderMeta order={order} />
      <CarPhotos order={order} />
      <Button
        title={t('worker.accept')}
        onPress={onAccept}
        loading={loading}
        disabled={disabled}
        size="md"
        style={styles.action}
      />
    </Card>
  );
}

/** Opens the service address in the phone's maps app. */
const openInMaps = (address) => {
  if (!address) return;
  const q = encodeURIComponent(address);
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
};

/** The order the worker currently owns, with the next-step button. */
function ActiveOrderCard({ order, busy, onAdvance, t }) {
  const target = nextStatus(order.status);
  const address = order.addressSnapshot?.fullAddress;
  return (
    <Card style={styles.orderCard}>
      <View style={styles.orderTop}>
        <AppText variant="subtitle">{t('worker.myOrder')}</AppText>
        <StatusBadge status={order.status} />
      </View>
      <AppText variant="body">{order.serviceSnapshot?.name}</AppText>
      <OrderMeta order={order} />
      <CarPhotos order={order} />
      {address ? (
        <Button
          title={t('worker.openMaps')}
          onPress={() => openInMaps(address)}
          variant="secondary"
          size="md"
          style={styles.action}
        />
      ) : null}
      {target ? (
        <Button
          title={t(NEXT_ACTION_KEY[target])}
          onPress={onAdvance}
          loading={busy}
          variant={target === BOOKING_STATUS.COMPLETED ? 'success' : 'primary'}
          size="md"
          style={styles.action}
        />
      ) : null}
    </Card>
  );
}

/** Shared client / vehicle / address rows for an order (lists every car). */
function OrderMeta({ order }) {
  const items = order.items ?? [];
  return (
    <View style={styles.meta}>
      <MetaRow icon="person-outline" value={order.clientName} />
      {items.length > 0 ? (
        items.map((it, i) => (
          <MetaRow
            key={i}
            icon="car-outline"
            value={`${[it.vehicle?.make, it.vehicle?.model].filter(Boolean).join(' ')} — ${it.service?.name ?? ''}`}
          />
        ))
      ) : (
        <MetaRow
          icon="car-outline"
          value={[order.vehicleSnapshot?.make, order.vehicleSnapshot?.model].filter(Boolean).join(' ')}
        />
      )}
      <MetaRow icon="location-outline" value={order.addressSnapshot?.fullAddress} />
    </View>
  );
}

function MetaRow({ icon, value }) {
  if (!value) return null;
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <AppText variant="caption">{value}</AppText>
    </View>
  );
}

/** Thumbnails of the cars in an order that have a photo. */
function CarPhotos({ order }) {
  const photos = (order.items ?? []).map((it) => it.vehicle?.photoUrl).filter(Boolean);
  if (photos.length === 0) return null;
  return (
    <View style={styles.photoRow}>
      {photos.map((uri, i) => (
        <Image key={i} source={{ uri }} style={styles.carPhoto} resizeMode="cover" />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  flex: { flex: 1, paddingRight: spacing.md },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  earnCard: { marginTop: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.primary, borderColor: colors.primary, gap: spacing.md },
  earnHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  earnRow: { flexDirection: 'row', gap: spacing.md },
  toggleCard: { marginTop: spacing.lg, borderRadius: radius.lg },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  schedCard: { marginTop: spacing.md, borderRadius: radius.lg, gap: spacing.xs },
  schedHint: { marginBottom: spacing.sm },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  dayChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 46,
    alignItems: 'center',
  },
  dayChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  hourRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  hourCol: { flex: 1, gap: spacing.xs },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  stepBtn: { paddingHorizontal: spacing.sm },
  schedSave: { marginTop: spacing.md },
  listArea: { marginTop: spacing.xl },
  historyArea: { marginTop: spacing.xl },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  queueLabel: { marginBottom: spacing.sm },
  orderCard: { marginTop: spacing.md, gap: spacing.sm },
  orderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  payout: { color: colors.success },
  meta: { gap: spacing.xs, marginTop: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  photoRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  carPhoto: { width: 72, height: 54, borderRadius: radius.sm },
  action: { marginTop: spacing.sm },
});
