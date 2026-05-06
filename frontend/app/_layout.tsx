import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { useDataStore } from '../src/store/dataStore';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';

type RootRoute = 'login' | 'register' | 'home' | 'tabs';

export default function RootLayout() {
  const router = useRouter();
  const [initialRoute, setInitialRoute] = useState<RootRoute | null>(null);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const loadData = useDataStore((s) => s.loadData);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[init] Checking authentication...');
        const authenticated = await checkAuth();
        console.log('[init] Auth check result:', authenticated);

        if (authenticated) {
          try {
            await loadData();
          } catch (err) {
            console.warn('[init] Error loading data:', err);
          }
          setInitialRoute('tabs');
        } else {
          setInitialRoute('login');
        }
      } catch (err) {
        console.error('[init] Error:', err);
        setInitialRoute('login');
      }
    };

    initializeApp();
  }, [checkAuth, loadData]);

  // Show loading until we know where to route
  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // Route to the appropriate screen
  if (initialRoute === 'login') {
    return (
      <>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack>
        <StatusBar style="light" />
      </>
    );
  }

  if (initialRoute === 'tabs') {
    return (
      <>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="index" />
        </Stack>
        <StatusBar style="light" />
      </>
    );
  }

  return null;
}
