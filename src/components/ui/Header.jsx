/** Simple screen header with an optional back button and right slot. */

import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors, spacing } from '../../constants/theme';
import { useI18n } from '@/context/I18nContext';
import { AppText } from './Typography';

export function Header({ title, showBack = false, onBack, right }) {
  const router = useRouter();
  const { t } = useI18n();
  const handleBack = onBack ?? (() => (router.canGoBack() ? router.back() : null));

  return (
    <View style={styles.wrap}>
      <View style={styles.side}>
        {showBack ? (
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
        ) : null}
      </View>
      <AppText variant="heading" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  side: { width: 44, justifyContent: 'center' },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center' },
});

export default Header;
