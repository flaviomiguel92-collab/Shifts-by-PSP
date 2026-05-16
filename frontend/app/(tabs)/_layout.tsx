import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { CustomTabBar } from '../../src/components/TabBar';

// Inject Inter font on web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const id = '__inter_font__';
  if (!document.getElementById(id)) {
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.id = '__inter_global__';
    style.textContent = `
      * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important; }
      input, textarea, button { font-family: inherit !important; }
    `;
    document.head.appendChild(style);
  }
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="gratificados" />
      <Tabs.Screen name="ocorrencias" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
