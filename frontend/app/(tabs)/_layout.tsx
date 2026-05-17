import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { CustomTabBar } from '../../src/components/TabBar';
import { SearchModal } from '../../src/components/SearchModal';
import { search } from '../../src/utils/search';
import { PaintModeBar } from '../../src/components/calendar/PaintModeBar';
import { usePaintStore } from '../../src/store/paintStore';
import { useDataStore } from '../../src/store/dataStore';

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
      * { font-family: 'Inter', 'Ionicons', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important; }
      input, textarea, button { font-family: inherit !important; }
    `;
    document.head.appendChild(style);
  }
}

export default function TabLayout() {
  const paintActive = usePaintStore((s) => s.active);
  const paintShiftType = usePaintStore((s) => s.shiftType);
  const setActive = usePaintStore((s) => s.setActive);
  const setShiftType = usePaintStore((s) => s.setShiftType);
  const shiftTypes = useDataStore((s) => s.shiftTypes);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        search.open();
      }
      if (e.key === 'Escape') search.close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
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
      <SearchModal />
      <PaintModeBar
        visible={paintActive}
        shiftTypes={shiftTypes}
        selectedType={paintShiftType}
        onSelectType={setShiftType}
        onExit={() => setActive(false)}
      />
    </>
  );
}
