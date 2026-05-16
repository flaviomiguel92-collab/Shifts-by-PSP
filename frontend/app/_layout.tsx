import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { useDataStore } from '../src/store/dataStore';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../src/theme/colors';
import { ToastContainer } from '../src/components/ui/Toast';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

export default function RootLayout() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [isInitialized, setIsInitialized] = useState(false);
  const [fontsLoaded] = useFonts(Ionicons.font);

  // Inicialização - corre só uma vez
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const { checkAuth } = useAuthStore.getState();
        const { loadData } = useDataStore.getState();
        const authenticated = await checkAuth();
        if (authenticated) {
          useDataStore.getState().clearSyncedCollections();
          try {
            await loadData();
          } catch (err) {
            console.warn('[init] Data load error:', err);
          }
          try {
            await useDataStore.getState().fetchShiftTypes();
          } catch (err) {
            console.warn('[init] fetchShiftTypes error:', err);
          }
        }
      } catch (err) {
        console.error('[init] Init error:', err);
      } finally {
        setIsInitialized(true);
      }
    };
    initializeApp();
  }, []);

  // Reage a mudanças de autenticação em runtime (login e logout)
  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.replace('/login');
    } else {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isInitialized]);

  if (!isInitialized || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="index" />
      </Stack>
      <StatusBar style="light" />
      <ToastContainer />
    </>
  );
}
