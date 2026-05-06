import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { useDataStore } from '../src/store/dataStore';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'auth' | 'app'>('auth');
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const loadData = useDataStore((s) => s.loadData);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const authenticated = await checkAuth();

        if (authenticated) {
          try {
            await loadData();
          } catch (err) {
            console.warn('[init] Error loading cached data:', err);
          }
          setInitialRoute('app');
        } else {
          setInitialRoute('auth');
        }
      } catch (err) {
        console.error('[init] Auth check failed:', err);
        setInitialRoute('auth');
      } finally {
        setIsReady(true);
      }
    };

    initializeApp();
  }, [checkAuth, loadData]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRoute === 'auth' ? 'login' : '(tabs)'}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
