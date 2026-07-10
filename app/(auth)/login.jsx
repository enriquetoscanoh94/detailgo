import { useState } from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen, AppText, Input, Button } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { login } from '@/services/authService';
import { isEmail, isNonEmpty } from '@/utils/validation';
import { colors, spacing, radius, shadow } from '@/constants/theme';

export default function LoginScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { disabledNotice, clearDisabledNotice } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next = {};
    if (!isEmail(email)) next.email = t('error.invalidEmail');
    if (!isNonEmpty(password)) next.password = t('common.required');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    setFormError('');
    clearDisabledNotice();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await login(email, password);
      // Navigation is handled by the root navigator once auth state updates.
    } catch (err) {
      setFormError(t(err.key ?? 'error.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding contentContainerStyle={styles.content}>
      <View style={styles.brand}>
        <View style={styles.logoCard}>
          <Image source={require('../../assets/van.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <AppText variant="body" muted center style={styles.subtitle}>
          {t('auth.subtitle')}
        </AppText>
      </View>

      {disabledNotice ? (
        <View style={styles.banner}>
          <AppText variant="label" color={colors.danger}>
            {t('auth.accountDisabled')}
          </AppText>
        </View>
      ) : null}

      <Input
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder="tucorreo@ejemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        placeholder="••••••••"
        secureTextEntry
      />

      <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8} style={styles.forgot}>
        <AppText variant="label" color={colors.primary}>
          {t('auth.forgotPassword')}
        </AppText>
      </Pressable>

      {formError ? (
        <AppText variant="label" color={colors.danger} center style={styles.formError}>
          {formError}
        </AppText>
      ) : null}

      <Button title={t('auth.loginCta')} onPress={onSubmit} loading={submitting} />

      <View style={styles.footerRow}>
        <AppText variant="body" muted>
          {t('auth.noAccount')}{' '}
        </AppText>
        <Pressable onPress={() => router.push('/(auth)/register')} hitSlop={8}>
          <AppText variant="label" color={colors.primary}>
            {t('auth.register')}
          </AppText>
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/(auth)/catalog')} style={styles.viewServices} hitSlop={8}>
        <AppText variant="label" color={colors.primary} center>
          {t('auth.viewServices')}
        </AppText>
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/apply')} style={styles.workHere} hitSlop={8}>
        <AppText variant="label" color={colors.textMuted} center>
          {t('auth.workHere')}
        </AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', flexGrow: 1 },
  brand: { alignItems: 'center', marginBottom: spacing.xxl },
  logoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  logo: { width: 240, height: 132 },
  subtitle: { marginTop: spacing.xs },
  banner: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  forgot: { alignSelf: 'flex-end', marginBottom: spacing.lg },
  formError: { marginBottom: spacing.md },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  viewServices: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  workHere: { marginTop: spacing.lg },
});
