import { useState } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { Screen, Header, AppText, Card, Button, Input, StatusBadge, LoadingState, ErrorState } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { subscribeBooking, cancelBooking, reuploadReceipt, submitReview } from '@/services/bookingService';
import { confirmAction } from '@/utils/confirm';
import { uploadImageAsync } from '@/services/storageService';
import { BOOKING_STATUS, canClientCancel } from '@/constants/bookingStatus';
import { PAYMENT_METHOD, isTransferMethod } from '@/constants/payments';
import { formatMoney } from '@/utils/money';
import { formatLongDate, formatHour, toDate } from '@/utils/dates';
import { pickImage } from '@/utils/media';
import { vehicleLabel } from '../vehicles';
import { colors, spacing } from '@/constants/theme';

const RANK = {
  [BOOKING_STATUS.PENDING_PAYMENT]: 0,
  [BOOKING_STATUS.PAYMENT_REJECTED]: 0,
  [BOOKING_STATUS.SEARCHING_WORKER]: 1,
  [BOOKING_STATUS.ASSIGNED]: 2,
  [BOOKING_STATUS.ON_THE_WAY]: 3,
  [BOOKING_STATUS.ARRIVED]: 4,
  [BOOKING_STATUS.IN_PROGRESS]: 5,
  [BOOKING_STATUS.PAYMENT_ISSUE]: 5,
  [BOOKING_STATUS.COMPLETED]: 6,
};

const buildSteps = (t, isZelle) => {
  const steps = [
    { key: 'searching_worker', rank: 1 },
    { key: 'assigned', rank: 2 },
    { key: 'on_the_way', rank: 3 },
    { key: 'arrived', rank: 4 },
    { key: 'in_progress', rank: 5 },
    { key: 'completed', rank: 6 },
  ];
  if (isZelle) steps.unshift({ key: 'pending_payment', rank: 0, label: t('status.pending_payment') });
  return steps.map((s) => ({ ...s, label: s.label ?? t(`status.${s.key}`) }));
};

function TimelineRow({ label, reached, current, last }) {
  return (
    <View style={styles.tlRow}>
      <View style={styles.tlLeft}>
        <View style={[styles.tlDot, reached && styles.tlDotOn, current && styles.tlDotCurrent]}>
          {reached ? <Ionicons name="checkmark" size={12} color={colors.textOnPrimary} /> : null}
        </View>
        {!last ? <View style={[styles.tlLine, reached && styles.tlLineOn]} /> : null}
      </View>
      <AppText
        variant={current ? 'label' : 'body'}
        color={reached ? colors.text : colors.textMuted}
        style={styles.tlLabel}
      >
        {label}
      </AppText>
    </View>
  );
}

