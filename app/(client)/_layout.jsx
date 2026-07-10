import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { useTabScreenOptions } from '@/hooks/useTabScreenOptions';

export default function ClientLayout() {
  const { t } = useI18n();
  const { user } = useAuth();
  const screenOptions = useTabScreenOptions();

  // Don't mount the tab screens until the session is restored: they read
  // user.uid and would crash on a hard reload / deep link while auth is still
  // resolving. The root navigator shows the brand loader during this window.
  if (!user) return null;

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="home"
        options={{
          title: t('roleTab.home'),
          tabBarAccessibilityLabel: t('roleTab.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('roleTab.orders'),
          tabBarAccessibilityLabel: t('roleTab.orders'),
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: t('roleTab.vehicles'),
          tabBarAccessibilityLabel: t('roleTab.vehicles'),
          tabBarIcon: ({ color, size }) => <Ionicons name="car-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('roleTab.profile'),
          tabBarAccessibilityLabel: t('roleTab.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />

      {/* Navigable but hidden from the tab bar. */}
      <Tabs.Screen name="book" options={{ href: null }} />
      <Tabs.Screen name="addresses" options={{ href: null }} />
      <Tabs.Screen name="order/[id]" options={{ href: null }} />
    </Tabs>
  );
}
