import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { useDataStore } from '../src/store/dataStore';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import LoginScreen from './login';
import RegisterScreen from './register';
import TabsLayout from './(tabs)/_layout';
import HomeScreen from './index';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const loadData = useDataStore((s) => s.loadData);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[init] ========== INITIALIZING APP ==========');
        console.log('[init] Checking authentication...');
        const authenticated = await checkAuth();
        console.log('[init] Auth check result:', authenticated);
        console.log('[init] Setting isAuthenticated to:', authenticated);

        if (authenticated) {
          try {
            console.log('[init] Loading cached data...');
            await loadData();
            console.log('[init] Cached data loaded');
          } catch (err) {
            console.warn('[init] Error loading cached data:', err);
          }
          console.log('[init] ROUTING TO APP (tabs)');
          setIsAuthenticated(true);
        } else {
          console.log('[init] ROUTING TO LOGIN');
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('[init] Auth check failed:', err);
        console.log('[init] ROUTING TO LOGIN (error)');
        setIsAuthenticated(false);
      } finally {
        console.log('[init] Setting isReady to true');
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

  // If not authenticated, show login/register screens only
  if (!isAuthenticated) {
    return (
      <>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="login"
            listeners={{
              beforeRemove: (e) => {
                // Prevent going back from login
                if (e.data.action.type === 'GO_BACK') {
                  e.preventDefault();
                }
              },
            }}
          />
          <Stack.Screen name="register" />
        </Stack>
        <StatusBar style="light" />
      </>
    );
  }

  // If authenticated, show app screens
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
