import { useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { Screen, Header, AppText, Input, Button, SegmentedControl } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { submitApplication } from '@/services/applicationService';
import { isEmail, isNonEmpty, isPhone } from '@/utils/validation';
import { colors, spacing } from '@/constants/theme';

export default function ApplyScreen() {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    zone: '',
    experienceYears: '',
    hasTransport: true,
    hasEquipment: false,
    comment: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const yesNo = [
    { value: true, label: t('common.yes') },
    { value: false, label: t('common.no') },
  ];

  const validate = () => {
    const next = {};
    if (!isNonEmpty(form.name)) next.name = t('common.required');
    if (!isEmail(form.email)) next.email = t('error.invalidEmail');
    if (!isPhone(form.phone)) next.phone = t('common.required');
    if (!isNonEmpty(form.zone)) next.zone = t('common.required');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    setFormError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await submitApplication(form);
      setDone(true);
    } catch (err) {
      setFormError(t(err.key ?? 'error.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Screen padded={false}>
        <View style={styles.headerWrap}>
          <Header title={t('apply.title')} showBack />
        </View>
        <View style={styles.successBody}>
          <AppText style={styles.emoji}>✅</AppText>
          <AppText variant="title" center>
            {t('apply.successTitle')}
          </AppText>
          <AppText variant="body" muted center style={styles.successMsg}>
            {t('apply.successBody')}
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAvoiding padded={false}>
      <View style={styles.headerWrap}>
        <Header title={t('apply.title')} showBack />
      </View>
      <View style={styles.body}>
        <AppText variant="body" muted style={styles.intro}>
          {t('apply.intro')}
        </AppText>

        <Input label={t('auth.name')} value={form.name} onChangeText={set('name')} error={errors.name} autoCapitalize="words" />
        <Input label={t('auth.email')} value={form.email} onChangeText={set('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
        <Input label={t('auth.phone')} value={form.phone} onChangeText={set('phone')} error={errors.phone} keyboardType="phone-pad" />
        <Input label={t('apply.zone')} value={form.zone} onChangeText={set('zone')} error={errors.zone} />
        <Input
          label={t('apply.experienceYears')}
          value={form.experienceYears}
          onChangeText={set('experienceYears')}
          keyboardType="number-pad"
        />

        <AppText variant="label" style={styles.qLabel}>
          {t('apply.hasTransport')}
        </AppText>
        <SegmentedControl options={yesNo} value={form.hasTransport} onChange={set('hasTransport')} style={styles.seg} />

        <AppText variant="label" style={styles.qLabel}>
          {t('apply.hasEquipment')}
        </AppText>
        <SegmentedControl options={yesNo} value={form.hasEquipment} onChange={set('hasEquipment')} style={styles.seg} />

        <Input
          label={`${t('apply.comment')} (${t('common.optional')})`}
          value={form.comment}
          onChangeText={set('comment')}
          multiline
        />

        {formError ? (
          <AppText variant="label" color={colors.danger} center style={styles.formError}>
            {formError}
          </AppText>
        ) : null}

        <Button title={t('apply.submit')} onPress={onSubmit} loading={submitting} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  intro: { marginBottom: spacing.lg },
  qLabel: { marginBottom: spacing.sm },
  seg: { marginBottom: spacing.lg },
  formError: { marginBottom: spacing.md },
  successBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emoji: { fontSize: 56, marginBottom: spacing.lg },
  successMsg: { marginTop: spacing.md },
});
