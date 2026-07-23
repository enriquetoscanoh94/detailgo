import { useState } from 'react';
import { Alert, Modal, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Header, AppText, Card, Button, Input, LoadingState, EmptyState, ErrorState } from '@/components/ui';
import { colors, spacing, radius } from '@/constants/theme';
import { useI18n } from '@/context/I18nContext';
import { useSubscription } from '@/hooks/useSubscription';
import {
  APPLICATION_STATUS,
  subscribeApplications,
  updateApplicationStatus,
} from '@/services/applicationService';
import { createDetailer, promoteToDetailer } from '@/services/adminService';
import { isEmail, isStrongEnoughPassword } from '@/utils/validation';
import { toDate } from '@/utils/dates';

function BooleanRow({ icon, label, value }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={16} color={value ? colors.success : colors.textMuted} />
      <AppText variant="caption" color={value ? colors.text : colors.textMuted}>
        {label}: {value ? 'Si' : 'No'}
      </AppText>
    </View>
  );
}

function ApplicationCard({ application }) {
  const { t, lang } = useI18n();
  const [busyStatus, setBusyStatus] = useState(null);
  const createdAt = toDate(application.createdAt);
  const status = application.status ?? APPLICATION_STATUS.PENDING;
  const isPending = status === APPLICATION_STATUS.PENDING;
  // Solicitud de un cliente ya registrado: se aprueba cambiando su rol.
  const isClientApp = !!application.clientUid;
  const [promoting, setPromoting] = useState(false);

  const promote = async () => {
    setPromoting(true);
    try {
      await promoteToDetailer(application.clientUid);
      await updateApplicationStatus(application.id, APPLICATION_STATUS.APPROVED).catch(() => {});
      Alert.alert(t('common.close'), t('admin.detailerActivated'));
    } catch (error) {
      Alert.alert(t('common.close'), t(error.key ?? 'error.generic'));
    } finally {
      setPromoting(false);
    }
  };

  // "Create detailer account" form state.
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState(application.email ?? '');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const setStatus = async (nextStatus) => {
    setBusyStatus(nextStatus);
    try {
      await updateApplicationStatus(application.id, nextStatus);
    } catch (error) {
      Alert.alert(t('common.close'), t(error.key ?? 'error.generic'));
      setBusyStatus(null);
    }
  };

  const submitDetailer = async () => {
    setFormError('');
    if (!isEmail(email)) {
      setFormError(t('error.invalidEmail'));
      return;
    }
    if (!isStrongEnoughPassword(password)) {
      setFormError(t('error.weakPassword'));
      return;
    }
    setCreating(true);
    try {
      await createDetailer({
        name: application.name || email,
        email,
        phone: application.phone,
        password,
      });
      await updateApplicationStatus(application.id, APPLICATION_STATUS.APPROVED).catch(() => {});
      setShowForm(false);
      setPassword('');
      Alert.alert(t('common.close'), t('admin.detailerCreated'));
    } catch (error) {
      setFormError(t(error.key ?? 'error.generic'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.flex}>
          <AppText variant="subtitle">{application.name || t('admin.applicantNoName')}</AppText>
          <AppText variant="caption">
            {createdAt ? createdAt.toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US') : t('common.today')}
          </AppText>
        </View>
        <View style={[styles.statusPill, status === APPLICATION_STATUS.APPROVED && styles.statusApproved, status === APPLICATION_STATUS.REJECTED && styles.statusRejected]}>
          <AppText variant="caption" color={colors.textOnPrimary}>
            {t(`admin.applicationStatus.${status}`)}
          </AppText>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
        <AppText variant="body">{application.email || '—'}</AppText>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="call-outline" size={16} color={colors.textMuted} />
        <AppText variant="body">{application.phone || '—'}</AppText>
      </View>
      {isClientApp ? (
        <View style={styles.clientTag}>
          <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
          <AppText variant="caption" color={colors.primary}>{t('admin.clientWantsToWork')}</AppText>
        </View>
      ) : null}
      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={16} color={colors.textMuted} />
        <AppText variant="body">{application.address || '—'}</AppText>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="map-outline" size={16} color={colors.textMuted} />
        <AppText variant="body">{application.zone || '—'}</AppText>
      </View>

      <View style={styles.booleanGrid}>
        <BooleanRow icon="car-outline" label={t('admin.applicantHasCar')} value={application.hasTransport} />
        <BooleanRow icon="construct-outline" label={t('admin.applicantHasEquipment')} value={application.hasEquipment} />
      </View>

      {application.comment ? (
        <View style={styles.commentBox}>
          <AppText variant="caption">{t('apply.comment')}</AppText>
          <AppText variant="body">{application.comment}</AppText>
        </View>
      ) : null}

      {isPending ? (
        <View style={styles.actions}>
          <Button
            title={t('admin.reject')}
            variant="secondary"
            onPress={() => setStatus(APPLICATION_STATUS.REJECTED)}
            loading={busyStatus === APPLICATION_STATUS.REJECTED}
            disabled={!!busyStatus}
            style={styles.actionBtn}
          />
          {/* Para clientes, "Aprobar y activar como detailer" (abajo) es el
              aprobar real; el aprobar genérico solo marcaría el estado. */}
          {!isClientApp ? (
            <Button
              title={t('admin.approve')}
              variant="success"
              onPress={() => setStatus(APPLICATION_STATUS.APPROVED)}
              loading={busyStatus === APPLICATION_STATUS.APPROVED}
              disabled={!!busyStatus}
              style={styles.actionBtn}
            />
          ) : null}
        </View>
      ) : null}

      {status !== APPLICATION_STATUS.REJECTED ? (
        isClientApp ? (
          <Button
            title={t('admin.activateDetailer')}
            variant="success"
            onPress={promote}
            loading={promoting}
            style={styles.createBtn}
          />
        ) : (
          <Button
            title={t('admin.createDetailer')}
            onPress={() => {
              setFormError('');
              setEmail(application.email ?? '');
              setPassword('');
              setShowForm(true);
            }}
            style={styles.createBtn}
          />
        )
      ) : null}

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <AppText variant="subtitle">{t('admin.createDetailerTitle')}</AppText>
              <Ionicons name="close" size={22} color={colors.textMuted} onPress={() => setShowForm(false)} />
            </View>
            <AppText variant="caption" style={styles.modalHint}>
              {t('admin.createDetailerHint')}
            </AppText>

            <AppText variant="body" style={styles.detailerName}>
              {application.name || t('admin.applicantNoName')}
            </AppText>

            <Input
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Input
              label={t('admin.detailerPassword')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {formError ? (
              <AppText variant="caption" color={colors.danger} style={styles.modalError}>
                {formError}
              </AppText>
            ) : null}

            <Button
              title={t('admin.createAccount')}
              onPress={submitDetailer}
              loading={creating}
              style={styles.modalBtn}
            />
          </View>
        </View>
      </Modal>
    </Card>
  );
}

export default function AdminApplications() {
  const { t } = useI18n();
  const { data, loading, error } = useSubscription(
    (onData, onError) => subscribeApplications(onData, onError),
    []
  );

  return (
    <Screen scroll padded={false}>
      <View style={styles.headerWrap}>
        <Header title={t('admin.applicationsTitle')} />
      </View>

      <View style={styles.body}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon="📝" title={t('admin.applicationsEmpty')} />
        ) : (
          data.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))
        )}
      </View>
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
  clientTag: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  booleanGrid: { gap: spacing.xs, marginTop: spacing.xs },
  commentBox: {
    gap: spacing.xs,
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  actionBtn: { flex: 1 },
  createBtn: { marginTop: spacing.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalHint: { marginBottom: spacing.sm },
  detailerName: { marginBottom: spacing.xs },
  modalError: { marginTop: spacing.xs },
  modalBtn: { marginTop: spacing.md },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  statusApproved: { backgroundColor: colors.success },
  statusRejected: { backgroundColor: colors.danger },
});
