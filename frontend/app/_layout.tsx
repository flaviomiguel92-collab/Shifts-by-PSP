import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useDataStore } from '../src/store/dataStore';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';

export default function RootLayout() {
  const [error, setError] = useState<string | null>(null);
  const loadData = useDataStore((s) => s.loadData);

  useEffect(() => {
    try {
      loadData();
    } catch (err) {
      console.error('Error in loadData:', err);
      setError(String(err));
    }
  }, []);

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