export default function OrderDetail() {
  const { t, lang } = useI18n();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  const { data: booking, loading, error } = useSubscription(
    (onData, onError) => subscribeBooking(id, onData, onError),
    [id]
  );

  if (loading) {
    return (
      <Screen padded={false}>
        <View style={styles.headerWrap}><Header title="" showBack /></View>
        <LoadingState />
      </Screen>
    );
  }
  if (error || !booking) {
    return (
      <Screen padded={false}>
        <View style={styles.headerWrap}><Header title="" showBack /></View>
        <ErrorState />
      </Screen>
    );
  }

  const method = booking.payment?.method;
  const isTransfer = isTransferMethod(method);
  const methodLabel = t(`payment.${method === PAYMENT_METHOD.VENMO ? 'venmo' : method === PAYMENT_METHOD.CASH ? 'cash' : 'zelle'}`);
  const currentRank = RANK[booking.status] ?? 0;
  const steps = buildSteps(t, isTransfer);
  const scheduled = toDate(booking.scheduledAt);

  const onCancel = async () => {
    const ok = await confirmAction({
      title: t('common.cancel'),
      message: booking.serviceSnapshot?.name ?? '',
      confirmText: t('common.yes'),
      cancelText: t('common.no'),
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await cancelBooking(booking.id, { by: 'client' });
    } catch (err) {
      Alert.alert(t('common.close'), t(err.key ?? 'error.generic'));
    } finally {
      setBusy(false);
    }
  };

  const onSubmitReview = async () => {
    if (!rating) return;
    setReviewBusy(true);
    try {
      await submitReview(booking.id, { rating, comment });
    } catch (err) {
      Alert.alert(t('common.close'), t(err.key ?? 'error.generic'));
    } finally {
      setReviewBusy(false);
    }
  };

  const onReupload = async () => {
    const result = await pickImage({ fromCamera: false });
    if (result.status === 'denied') {
      Alert.alert(t('common.close'), t('error.permissionDenied'));
      return;
    }
    if (result.status !== 'ok') return;
    setBusy(true);
    try {
      const url = await uploadImageAsync(result.uri, `receipts/${user.uid}/${Date.now()}.jpg`);
      await reuploadReceipt(booking.id, { receiptUrl: url, confirmationCode: booking.payment?.confirmationCode ?? null });
    } catch (err) {
      Alert.alert(t('common.close'), t(err.key ?? 'error.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll padded={false}>
      <View style={styles.headerWrap}>
        <Header title={booking.serviceSnapshot?.name ?? ''} showBack />
      </View>

      <View style={styles.body}>
        <View style={styles.badgeRow}>
          <StatusBadge status={booking.status} />
          <AppText variant="title" color={colors.primary}>
            {formatMoney(booking.total)}
          </AppText>
        </View>

        {booking.status === BOOKING_STATUS.CANCELLED ? (
          <Card style={styles.banner}>
            <AppText variant="label" color={colors.textMuted}>
              {t('status.cancelled')}
            </AppText>
          </Card>
        ) : booking.status === BOOKING_STATUS.PAYMENT_REJECTED ? (
          <Card style={[styles.banner, styles.bannerDanger]}>
            <AppText variant="label" color={colors.danger}>
              {t('status.payment_rejected')}
            </AppText>
            {booking.payment?.rejectionReason ? (
              <AppText variant="caption" style={styles.bannerMsg}>
                {booking.payment.rejectionReason}
              </AppText>
            ) : null}
            <Button title={t('payment.uploadReceipt')} onPress={onReupload} loading={busy} style={styles.bannerBtn} />
          </Card>
        ) : (
          <Card style={styles.timeline}>
            {steps.map((s, i) => (
              <TimelineRow
                key={s.key}
                label={s.label}
                reached={currentRank >= s.rank}
                current={currentRank === s.rank}
                last={i === steps.length - 1}
              />
            ))}
          </Card>
        )}

        <Card style={styles.details}>
          {(booking.items ?? []).length > 0 ? (
            booking.items.map((it, i) => (
              <DetailRow
                key={i}
                icon="car-outline"
                label={vehicleLabel(it.vehicle ?? {})}
                value={`${it.service?.name ?? ''} · ${formatMoney(it.price)}`}
              />
            ))
          ) : (
            <DetailRow icon="car-outline" label={t('vehicle.title')} value={vehicleLabel(booking.vehicleSnapshot ?? {})} />
          )}
          <DetailRow icon="location-outline" label={t('address.title')} value={booking.addressSnapshot?.fullAddress} />
          {booking.addressSnapshot?.notes ? (
            <DetailRow icon="information-circle-outline" label={t('address.notes')} value={booking.addressSnapshot.notes} />
          ) : null}
          <DetailRow
            icon="calendar-outline"
            label={t('booking.scheduledFor')}
            value={scheduled ? `${formatLongDate(scheduled, lang)} · ${formatHour(scheduled, lang)}` : '—'}
          />
          <DetailRow
            icon={isTransfer ? 'card-outline' : 'cash-outline'}
            label={t('booking.payMethod')}
            value={methodLabel}
          />
          {(booking.extras ?? []).length > 0 ? (
            <DetailRow
              icon="add-circle-outline"
              label={t('extras.selectedLabel')}
              value={booking.extras.map((e) => e.name).join(', ')}
            />
          ) : null}
        </Card>

        {booking.status === BOOKING_STATUS.COMPLETED ? (
          <Card style={styles.reviewCard}>
            {booking.review ? (
              <>
                <AppText variant="subtitle">{t('review.thanksTitle')}</AppText>
                <AppText variant="display" center>{FACES[booking.review.rating] ?? ''}</AppText>
                {booking.review.comment ? (
                  <AppText variant="body" center muted>{booking.review.comment}</AppText>
                ) : null}
              </>
            ) : (
              <>
                <AppText variant="subtitle">{t('review.title')}</AppText>
                <AppText variant="caption">{t('review.subtitle')}</AppText>
                <View style={styles.facesRow}>
                  {[1, 2, 3].map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => setRating(r)}
                      style={[styles.face, rating === r && styles.faceOn]}
                    >
                      <AppText style={styles.faceEmoji}>{FACES[r]}</AppText>
                    </Pressable>
                  ))}
                </View>
                <Input
                  label={t('review.comment')}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                />
                <Button
                  title={t('review.submit')}
                  onPress={onSubmitReview}
                  loading={reviewBusy}
                  disabled={!rating}
                  style={styles.reviewBtn}
                />
              </>
            )}
          </Card>
        ) : null}

        {canClientCancel(booking.status) ? (
          <Button title={t('common.cancel')} variant="secondary" onPress={onCancel} loading={busy} style={styles.cancelBtn} />
        ) : null}
      </View>
    </Screen>
  );
}

const FACES = { 1: '😞', 2: '😐', 3: '😊' };

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.detailIcon} />
      <View style={styles.flex}>
        <AppText variant="caption">{label}</AppText>
        <AppText variant="body">{value ?? '—'}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg },
  flex: { flex: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  banner: { alignItems: 'flex-start', gap: spacing.sm },
  bannerDanger: { backgroundColor: colors.dangerLight, borderColor: colors.dangerLight },
  bannerMsg: { color: colors.text },
  bannerBtn: { alignSelf: 'stretch', marginTop: spacing.sm },
  timeline: { gap: 0 },
  tlRow: { flexDirection: 'row', gap: spacing.md },
  tlLeft: { alignItems: 'center', width: 24 },
  tlDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlDotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tlDotCurrent: { borderColor: colors.primary, borderWidth: 3 },
  tlLine: { width: 2, flex: 1, backgroundColor: colors.border, minHeight: 20 },
  tlLineOn: { backgroundColor: colors.primary },
  tlLabel: { paddingBottom: spacing.lg, paddingTop: 2 },
  details: { gap: spacing.md },
  detailRow: { flexDirection: 'row', gap: spacing.md },
  detailIcon: { marginTop: 2 },
  cancelBtn: { marginTop: spacing.sm },
  reviewCard: { gap: spacing.sm, alignItems: 'stretch' },
  facesRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginVertical: spacing.sm },
  face: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  faceEmoji: { fontSize: 34 },
  reviewBtn: { marginTop: spacing.sm },
});
