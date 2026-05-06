import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { useDataStore } from '../src/store/dataStore';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[init] Starting initialization...');
        const { checkAuth } = useAuthStore.getState();
        const { loadData } = useDataStore.getState();

        const authenticated = await checkAuth();
        console.log('[init] Auth result:', authenticated);
        console.log('[init] isAuthenticated state:', isAuthenticated);

        if (authenticated) {
          console.log('[init] Loading data...');
          try {
            await loadData();
          } catch (err) {
            console.warn('[init] Data load error:', err);
          }
        } else {
          console.log('[init] NOT authenticated - redirecting to login');
          router.replace('/login');
        }
      } catch (err) {
        console.error('[init] Init error:', err);
        router.replace('/login');
      } finally {
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  // Loading screen
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // Protected: only show app if authenticated
  if (!isAuthenticated) {
    console.log('[layout] Not authenticated, showing login routes only');
    return (
      <>
        <Stack screenOptions={{ headerShown: false }} initialRouteName="login">
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack>
        <StatusBar style="light" />
      </>
    );
  }

  // Authenticated: show app
  console.log('[layout] Authenticated, showing app');
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
