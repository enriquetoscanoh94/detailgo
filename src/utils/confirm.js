/**
 * Cross-platform confirm dialog.
 *
 * react-native-web's `Alert.alert` does NOT fire button callbacks, so a
 * two-button confirm (sign out, delete, cancel order…) does nothing on the web
 * build. Here we use the browser's native `window.confirm` on web and the real
 * `Alert.alert` on native. Resolves `true` when the user confirms.
 */

import { Platform, Alert } from 'react-native';

export const confirmAction = ({
  title,
  message = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
  destructive = false,
} = {}) =>
  new Promise((resolve) => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      resolve(window.confirm(message ? `${title}\n\n${message}` : title));
      return;
    }
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });

export default confirmAction;
