/**
 * Registra al detailer para recibir el "ring" de nuevas órdenes y maneja los
 * botones Aceptar / Rechazar de la notificación.
 *
 * Se monta en la pantalla de disponibilidad (worker y admin). Cuando llega la
 * respuesta a la notificación:
 *   - "accept" → intenta tomar la orden (acceptOrder, primero en aceptar gana).
 *   - "reject" o descartar → no hace nada.
 */

import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { setPushToken } from '@/services/userService';
import { acceptOrder } from '@/services/bookingService';
import {
  Notifications,
  registerForPush,
  setupAndroidChannel,
  setupOrderCategory,
} from '@/services/pushService';

export function usePushRegistration() {
  const { user, role, profile } = useAuth();
  const { t } = useI18n();

  // Registrar token + canal + categoría (solo detailer/admin).
  useEffect(() => {
    if (!user || (role !== 'worker' && role !== 'admin')) return;
    let mounted = true;
    (async () => {
      await setupAndroidChannel();
      await setupOrderCategory({ accept: t('push.accept'), reject: t('push.reject') });
      const token = await registerForPush();
      if (mounted && token && token !== profile?.pushToken) {
        try {
          await setPushToken(user.uid, token);
        } catch {
          // no bloquear la pantalla si falla el guardado
        }
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, role]);

  // Aceptar / rechazar desde la notificación.
  useEffect(() => {
    if (!user) return;
    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response?.notification?.request?.content?.data ?? {};
      const bookingId = data.bookingId;
      if (!bookingId) return;
      if (response.actionIdentifier === 'accept') {
        try {
          await acceptOrder(bookingId, { uid: user.uid, name: profile?.name ?? null });
        } catch {
          // la orden ya fue tomada u otro error: la pantalla lo refleja
        }
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, profile?.name]);
}

export default usePushRegistration;
