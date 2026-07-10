import { View, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen, Header, AppText, Card, Button, LoadingState, EmptyState, ErrorState } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { useSubscription } from '@/hooks/useSubscription';
import { subscribeActiveServices } from '@/services/serviceService';
import { subscribeActiveExtras } from '@/services/extrasService';
import { formatMoney } from '@/utils/money';
import { colors, spacing, radius } from '@/constants/theme';

function ServiceCard({ service }) {
  const { t } = useI18n();
  return (
    <Card style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.flex}>
          <AppText variant="subtitle">{service.name}</AppText>
          {service.durationMinutes ? (
            <AppText variant="caption">{t('booking.duration', { min: service.durationMinutes })}</AppText>
          ) : null}
          <View style={styles.priceTag}>
            <AppText variant="caption" color={colors.primary}>
              {t('catalog.fromPrice', { price: '' }).trim()}
            </AppText>
            <AppText variant="heading" color={colors.primary}>
              {formatMoney(service.basePrice)}
            </AppText>
          </View>
        </View>
      </View>

      {service.description ? (
        <AppText variant="body" muted style={styles.desc}>
          {service.description}
        </AppText>
      ) : null}

      {(service.includes ?? []).length > 0 ? (
        <View style={styles.includes}>
          {service.includes.map((item, i) => (
            <View key={i} style={styles.includeRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <AppText variant="label" style={styles.flex}>
                {item}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function ExtraCard({ extra }) {
  return (
    <Card style={styles.extraCard}>
      <View style={styles.flex}>
        <AppText variant="label">{extra.name}</AppText>
        {extra.description ? <AppText variant="caption">{extra.description}</AppText> : null}
      </View>
      <View style={styles.quoteBadge}>
        <AppText variant="caption" color={colors.primary}>
          {`+${formatMoney(extra.price)}`}
        </AppText>
      </View>
    </Card>
  );
}

export default function PublicServices() {
  const { t } = useI18n();
  const router = useRouter();
  const { data, loading, error } = useSubscription(
    (onData, onError) => subscribeActiveServices(onData, onError),
    []
  );
  const extras = useSubscription((onData, onError) => subscribeActiveExtras(onData, onError), []);
  const list = data ?? [];
  const extrasList = extras.data ?? [];

  return (
    <Screen padded={false}>
      <View style={styles.headerWrap}>
        <Header title={t('catalog.title')} showBack />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <AppText variant="body" muted style={styles.subtitle}>
          {t('catalog.subtitle')}
        </AppText>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : list.length === 0 ? (
          <EmptyState icon="🧼" title={t('catalog.empty')} />
        ) : (
          list.map((s) => <ServiceCard key={s.id} service={s} />)
        )}

        {extrasList.length > 0 ? (
          <View style={styles.extrasSection}>
            <AppText variant="heading" style={styles.extrasHeading}>
              {t('extras.title')}
            </AppText>
            <AppText variant="caption" style={styles.extrasTagline}>
              {t('extras.tagline')}
            </AppText>
            {extrasList.map((ex) => (
              <ExtraCard key={ex.id} extra={ex} />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button title={t('catalog.bookCta')} onPress={() => router.replace('/(auth)/register')} />
        <Button
          title={t('catalog.haveAccount')}
          variant="ghost"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.md },
  subtitle: { marginBottom: spacing.xs },
  flex: { flex: 1 },
  card: { gap: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  priceTag: { marginTop: spacing.sm, alignItems: 'flex-start' },
  desc: { marginTop: 2 },
  includes: { gap: spacing.xs, marginTop: spacing.xs },
  includeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  extrasSection: { marginTop: spacing.sm, gap: spacing.sm },
  extrasHeading: { marginTop: spacing.sm },
  extrasTagline: { marginBottom: spacing.xs },
  extraCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  quoteBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
});
