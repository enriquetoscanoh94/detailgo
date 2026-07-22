/**
 * Push notifications para el detailer ("suena como llamada" al llegar orden).
 *
 * - Registra el Expo push token y lo guarda en users/{uid}.pushToken.
 * - Crea el canal Android 'orders' (máxima prioridad + tono ring.wav) y la
 *   categoría 'new_order' con botones Aceptar / Rechazar.
 * - El envío real lo dispara la Cloud Function onBookingCreated.
 *
 * Solo aplica en móvil (Android primero). En web se omite: el navegador no
 * puede sonar con la app cerrada — ahí queda el sonido in-app (useOrderAlert).
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

export const ORDER_CHANNEL_ID = 'orders';
export const NEW_ORDER_CATEGORY = 'new_order';

// Mostrar la notificación (con sonido) aunque la app esté en primer plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Canal Android de órdenes: importancia máxima, tono de ring y vibración. */
export async function setupAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ORDER_CHANNEL_ID, {
    name: 'Nuevas órdenes',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'ring.wav',
    vibrationPattern: [0, 500, 250, 500, 250, 500],
    lightColor: '#06B6D4',
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

/** Categoría con los botones Aceptar / Rechazar en la notificación. */
export async function setupOrderCategory(labels) {
  await Notifications.setNotificationCategoryAsync(NEW_ORDER_CATEGORY, [
    {
      identifier: 'accept',
      buttonTitle: labels?.accept ?? 'Aceptar',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'reject',
      buttonTitle: labels?.reject ?? 'Rechazar',
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);
}

/** Pide permiso y devuelve el Expo push token (o null si no se pudo). */
export async function registerForPush() {
  if (Platform.OS === 'web') return null;
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return token.data;
  } catch {
    // p. ej. emulador sin Google Play services: no truena la app.
    return null;
  }
}

export { Device, Notifications };
