import { useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { Screen, Header, AppText, Input, Button } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { resetPassword } from '@/services/authService';
import { isEmail } from '@/utils/validation';
import { colors, spacing } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setFormError('');
    if (!isEmail(email)) {
      setError(t('error.invalidEmail'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setFormError(t(err.key ?? 'error.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding padded={false}>
      <View style={styles.headerWrap}>
        <Header title={t('auth.resetTitle')} showBack />
      </View>
      <View style={styles.body}>
        <AppText variant="body" muted style={styles.hint}>
          {t('auth.resetHint')}
        </AppText>

        {sent ? (
          <View style={styles.success}>
            <AppText variant="label" color={colors.success}>
              {t('auth.resetSent')}
            </AppText>
          </View>
        ) : (
          <>
            <Input
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              error={error}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {formError ? (
              <AppText variant="label" color={colors.danger} center style={styles.formError}>
                {formError}
              </AppText>
            ) : null}
            <Button title={t('auth.resetTitle')} onPress={onSubmit} loading={submitting} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  hint: { marginBottom: spacing.xl },
  formError: { marginBottom: spacing.md },
  success: {
    backgroundColor: colors.successLight,
    borderRadius: 12,
    padding: spacing.lg,
  },
});
