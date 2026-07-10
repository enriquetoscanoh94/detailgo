/**
 * Tappable profile avatar: shows the user's photo (or their initial) with a
 * small camera badge. Tapping picks an image, uploads it to Storage under
 * avatars/{uid}/… and saves the URL on the user doc. The profile is live so the
 * new photo appears on its own.
 */

import { useState } from 'react';
import { View, Image, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './ui';
import { useI18n } from '@/context/I18nContext';
import { pickImage } from '@/utils/media';
import { uploadImageAsync } from '@/services/storageService';
import { setProfilePhoto } from '@/services/userService';
import { colors } from '@/constants/theme';

export function AvatarUpload({ uid, name, photoUrl, size = 72 }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    const result = await pickImage({ fromCamera: false });
    if (result.status === 'denied') {
      Alert.alert(t('common.close'), t('error.permissionDenied'));
      return;
    }
    if (result.status !== 'ok') return;
    setBusy(true);
    try {
      const url = await uploadImageAsync(result.uri, `avatars/${uid}/${Date.now()}.jpg`);
      await setProfilePhoto(uid, url);
    } catch (err) {
      Alert.alert(t('common.close'), t(err.key ?? 'error.generic'));
    } finally {
      setBusy(false);
    }
  };

  const round = { width: size, height: size, borderRadius: size / 2 };

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={round}
      accessibilityRole="button"
      accessibilityLabel={t('common.changePhoto')}
    >
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={round} resizeMode="cover" />
      ) : (
        <View style={[round, styles.placeholder]}>
          <AppText style={[styles.initial, { fontSize: size * 0.42 }]}>
            {(name ?? '?').charAt(0).toUpperCase()}
          </AppText>
        </View>
      )}
      <View style={styles.badge}>
        {busy ? (
          <ActivityIndicator size="small" color={colors.textOnPrimary} />
        ) : (
          <Ionicons name="camera" size={14} color={colors.textOnPrimary} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.textOnPrimary, fontWeight: '700' },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryDark,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AvatarUpload;
