import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useAuthStore } from '../src/store/authStore';
import { useDataStore } from '../src/store/dataStore';
import { usePreferencesStore } from '../src/store/preferencesStore';
import { StatusBar } from 'expo-status-bar';
import { ToastContainer } from '../src/components/ui/Toast';
import { OfflineBanner } from '../src/components/ui/OfflineBanner';
import { InstallPrompt } from '../src/components/ui/InstallPrompt';

export default function RootLayout() {
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.sessionToken);
  const status = useAuthStore((s) => s.status);
  const checking = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.sessionError);
  const [loadingData, setLoadingData] = useState(false);
  const [dataAttempt, setDataAttempt] = useState(0);
  const retryAttempt = useRef(0);

  useEffect(() => {
    void usePreferencesStore.getState().loadPreferences().catch(() => {});
    void useAuthStore.getState().checkAuth();
    const revalidate = () => {
      if (useAuthStore.getState().status !== 'anonymous') {
        void useAuthStore.getState().checkAuth().then((valid) => {
          if (valid && useAuthStore.getState().status === 'authenticated') setDataAttempt((attempt) => attempt + 1);
        });
      }
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') revalidate();
    });
    if (Platform.OS === 'web') window.addEventListener('online', revalidate);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') window.removeEventListener('online', revalidate);
    };
  }, []);

  useEffect(() => {
    if (status === 'authenticated' || status === 'anonymous') retryAttempt.current = 0;
    if (status !== 'unavailable' || checking) return;
    const delay = Math.min(30000, 1000 * 2 ** Math.min(retryAttempt.current++, 5));
    const timer = setTimeout(() => {
      void useAuthStore.getState().checkAuth().then((valid) => {
        if (valid && useAuthStore.getState().status === 'authenticated') {
          setDataAttempt((attempt) => attempt + 1);
        }
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [status, checking]);

  useEffect(() => {
    if (!authenticated || !token) return;
    let cancelled = false;
    const load = async () => {
      setLoadingData(true);
      const data = useDataStore.getState();
      try {
        await data.loadData();
        if (cancelled) return;
        await Promise.allSettled([
          data.fetchShiftTypes(), data.fetchCycles(), data.fetchGratifiedEntries(), data.fetchEvents(),
          data.fetchShifts(data.currentMonth), data.fetchGratifications(data.currentMonth, data.currentYear),
        ]);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };
    void load().catch(() => {});
    return () => { cancelled = true; };
  }, [authenticated, token, dataAttempt]);

  const retry = () => {
    void useAuthStore.getState().checkAuth().then((valid) => {
      if (valid && useAuthStore.getState().status === 'authenticated') setDataAttempt((attempt) => attempt + 1);
    });
  };
  // Only local storage can hold up restoration. Network validation runs after
  // the app opens with remembered credentials, without flashing the login page.
  const pending = !authenticated && (status === 'checking' || status === 'unavailable');
  return (
    <>
      <OfflineBanner />
      {authenticated && error && (
        <Pressable style={styles.notice} onPress={retry} disabled={checking} accessibilityRole="button">
          <Text style={styles.text}>{error} {checking ? 'A verificar…' : 'Tentar novamente'}</Text>
        </Pressable>
      )}
      {authenticated && loadingData && <Text style={styles.notice}>A carregar os dados…</Text>}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={authenticated}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!authenticated && !pending}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack.Protected>
        <Stack.Protected guard={pending}>
          <Stack.Screen name="session" />
        </Stack.Protected>
      </Stack>
      <InstallPrompt />
      <StatusBar style="light" />
      <ToastContainer />
    </>
  );
}

const styles = StyleSheet.create({
  notice: { padding: 12, backgroundColor: '#E2E8F0', color: '#0F172A', textAlign: 'center' },
  text: { color: '#0F172A', textAlign: 'center' },
});
