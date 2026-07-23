import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Image, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Screen, AppText, Input, Button } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import { login } from '@/services/authService';
import { BUSINESS } from '@/config/business';
import { isEmail, isNonEmpty } from '@/utils/validation';
import { colors, spacing, radius, shadow, fontSize, fontWeight } from '@/constants/theme';

export default function LoginScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { disabledNotice, clearDisabledNotice } = useAuth();
  const signInWithGoogle = useGoogleSignIn();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [remember, setRemember] = useState(true);

  // Prellenar con las credenciales guardadas (si el usuario marcó "recordar").
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('savedLogin');
        if (saved) {
          const { email: e, password: p } = JSON.parse(saved);
          if (e) setEmail(e);
          if (p) setPassword(p);
          setRemember(true);
        }
      } catch {
        // sin credenciales guardadas
      }
    })();
  }, []);

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
      // Guardar o borrar las credenciales según "recordar contraseña".
      try {
        if (remember) {
          await AsyncStorage.setItem('savedLogin', JSON.stringify({ email, password }));
        } else {
          await AsyncStorage.removeItem('savedLogin');
        }
      } catch {
        // no bloquear el login si falla el guardado
      }
      // Navigation is handled by the root navigator once auth state updates.
    } catch (err) {
      setFormError(t(err.key ?? 'error.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleSubmit = async () => {
    setFormError('');
    clearDisabledNotice();
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
      // Navigation is handled by the root navigator once auth state updates.
    } catch (err) {
      setFormError(t(err.key ?? 'error.generic'));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding contentContainerStyle={styles.content}>
      <Pressable
        onPress={() => Linking.openURL(BUSINESS.website)}
        hitSlop={8}
        style={styles.backToWeb}
        accessibilityRole="link"
        accessibilityLabel={t('auth.backToWeb')}
      >
        <AppText variant="label" color={colors.accent}>{`‹  ${t('auth.backToWeb')}`}</AppText>
      </Pressable>

      <View style={styles.brand}>
        <View style={styles.logoCard}>
          <Image source={require('../../assets/van.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.accentBar} />
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
        placeholder="Tu contraseña"
        secureTextEntry
      />

      <View style={styles.rememberRow}>
        <Pressable
          onPress={() => setRemember((v) => !v)}
          hitSlop={8}
          style={styles.remember}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: remember }}
          accessibilityLabel={t('auth.rememberMe')}
        >
          <Ionicons
            name={remember ? 'checkbox' : 'square-outline'}
            size={20}
            color={remember ? colors.primary : colors.textMuted}
          />
          <AppText variant="label" color={colors.textMuted}>{t('auth.rememberMe')}</AppText>
        </Pressable>
        <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8}>
          <AppText variant="label" color={colors.teal}>
            {t('auth.forgotPassword')}
          </AppText>
        </Pressable>
      </View>

      {formError ? (
        <AppText variant="label" color={colors.danger} center style={styles.formError}>
          {formError}
        </AppText>
      ) : null}

      <Button title={t('auth.loginCta')} onPress={onSubmit} loading={submitting} disabled={googleSubmitting} />

      <Pressable
        onPress={onGoogleSubmit}
        disabled={submitting || googleSubmitting}
        accessibilityRole="button"
        accessibilityLabel={t('auth.continueWithGoogle')}
        style={({ pressed }) => [
          styles.googleButton,
          pressed && !(submitting || googleSubmitting) && styles.googlePressed,
          (submitting || googleSubmitting) && styles.googleDisabled,
        ]}
      >
        {googleSubmitting ? (
          <ActivityIndicator color="#3C4043" />
        ) : (
          <>
            <Image
              source={require('../../assets/google-g.png')}
              style={styles.googleIcon}
              resizeMode="contain"
            />
            <AppText style={styles.googleText}>{t('auth.continueWithGoogle')}</AppText>
          </>
        )}
      </Pressable>

      <View style={styles.footerRow}>
        <AppText variant="body" muted>
          {t('auth.noAccount')}{' '}
        </AppText>
        <Pressable onPress={() => router.push('/(auth)/register')} hitSlop={8}>
          <AppText variant="label" color={colors.accent}>
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
  backToWeb: { alignSelf: 'flex-start', marginBottom: spacing.lg },
  brand: { alignItems: 'center', marginBottom: spacing.xxl },
  logoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(251, 146, 60, 0.5)', // toque de naranja
    ...shadow.card,
    shadowColor: colors.accent, // glow cálido naranja
  },
  logo: { width: 240, height: 132 },
  accentBar: {
    width: 46,
    height: 4,
    borderRadius: radius.pill ?? 999,
    backgroundColor: colors.accent,
    marginBottom: spacing.md,
  },
  subtitle: { marginTop: spacing.xs },
  banner: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  remember: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  formError: { marginBottom: spacing.md },
  googleButton: {
    marginTop: spacing.md,
    height: 54,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#DADCE0',
  },
  googlePressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  googleDisabled: { opacity: 0.5 },
  googleIcon: { width: 20, height: 20 },
  googleText: { color: '#3C4043', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  viewServices: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  workHere: { marginTop: spacing.lg },
});
