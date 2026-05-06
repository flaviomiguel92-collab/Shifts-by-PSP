import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { useDataStore } from '../src/store/dataStore';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loadData = useDataStore((s) => s.loadData);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if user has a valid session
        const authenticated = await checkAuth();

        if (authenticated) {
          // Load cached data
          await loadData();
          // Navigate to tabs
          router.replace('/(tabs)');
        } else {
          // Navigate to login
          router.replace('/login');
        }
      } catch (err) {
        console.error('[init] Error initializing app:', err);
        router.replace('/login');
      } finally {
        setReady(true);
      }
    };

    initializeApp();
  }, [checkAuth, loadData]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
