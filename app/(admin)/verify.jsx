import { useState } from 'react';
import { View, StyleSheet, Image, Modal, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Header, AppText, Card, Input, Button, LoadingState, EmptyState, ErrorState } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { subscribePendingPayments, approvePayment, rejectPayment } from '@/services/bookingService';
import { formatMoney } from '@/utils/money';
import { formatSlotSummary, toDate } from '@/utils/dates';
import { colors, spacing, radius } from '@/constants/theme';

function PaymentCard({ booking, onPreview }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [mode, setMode] = useState('idle'); // idle | rejecting
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      Alert.alert(t('common.close'), t(err.key ?? 'error.generic'));
      setBusy(false);
    }
    // On success the card leaves the list via the live query; no state reset needed.
  };

  const approve = () => run(() => approvePayment(booking.id, user.uid));
  const reject = () => run(() => rejectPayment(booking.id, user.uid, reason));

  const scheduled = toDate(booking.scheduledAt);

  return (
    <Card style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.flex}>
          <AppText variant="subtitle">{booking.clientName}</AppText>
          <AppText variant="caption">{booking.serviceSnapshot?.name}</AppText>
        </View>
        <AppText variant="heading" color={colors.primary}>
          {formatMoney(booking.total)}
        </AppText>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
        <AppText variant="caption">
          {scheduled ? formatSlotSummary(scheduled, lang) : '—'}
        </AppText>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="card-outline" size={15} color={colors.textMuted} />
        <AppText variant="caption">
          {t(`payment.${booking.payment?.method === 'venmo' ? 'venmo' : 'zelle'}`)}
        </AppText>
      </View>

      {booking.payment?.confirmationCode ? (
        <View style={styles.metaRow}>
          <Ionicons name="key-outline" size={15} color={colors.textMuted} />
          <AppText variant="caption">{booking.payment.confirmationCode}</AppText>
        </View>
      ) : null}

      {booking.payment?.receiptUrl ? (
        <Pressable onPress={() => onPreview(booking.payment.receiptUrl)} style={styles.receiptWrap}>
          <Image source={{ uri: booking.payment.receiptUrl }} style={styles.receipt} resizeMode="cover" />
          <View style={styles.receiptHint}>
            <Ionicons name="expand-outline" size={16} color={colors.textOnPrimary} />
          </View>
        </Pressable>
      ) : (
        <AppText variant="caption" style={styles.noReceipt}>
          Sin comprobante (solo código)
        </AppText>
      )}

      {mode === 'rejecting' ? (
        <View style={styles.rejectBox}>
          <Input
            label={t('admin.rejectReason')}
            value={reason}
            onChangeText={setReason}
            multiline
            style={styles.reasonInput}
          />
          <View style={styles.actions}>
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setMode('idle')} disabled={busy} style={styles.actionBtn} />
            <Button title={t('admin.reject')} variant="danger" onPress={reject} loading={busy} style={styles.actionBtn} />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <Button title={t('admin.reject')} variant="secondary" onPress={() => setMode('rejecting')} disabled={busy} style={styles.actionBtn} />
          <Button title={t('admin.approve')} variant="success" onPress={approve} loading={busy} style={styles.actionBtn} />
        </View>
      )}
    </Card>
  );
}

export default function AdminVerify() {
  const { t } = useI18n();
  const [preview, setPreview] = useState(null);
  const { data, loading, error } = useSubscription(
    (onData, onError) => subscribePendingPayments(onData, onError),
    []
  );

  return (
    <Screen scroll padded={false}>
      <View style={styles.headerWrap}>
        <Header title={t('admin.verifyTitle')} />
      </View>

      <View style={styles.body}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon="✅" title={t('admin.verifyEmpty')} />
        ) : (
          data.map((booking) => (
            <PaymentCard key={booking.id} booking={booking} onPreview={setPreview} />
          ))
        )}
      </View>

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPreview(null)}>
          {preview ? <Image source={{ uri: preview }} style={styles.modalImage} resizeMode="contain" /> : null}
          <View style={styles.modalClose}>
            <Ionicons name="close" size={28} color={colors.textOnPrimary} />
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg },
  flex: { flex: 1 },
  card: { gap: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  receiptWrap: { marginTop: spacing.sm, borderRadius: radius.md, overflow: 'hidden' },
  receipt: { width: '100%', height: 180, backgroundColor: colors.surfaceMuted },
  receiptHint: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: colors.overlay,
    borderRadius: radius.sm,
    padding: 6,
  },
  noReceipt: { fontStyle: 'italic' },
  rejectBox: { marginTop: spacing.sm },
  reasonInput: { marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  actionBtn: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: { width: '92%', height: '80%' },
  modalClose: { position: 'absolute', top: 50, right: 24 },
});
