import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Header, AppText, Input, Button } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import { registerClient } from '@/services/authService';
import { isEmail, isNonEmpty, isPhone, isStrongEnoughPassword } from '@/utils/validation';
import { colors, spacing } from '@/constants/theme';

export default function RegisterScreen() {
  const { t } = useI18n();
  const signInWithGoogle = useGoogleSignIn();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const next = {};
    if (!isNonEmpty(form.name)) next.name = t('common.required');
    if (!isEmail(form.email)) next.email = t('error.invalidEmail');
    if (!isPhone(form.phone)) next.phone = t('common.required');
    if (!isStrongEnoughPassword(form.password)) next.password = t('error.weakPassword');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    setFormError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await registerClient(form);
      // Root navigator routes to the client home once the profile is created.
    } catch (err) {
      setFormError(t(err.key ?? 'error.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleSubmit = async () => {
    setFormError('');
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
      // Root navigator routes to the client home once the profile is created.
    } catch (err) {
      setFormError(t(err.key ?? 'error.generic'));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding padded={false}>
      <View style={styles.headerWrap}>
        <Header title={t('auth.register')} showBack />
      </View>
      <View style={styles.body}>
        <Input
          label={t('auth.name')}
          value={form.name}
          onChangeText={set('name')}
          error={errors.name}
          autoCapitalize="words"
        />
        <Input
          label={t('auth.email')}
          value={form.email}
          onChangeText={set('email')}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label={t('auth.phone')}
          value={form.phone}
          onChangeText={set('phone')}
          error={errors.phone}
          keyboardType="phone-pad"
        />
        <Input
          label={t('auth.password')}
          value={form.password}
          onChangeText={set('password')}
          error={errors.password}
          secureTextEntry
          hint={t('error.weakPassword')}
        />

        {formError ? (
          <AppText variant="label" color={colors.danger} center style={styles.formError}>
            {formError}
          </AppText>
        ) : null}

        <Button
          title={t('auth.registerCta')}
          onPress={onSubmit}
          loading={submitting}
          disabled={googleSubmitting}
        />
        <Button
          title={t('auth.continueWithGoogle')}
          onPress={onGoogleSubmit}
          loading={googleSubmitting}
          disabled={submitting}
          variant="secondary"
          leftIcon={<Ionicons name="logo-google" size={18} color={colors.primary} />}
          style={styles.googleButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  formError: { marginBottom: spacing.md },
  googleButton: { marginTop: spacing.md },
});
