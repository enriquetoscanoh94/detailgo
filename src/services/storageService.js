/** Firebase Storage uploads (Zelle receipts, later worker photos). */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { storage } from '@/config/firebase';
import { toAppError } from '@/utils/errors';

/**
 * Uploads a local file URI to Storage and returns its download URL.
 * The image is expected to be pre-compressed by the picker (quality < 1).
 *
 * @param {string} localUri  file:// URI from expo-image-picker
 * @param {string} path      storage path, e.g. `receipts/{uid}/{ts}.jpg`
 */
export const uploadImageAsync = async (localUri, path) => {
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
    return await getDownloadURL(storageRef);
  } catch (error) {
    throw toAppError(error);
  }
};
