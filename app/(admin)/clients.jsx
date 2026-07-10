/**
 * Admin → "Clientes": a live list of every registered client.
 */

import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Header, AppText, Card, LoadingState, EmptyState } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { useSubscription } from '@/hooks/useSubscription';
import { subscribeClients } from '@/services/adminService';
import { colors, spacing } from '@/constants/theme';

export default function AdminClients() {
  const { t } = useI18n();
  const { data, loading } = useSubscription((d, e) => subscribeClients(d, e), []);
  const clients = [...(data ?? [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return (
    <Screen scroll padded={false}>
      <View style={styles.headerWrap}>
        <Header title={t('admin.clientsTitle', { count: clients.length })} showBack />
      </View>
      <View style={styles.body}>
        {loading ? (
          <LoadingState />
        ) : clients.length === 0 ? (
          <EmptyState icon="👥" title={t('admin.clientsEmpty')} />
        ) : (
          clients.map((c) => (
            <Card key={c.id} style={styles.card}>
              {c.photoUrl ? (
                <Image source={{ uri: c.photoUrl }} style={styles.avatarImg} resizeMode="cover" />
              ) : (
                <View style={styles.avatar}>
                  <AppText variant="subtitle" color={colors.primary}>
                    {(c.name || '?').charAt(0).toUpperCase()}
                  </AppText>
                </View>
              )}
              <View style={styles.flex}>
                <AppText variant="subtitle">{c.name || '—'}</AppText>
                <View style={styles.metaRow}>
                  <Ionicons name="mail-outline" size={14} color={colors.textMuted} />
                  <AppText variant="caption">{c.email || '—'}</AppText>
                </View>
                {c.phone ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="call-outline" size={14} color={colors.textMuted} />
                    <AppText variant="caption">{c.phone}</AppText>
                  </View>
                ) : null}
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  flex: { flex: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
});
