import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { useDataStore } from '../src/store/dataStore';
import { usePreferencesStore } from '../src/store/preferencesStore';
import { StatusBar } from 'expo-status-bar';
import { ToastContainer } from '../src/components/ui/Toast';
import { OfflineBanner } from '../src/components/ui/OfflineBanner';
import { InstallPrompt } from '../src/components/ui/InstallPrompt';

export default function RootLayout() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [isInitialized, setIsInitialized] = useState(false);

  // Inicialização - corre só uma vez
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const { checkAuth } = useAuthStore.getState();
        const { loadData } = useDataStore.getState();
        try {
          await usePreferencesStore.getState().loadPreferences();
        } catch (err) {
          console.warn('[init] loadPreferences error:', err);
        }
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
          try {
            await useDataStore.getState().fetchCycles();
          } catch (err) {
            console.warn('[init] fetchCycles error:', err);
          }
          try {
            await useDataStore.getState().fetchGratifiedEntries();
          } catch (err) {
            console.warn('[init] fetchGratifiedEntries error:', err);
          }
          try {
            await useDataStore.getState().fetchEvents();
          } catch (err) {
            console.warn('[init] fetchEvents error:', err);
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
  }, [isAuthenticated, isInitialized, router]);

  return (
    <>
      <OfflineBanner />
      <InstallPrompt />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack>
      <StatusBar style="light" />
      <ToastContainer />
    </>
  );
}
