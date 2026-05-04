import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useDataStore } from '../src/store/dataStore';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';

export default function RootLayout() {
  const [error, setError] = useState<string | null>(null);
  const loadData = useDataStore((s) => s.loadData);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Ensure authentication token exists before loading data
        const { storage } = await import('../src/utils/storage');
        const token = await storage.getItem('session_token');

        if (!token) {
          // Get demo token from backend
          const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://shift-olama-backend.onrender.com';
          try {
            const authResponse = await fetch(`${apiUrl}/api/auth/demo`, {
              method: 'POST',
              credentials: 'include',
            });

            if (authResponse.ok) {
              const authData = await authResponse.json();
              if (authData.session_token) {
                await storage.setItem('session_token', authData.session_token);
              }
            }
          } catch (authError) {
            console.warn('Demo auth failed:', authError);
          }
        }

        // Load app data
        await loadData();
      } catch (err) {
        console.error('Error initializing app:', err);
        setError(String(err));
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