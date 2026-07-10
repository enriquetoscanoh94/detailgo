/**
 * Image picking (camera / library) with permission handling and compression.
 * Returns { status: 'ok'|'cancelled'|'denied', uri? }.
 */

import * as ImagePicker from 'expo-image-picker';

const OPTIONS = {
  mediaTypes: ['images'],
  quality: 0.5, // compress before upload (keeps receipts small)
  allowsEditing: true,
};

export const pickImage = async ({ fromCamera = false } = {}) => {
  if (fromCamera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { status: 'denied' };
    const res = await ImagePicker.launchCameraAsync(OPTIONS);
    return res.canceled ? { status: 'cancelled' } : { status: 'ok', uri: res.assets[0].uri };
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { status: 'denied' };
  const res = await ImagePicker.launchImageLibraryAsync(OPTIONS);
  return res.canceled ? { status: 'cancelled' } : { status: 'ok', uri: res.assets[0].uri };
};
