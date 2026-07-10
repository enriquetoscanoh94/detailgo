import { Stack } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { colors } from '@/constants/theme';

export default function WorkerLayout() {
  const { user } = useAuth();

  // Wait for the session before mounting screens that read user.uid.
  if (!user) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="available" />
    </Stack>
  );
}
