import { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Header, AppText, Card, Input, Button, LoadingState, EmptyState, ErrorState } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { useSubscription } from '@/hooks/useSubscription';
import {
  subscribeAllServices,
  createService,
  updateService,
  setServiceActive,
  deleteService,
} from '@/services/serviceService';
import {
  subscribeAllExtras,
  createExtra,
  updateExtra,
  setExtraActive,
  deleteExtra,
} from '@/services/extrasService';
import { BUSINESS_FEE, MIN_SERVICE_TOTAL } from '@/constants/payments';
import { isNonEmpty, isPositiveNumber } from '@/utils/validation';
import { confirmAction } from '@/utils/confirm';
import { formatMoney } from '@/utils/money';
import { colors, spacing, radius } from '@/constants/theme';

const emptyForm = {
  name: '',
  description: '',
  basePrice: '',
  durationMinutes: '',
  includesText: '',
  surchargeSuv: '',
  surchargeTruck: '',
  active: true,
};

const toForm = (service) => ({
  name: service.name ?? '',
  description: service.description ?? '',
  basePrice: String(service.basePrice ?? ''),
  durationMinutes: String(service.durationMinutes ?? ''),
  includesText: (service.includes ?? []).join('\n'),
  surchargeSuv: String(service.surcharges?.suv ?? ''),
  surchargeTruck: String(service.surcharges?.truck ?? ''),
  active: service.active !== false,
});

