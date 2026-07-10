import { useState } from 'react';
import { View, Image, StyleSheet, Modal, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Header, AppText, Card, Input, Button, SegmentedControl, LoadingState, EmptyState, ErrorState } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import {
  subscribeVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  VEHICLE_TYPE,
} from '@/services/vehicleService';
import { uploadImageAsync } from '@/services/storageService';
import { pickImage } from '@/utils/media';
import { confirmAction } from '@/utils/confirm';
import { isNonEmpty } from '@/utils/validation';
import { colors, spacing, radius } from '@/constants/theme';

const emptyForm = { make: '', model: '', year: '', color: '', plate: '', type: VEHICLE_TYPE.SEDAN, photoUrl: null };

function VehicleFormModal({ visible, initial, uid, onClose }) {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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

  const pickVehiclePhoto = async () => {
    const result = await pickImage({ fromCamera: false });
    if (result.status === 'denied') {
      Alert.alert(t('common.close'), t('error.permissionDenied'));
      return;
    }
    if (result.status !== 'ok') return;
    setUploadingPhoto(true);
    try {
      const url = await uploadImageAsync(result.uri, `vehicles/${uid}/${Date.now()}.jpg`);
      setForm((f) => ({ ...f, photoUrl: url }));
    } catch (err) {
      setFormError(t(err.key ?? 'error.generic'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const typeOptions = [
    { value: VEHICLE_TYPE.SEDAN, label: t('vehicle.typeSedan') },
    { value: VEHICLE_TYPE.SUV, label: t('vehicle.typeSuv') },
    { value: VEHICLE_TYPE.TRUCK, label: t('vehicle.typeTruck') },
  ];

  const validate = () => {
    const next = {};
    if (!isNonEmpty(form.make)) next.make = t('common.required');
    if (!isNonEmpty(form.model)) next.model = t('common.required');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSave = async () => {
    setFormError('');
    if (!validate()) return;
    setSaving(true);
    try {
      if (initial) await updateVehicle(uid, initial.id, form);
      else await addVehicle(uid, form);
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
          <Header title={initial ? t('common.edit') : t('vehicle.add')} showBack onBack={onClose} />
        </View>
        <View style={styles.body}>
          <Input label={t('vehicle.make')} value={form.make} onChangeText={set('make')} error={errors.make} autoCapitalize="words" />
          <Input label={t('vehicle.model')} value={form.model} onChangeText={set('model')} error={errors.model} autoCapitalize="words" />
          <View style={styles.row}>
            <Input label={t('vehicle.year')} value={form.year} onChangeText={set('year')} keyboardType="number-pad" style={styles.rowItem} />
            <Input label={t('vehicle.color')} value={form.color} onChangeText={set('color')} style={styles.rowItem} />
          </View>
          <Input label={`${t('vehicle.plate')} (${t('common.optional')})`} value={form.plate} onChangeText={set('plate')} autoCapitalize="characters" />

          <AppText variant="label" style={styles.typeLabel}>
            {t('vehicle.type')}
          </AppText>
          <SegmentedControl options={typeOptions} value={form.type} onChange={set('type')} style={styles.seg} />

          <AppText variant="label" style={styles.typeLabel}>
            {t('vehicle.photo')}
          </AppText>
          <Pressable onPress={pickVehiclePhoto} disabled={uploadingPhoto} style={styles.photoBox}>
            {form.photoUrl ? (
              <Image source={{ uri: form.photoUrl }} style={styles.photoPreview} resizeMode="cover" />
            ) : (
              <View style={styles.photoInner}>
                {uploadingPhoto ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={26} color={colors.primary} />
                    <AppText variant="label" color={colors.primary}>{t('vehicle.addPhoto')}</AppText>
                  </>
                )}
              </View>
            )}
          </Pressable>
          {form.photoUrl && !uploadingPhoto ? (
            <Pressable onPress={pickVehiclePhoto} hitSlop={8} style={styles.changePhoto}>
              <AppText variant="caption" color={colors.primary}>{t('vehicle.changePhoto')}</AppText>
            </Pressable>
          ) : null}

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

export function vehicleLabel(v) {
  return [v.make, v.model, v.year].filter(Boolean).join(' ');
}

function VehicleRow({ vehicle, uid, onEdit }) {
  const { t } = useI18n();
  const typeLabel = {
    [VEHICLE_TYPE.SEDAN]: t('vehicle.typeSedan'),
    [VEHICLE_TYPE.SUV]: t('vehicle.typeSuv'),
    [VEHICLE_TYPE.TRUCK]: t('vehicle.typeTruck'),
  }[vehicle.type];

  const confirmDelete = async () => {
    const ok = await confirmAction({
      title: t('vehicle.deleteConfirm'),
      message: vehicleLabel(vehicle),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteVehicle(uid, vehicle.id);
    } catch (err) {
      Alert.alert(t('common.close'), t(err.key ?? 'error.generic'));
    }
  };

  return (
    <Card style={styles.itemCard}>
      <View style={styles.itemHead}>
        {vehicle.photoUrl ? (
          <Image source={{ uri: vehicle.photoUrl }} style={styles.vehiclePhoto} resizeMode="cover" />
        ) : (
          <View style={styles.itemIcon}>
            <Ionicons name="car-sport-outline" size={22} color={colors.primary} />
          </View>
        )}
        <View style={styles.flex}>
          <AppText variant="subtitle">{vehicleLabel(vehicle)}</AppText>
          <AppText variant="caption">
            {typeLabel}
            {vehicle.color ? ` · ${vehicle.color}` : ''}
          </AppText>
        </View>
      </View>
      <View style={styles.itemActions}>
        <Pressable onPress={() => onEdit(vehicle)} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </Pressable>
        <Pressable onPress={confirmDelete} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>
    </Card>
  );
}

export default function ClientVehicles() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data, loading, error } = useSubscription(
    (onData, onError) => subscribeVehicles(user.uid, onData, onError),
    [user.uid]
  );
  const [modal, setModal] = useState({ open: false, vehicle: null });

  const list = data ?? [];

  return (
    <Screen scroll padded={false}>
      <View style={styles.headerWrap}>
        <Header
          title={t('client.myVehicles')}
          showBack
          right={
            <Pressable onPress={() => setModal({ open: true, vehicle: null })} hitSlop={10}>
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
            icon="🚙"
            title={t('common.emptyList')}
            action={<Button title={t('vehicle.add')} onPress={() => setModal({ open: true, vehicle: null })} fullWidth={false} />}
          />
        ) : (
          list.map((v) => <VehicleRow key={v.id} vehicle={v} uid={user.uid} onEdit={(veh) => setModal({ open: true, vehicle: veh })} />)
        )}
      </View>

      <VehicleFormModal
        visible={modal.open}
        initial={modal.vehicle}
        uid={user.uid}
        onClose={() => setModal({ open: false, vehicle: null })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.md },
  rowItem: { flex: 1 },
  typeLabel: { marginBottom: spacing.sm },
  seg: { marginBottom: spacing.lg },
  photoBox: {
    minHeight: 140,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  photoInner: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  photoPreview: { width: '100%', height: 180 },
  changePhoto: { alignSelf: 'center', paddingVertical: spacing.sm, marginBottom: spacing.sm },
  formError: { marginBottom: spacing.md },
  vehiclePhoto: { width: 44, height: 44, borderRadius: 10 },
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
