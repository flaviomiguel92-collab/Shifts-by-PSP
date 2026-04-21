import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useDataStore } from '../src/store/dataStore';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  const loadData = useDataStore((s) => s.loadData);

  useEffect(() => {
    loadData();
  }, []);

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