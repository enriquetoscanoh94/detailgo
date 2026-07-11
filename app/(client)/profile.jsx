import { Linking, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen, Header, AppText, Card, Button, SegmentedControl } from '@/components/ui';
import { AvatarUpload } from '@/components/AvatarUpload';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { confirmAction } from '@/utils/confirm';
import { BUSINESS } from '@/config/business';
import { colors, spacing } from '@/constants/theme';

function InfoRow({ icon, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

function LinkRow({ icon, label, onPress }) {
  return (
    <Card onPress={onPress} style={styles.linkRow}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <AppText variant="label" style={styles.flex}>
        {label}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Card>
  );
}

export default function ClientProfile() {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const openDeleteAccount = () => {
    Linking.openURL(`${BUSINESS.website}/delete-account.html`);
  };

  const confirmSignOut = async () => {
    if (
      await confirmAction({
        title: t('auth.signOut'),
        confirmText: t('auth.signOut'),
        cancelText: t('common.cancel'),
        destructive: true,
      })
    ) {
      signOut();
    }
  };

  return (
    <Screen scroll padded={false}>
      <View style={styles.headerWrap}>
        <Header title={t('roleTab.profile')} />
      </View>

      <View style={styles.body}>
        <Card style={styles.identity}>
          <AvatarUpload uid={user.uid} name={profile?.name} photoUrl={profile?.photoUrl} size={80} />
          <AppText variant="subtitle">{profile?.name}</AppText>
          <View style={styles.info}>
            <InfoRow icon="mail-outline" value={profile?.email} />
            <InfoRow icon="call-outline" value={profile?.phone} />
          </View>
        </Card>

        <LinkRow icon="car-outline" label={t('client.myVehicles')} onPress={() => router.push('/(client)/vehicles')} />
        <LinkRow icon="location-outline" label={t('client.myAddresses')} onPress={() => router.push('/(client)/addresses')} />
        <LinkRow icon="trash-outline" label={t('account.deleteRequest')} onPress={openDeleteAccount} />

        <AppText variant="label" style={styles.sectionLabel}>
          Idioma / Language
        </AppText>
        <SegmentedControl
          options={[
            { value: 'es', label: 'Español' },
            { value: 'en', label: 'English' },
          ]}
          value={lang}
          onChange={setLang}
        />

        <Button title={t('auth.signOut')} variant="secondary" onPress={confirmSignOut} style={styles.signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  flex: { flex: 1 },
  identity: { alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.textOnPrimary, fontSize: 30, fontWeight: '700' },
  info: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionLabel: { marginTop: spacing.lg },
  signOut: { marginTop: spacing.lg },
});
