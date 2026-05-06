import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useDataStore } from '../src/store/dataStore';
import { storage } from '../src/utils/storage';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://shift-olama-backend.onrender.com';
const DEVICE_ID_KEY = 'device_id';

async function getOrCreateDeviceId(): Promise<string> {
  // Each device/browser gets a unique ID to separate data
  let deviceId = await storage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await storage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

async function ensureSessionToken(): Promise<string | null> {
  // Always request a fresh demo token on app startup so we never carry
  // an expired/invalid session_token into subsequent API calls.
  const deviceId = await getOrCreateDeviceId();
  console.log('[auth] Requesting demo token for device:', deviceId);
  try {
    const authResponse = await fetch(`${API_URL}/api/auth/demo`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId }),
    });

    console.log('[auth] /api/auth/demo status:', authResponse.status);

    if (!authResponse.ok) {
      console.warn('[auth] Demo auth returned non-OK status:', authResponse.status);
      return null;
    }

    const authData = await authResponse.json();
    const token = authData?.session_token ?? null;
    if (token) {
      await storage.setItem('session_token', token);
      console.log('[auth] session_token saved to storage');
    } else {
      console.warn('[auth] Response had no session_token field:', authData);
    }
    return token;
  } catch (authError) {
    console.error('[auth] Demo auth failed:', authError);
    return null;
  }
}

export default function RootLayout() {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const loadData = useDataStore((s) => s.loadData);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // ALWAYS authenticate first so the rest of the app sees a valid token.
        await ensureSessionToken();

        // Load locally cached data (does not hit the API).
        await loadData();
      } catch (err) {
        console.error('[init] Error initializing app:', err);
        setError(String(err));
      } finally {
        setReady(true);
      }
    };

    initializeApp();
  }, [loadData]);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <Text style={{ color: '#fff', textAlign: 'center', padding: 20 }}>Erro: {error}</Text>
      </View>
    );
  }

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
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
