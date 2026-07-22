import { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Header, AppText, Card, Input, Button, LoadingState, EmptyState, ErrorState } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import {
  subscribeAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from '@/services/addressService';
import { BUSINESS } from '@/config/business';
import { isNonEmpty } from '@/utils/validation';
import { isValidZip, isZipCovered } from '@/constants/serviceArea';
import { confirmAction } from '@/utils/confirm';
import { colors, spacing } from '@/constants/theme';

const emptyForm = { alias: '', fullAddress: '', city: '', zip: '', notes: '' };

function AddressFormModal({ visible, initial, uid, onClose }) {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [hydratedFor, setHydratedFor] = useState(null);

  const targetId = initial?.id ?? 'new';
  if (visible && hydratedFor !== targetId) {
    setForm(initial ? { ...emptyForm, ...initial } : emptyForm);
    setErrors({});
    setFormError('');
    setHydratedFor(targetId);
  }
  if (!visible && hydratedFor !== null) setHydratedFor(null);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const next = {};
    if (!isNonEmpty(form.alias)) next.alias = t('common.required');
    if (!isNonEmpty(form.fullAddress)) next.fullAddress = t('common.required');
    if (!isNonEmpty(form.city)) next.city = t('common.required');
    if (!isNonEmpty(form.zip)) next.zip = t('common.required');
    else if (!isValidZip(form.zip)) next.zip = t('address.zipInvalid');
    else if (!isZipCovered(form.zip)) next.zip = t('address.outOfZoneZip', { zip: form.zip.trim() });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSave = async () => {
    setFormError('');
    if (!validate()) return;
    setSaving(true);
    try {
      if (initial) await updateAddress(uid, initial.id, form);
      else await addAddress(uid, form);
      onClose();
    } catch (err) {
      setFormError(t(err.key ?? 'error.generic'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <Screen scroll keyboardAvoiding padded={false} edges={['top']}>
        <View style={styles.headerWrap}>
          <Header title={initial ? t('common.edit') : t('address.add')} showBack onBack={onClose} />
        </View>
        <View style={styles.body}>
          <Input label={t('address.alias')} value={form.alias} onChangeText={set('alias')} error={errors.alias} />
          <Input label={t('address.full')} value={form.fullAddress} onChangeText={set('fullAddress')} error={errors.fullAddress} />
          <Input label={t('address.city')} value={form.city} onChangeText={set('city')} error={errors.city} />
          <Input
            label={t('address.zip')}
            value={form.zip}
            onChangeText={(v) => set('zip')(v.replace(/[^\d]/g, '').slice(0, 5))}
            error={errors.zip}
            hint={BUSINESS.serviceZone.label}
            keyboardType="number-pad"
            maxLength={5}
            placeholder="91355"
          />
          <Input label={t('address.notes')} value={form.notes} onChangeText={set('notes')} multiline />

          {formError ? (
            <AppText variant="label" color={colors.danger} center style={styles.formError}>
              {formError}
            </AppText>
          ) : null}

          <Button title={t('common.save')} onPress={onSave} loading={saving} />
        </View>
      </Screen>
    </Modal>
  );
}

function AddressRow({ address, uid, onEdit }) {
  const { t } = useI18n();
  const confirmDelete = async () => {
    const ok = await confirmAction({
      title: t('address.deleteConfirm'),
      message: address.alias,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteAddress(uid, address.id);
    } catch (err) {
      Alert.alert(t('common.close'), t(err.key ?? 'error.generic'));
    }
  };

  return (
    <Card style={styles.itemCard}>
      <View style={styles.itemHead}>
        <View style={styles.itemIcon}>
          <Ionicons name="location-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="subtitle">{address.alias}</AppText>
          <AppText variant="caption" numberOfLines={1}>
            {address.fullAddress}
            {address.zip ? ` · ${address.zip}` : ''}
          </AppText>
        </View>
      </View>
      <View style={styles.itemActions}>
        <Pressable onPress={() => onEdit(address)} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </Pressable>
        <Pressable onPress={confirmDelete} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>
    </Card>
  );
}

export default function ClientAddresses() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data, loading, error } = useSubscription(
    (onData, onError) => subscribeAddresses(user.uid, onData, onError),
    [user.uid]
  );
  const [modal, setModal] = useState({ open: false, address: null });
  const list = data ?? [];

  return (
    <Screen scroll padded={false}>
      <View style={styles.headerWrap}>
        <Header
          title={t('client.myAddresses')}
          showBack
          right={
            <Pressable onPress={() => setModal({ open: true, address: null })} hitSlop={10}>
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </Pressable>
          }
        />
      </View>
      <View style={styles.list}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : list.length === 0 ? (
          <EmptyState
            icon="📍"
            title={t('common.emptyList')}
            action={<Button title={t('address.add')} onPress={() => setModal({ open: true, address: null })} fullWidth={false} />}
          />
        ) : (
          list.map((a) => <AddressRow key={a.id} address={a} uid={user.uid} onEdit={(addr) => setModal({ open: true, address: addr })} />)
        )}
      </View>

      <AddressFormModal
        visible={modal.open}
        initial={modal.address}
        uid={user.uid}
        onClose={() => setModal({ open: false, address: null })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  flex: { flex: 1 },
  formError: { marginBottom: spacing.md },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActions: { flexDirection: 'row', gap: spacing.md },
  iconBtn: { padding: 4 },
});
