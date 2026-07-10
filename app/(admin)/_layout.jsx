import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { useTabScreenOptions } from '@/hooks/useTabScreenOptions';

export default function AdminLayout() {
  const { t } = useI18n();
  const { user } = useAuth();
  const screenOptions = useTabScreenOptions();

  // Wait for the session before mounting screens that read user.uid.
  if (!user) return null;

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('roleTab.dashboard'),
          tabBarAccessibilityLabel: t('roleTab.dashboard'),
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="verify"
        options={{
          title: t('roleTab.payments'),
          tabBarAccessibilityLabel: t('roleTab.payments'),
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: t('roleTab.services'),
          tabBarAccessibilityLabel: t('roleTab.services'),
          tabBarIcon: ({ color, size }) => <Ionicons name="pricetags-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: t('roleTab.applications'),
          tabBarAccessibilityLabel: t('roleTab.applications'),
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="available"
        options={{
          title: t('roleTab.work'),
          tabBarAccessibilityLabel: t('roleTab.work'),
          tabBarIcon: ({ color, size }) => <Ionicons name="water-outline" size={size} color={color} />,
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
      <Tabs.Screen name="payouts" options={{ href: null }} />
      <Tabs.Screen name="clients" options={{ href: null }} />
    </Tabs>
  );
}
