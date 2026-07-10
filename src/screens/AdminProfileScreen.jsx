/**
 * Admin profile: identity, language switch and sign out.
 *
 * Kept separate from the client profile because the admin has no personal
 * vehicles/addresses to manage — this screen only shows account info and the
 * app-wide settings shared by every role.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Header, AppText, Card, Button, SegmentedControl } from '@/components/ui';
import { AvatarUpload } from '@/components/AvatarUpload';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { confirmAction } from '@/utils/confirm';
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

export default function AdminProfileScreen() {
  const { t, lang, setLang } = useI18n();
  const { user, profile, signOut } = useAuth();

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
            <InfoRow icon="shield-checkmark-outline" value={t('roleTab.dashboard')} />
            <InfoRow icon="mail-outline" value={profile?.email} />
            <InfoRow icon="call-outline" value={profile?.phone} />
          </View>
        </Card>

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

        <Button
          title={t('auth.signOut')}
          variant="secondary"
          onPress={confirmSignOut}
          style={styles.signOut}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
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
  sectionLabel: { marginTop: spacing.lg },
  signOut: { marginTop: spacing.lg },
});