function ServiceFormModal({ visible, initial, order, onClose }) {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [hydratedFor, setHydratedFor] = useState(null);

  // Sync form when the modal opens for a new target (edit vs create).
  const targetId = initial?.id ?? 'new';
  if (visible && hydratedFor !== targetId) {
    setForm(initial ? toForm(initial) : emptyForm);
    setErrors({});
    setFormError('');
    setHydratedFor(targetId);
  }
  if (!visible && hydratedFor !== null) setHydratedFor(null);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const next = {};
    if (!isNonEmpty(form.name)) next.name = t('common.required');
    if (!isPositiveNumber(form.basePrice)) next.basePrice = t('common.required');
    else if (Number(form.basePrice) < MIN_SERVICE_TOTAL)
      next.basePrice = t('admin.priceTooLow', { min: formatMoney(BUSINESS_FEE) });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSave = async () => {
    setFormError('');
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description,
      basePrice: form.basePrice,
      durationMinutes: form.durationMinutes,
      includes: form.includesText.split('\n'),
      surcharges: { suv: form.surchargeSuv, truck: form.surchargeTruck },
      active: form.active,
      order: initial?.order ?? order,
    };
    try {
      if (initial) await updateService(initial.id, payload);
      else await createService(payload);
      onClose();
    } catch (err) {
      setFormError(t(err.key ?? 'error.generic', { min: formatMoney(BUSINESS_FEE) }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <Screen scroll keyboardAvoiding padded={false} edges={['top']}>
        <View style={styles.headerWrap}>
          <Header
            title={initial ? t('common.edit') : t('vehicle.add')}
            showBack
            onBack={onClose}
          />
        </View>
        <View style={styles.body}>
          <Input label={t('admin.serviceName')} value={form.name} onChangeText={set('name')} error={errors.name} />
          <Input label={t('admin.serviceDesc')} value={form.description} onChangeText={set('description')} multiline />
          <Input
            label={t('admin.servicePrice')}
            value={form.basePrice}
            onChangeText={set('basePrice')}
            error={errors.basePrice}
            keyboardType="decimal-pad"
            hint={t('admin.priceTooLow', { min: formatMoney(BUSINESS_FEE) })}
          />
          <Input
            label={t('admin.serviceDuration')}
            value={form.durationMinutes}
            onChangeText={set('durationMinutes')}
            keyboardType="number-pad"
          />
          <Input
            label={t('admin.serviceIncludes')}
            value={form.includesText}
            onChangeText={set('includesText')}
            multiline
          />
          <View style={styles.row}>
            <Input
              label={t('admin.surchargeSuv')}
              value={form.surchargeSuv}
              onChangeText={set('surchargeSuv')}
              keyboardType="decimal-pad"
              style={styles.rowItem}
            />
            <Input
              label={t('admin.surchargeTruck')}
              value={form.surchargeTruck}
              onChangeText={set('surchargeTruck')}
              keyboardType="decimal-pad"
              style={styles.rowItem}
            />
          </View>
          <View style={styles.activeRow}>
            <AppText variant="label">{t('admin.active')}</AppText>
            <Switch
              value={form.active}
              onValueChange={set('active')}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>

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

function ServiceRow({ service, onEdit }) {
  const { t } = useI18n();

  const toggle = async (next) => {
    try {
      await setServiceActive(service.id, next);
    } catch (err) {
      Alert.alert(t('common.close'), t(err.key ?? 'error.generic'));
    }
  };

  const confirmDelete = async () => {
    const ok = await confirmAction({
      title: t('common.delete'),
      message: service.name,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteService(service.id);
    } catch (err) {
      Alert.alert(t('common.close'), t(err.key ?? 'error.generic'));
    }
  };

  return (
    <Card style={styles.serviceCard}>
      <View style={styles.serviceHead}>
        <View style={styles.flex}>
          <AppText variant="subtitle">{service.name}</AppText>
          <AppText variant="caption">
            {formatMoney(service.basePrice)} · {service.durationMinutes || 0} min
          </AppText>
        </View>
        <Switch
          value={service.active !== false}
          onValueChange={toggle}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.surface}
        />
      </View>
      <View style={styles.serviceActions}>
        <Pressable onPress={() => onEdit(service)} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
          <AppText variant="label" color={colors.primary}>{t('common.edit')}</AppText>
        </Pressable>
        <Pressable onPress={confirmDelete} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <AppText variant="label" color={colors.danger}>{t('common.delete')}</AppText>
        </Pressable>
      </View>
    </Card>
  );
}

const emptyExtra = { name: '', description: '', active: true };

function ExtraFormModal({ visible, initial, order, onClose }) {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyExtra);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [hydratedFor, setHydratedFor] = useState(null);

  const targetId = initial?.id ?? 'new';
  if (visible && hydratedFor !== targetId) {
    setForm(initial ? { ...emptyExtra, ...initial } : emptyExtra);
    setError('');
    setFormError('');
    setHydratedFor(targetId);
  }
  if (!visible && hydratedFor !== null) setHydratedFor(null);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const onSave = async () => {
    setFormError('');
    if (!isNonEmpty(form.name)) {
      setError(t('common.required'));
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, order: initial?.order ?? order };
      if (initial) await updateExtra(initial.id, payload);
      else await createExtra(payload);
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
          <Header title={initial ? t('common.edit') : t('extras.add')} showBack onBack={onClose} />
        </View>
        <View style={styles.body}>
          <Input label={t('extras.name')} value={form.name} onChangeText={set('name')} error={error} />
          <Input label={t('extras.description')} value={form.description} onChangeText={set('description')} multiline />
          <View style={styles.activeRow}>
            <AppText variant="label">{t('admin.active')}</AppText>
            <Switch
              value={form.active}
              onValueChange={set('active')}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
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

function ExtraRow({ extra, onEdit }) {
  const { t } = useI18n();

  const toggle = async (next) => {
    try {
      await setExtraActive(extra.id, next);
    } catch (err) {
      Alert.alert(t('common.close'), t(err.key ?? 'error.generic'));
    }
  };

  const confirmDelete = async () => {
    const ok = await confirmAction({
      title: t('common.delete'),
      message: extra.name,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteExtra(extra.id);
    } catch (err) {
      Alert.alert(t('common.close'), t(err.key ?? 'error.generic'));
    }
  };

  return (
    <Card style={styles.serviceCard}>
      <View style={styles.serviceHead}>
        <View style={styles.flex}>
          <AppText variant="subtitle">{extra.name}</AppText>
          <AppText variant="caption">{t('extras.badge')}</AppText>
        </View>
        <Switch
          value={extra.active !== false}
          onValueChange={toggle}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.surface}
        />
      </View>
      <View style={styles.serviceActions}>
        <Pressable onPress={() => onEdit(extra)} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
          <AppText variant="label" color={colors.primary}>{t('common.edit')}</AppText>
        </Pressable>
        <Pressable onPress={confirmDelete} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <AppText variant="label" color={colors.danger}>{t('common.delete')}</AppText>
        </Pressable>
      </View>
    </Card>
  );
}

export default function AdminServices() {
  const { t } = useI18n();
  const { data, loading, error } = useSubscription(
    (onData, onError) => subscribeAllServices(onData, onError),
    []
  );
  const extrasSub = useSubscription((onData, onError) => subscribeAllExtras(onData, onError), []);
  const [modal, setModal] = useState({ open: false, service: null });
  const [extraModal, setExtraModal] = useState({ open: false, extra: null });

  const openCreate = () => setModal({ open: true, service: null });
  const openEdit = (service) => setModal({ open: true, service });
  const close = () => setModal({ open: false, service: null });

  const openCreateExtra = () => setExtraModal({ open: true, extra: null });
  const openEditExtra = (extra) => setExtraModal({ open: true, extra });
  const closeExtra = () => setExtraModal({ open: false, extra: null });

  const list = data ?? [];
  const extrasList = extrasSub.data ?? [];

  return (
    <Screen scroll padded={false}>
      <View style={styles.headerWrap}>
        <Header
          title={t('admin.servicesTitle')}
          right={
            <Pressable onPress={openCreate} hitSlop={10}>
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </Pressable>
          }
        />
      </View>

      <View style={styles.body}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : list.length === 0 ? (
          <EmptyState
            icon="🧼"
            title={t('common.emptyList')}
            action={<Button title={t('vehicle.add')} onPress={openCreate} fullWidth={false} />}
          />
        ) : (
          list.map((service) => <ServiceRow key={service.id} service={service} onEdit={openEdit} />)
        )}

        <View style={styles.sectionHead}>
          <View style={styles.flex}>
            <AppText variant="heading">{t('extras.title')}</AppText>
            <AppText variant="caption">{t('extras.tagline')}</AppText>
          </View>
          <Pressable onPress={openCreateExtra} hitSlop={10}>
            <Ionicons name="add-circle" size={28} color={colors.primary} />
          </Pressable>
        </View>

        {extrasSub.loading ? (
          <LoadingState />
        ) : extrasList.length === 0 ? (
          <EmptyState
            icon="✨"
            title={t('common.emptyList')}
            action={<Button title={t('extras.add')} onPress={openCreateExtra} fullWidth={false} />}
          />
        ) : (
          extrasList.map((extra) => <ExtraRow key={extra.id} extra={extra} onEdit={openEditExtra} />)
        )}
      </View>

      <ServiceFormModal
        visible={modal.open}
        initial={modal.service}
        order={list.length}
        onClose={close}
      />
      <ExtraFormModal
        visible={extraModal.open}
        initial={extraModal.extra}
        order={extrasList.length}
        onClose={closeExtra}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.md },
  rowItem: { flex: 1 },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  formError: { marginBottom: spacing.md },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  serviceCard: { gap: spacing.sm },
  serviceHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  serviceActions: {
    flexDirection: 'row',
    gap: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  iconBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
