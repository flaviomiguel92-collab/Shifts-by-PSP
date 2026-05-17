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

  // Reset paint mode on every app open — prevents stale in-memory state
  // from persisting across SPA navigations without a full page reload.
  useEffect(() => {
    setActive(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        search.open();
      }
      if (e.key === 'Escape') {
        search.close();
        setActive(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setActive]);

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <>
            {/* Hide tab bar while painting — keeps it mounted so expo-router
                doesn't fall back to its default implementation */}
            {!paintActive && <CustomTabBar {...props} />}
            {/* PaintModeBar lives here (same render context as CustomTabBar)
                so z-index stacking is reliable and there are no competing
                touch targets when paint mode is active */}
            <PaintModeBar
              visible={paintActive}
              shiftTypes={shiftTypes}
              selectedType={paintShiftType}
              onSelectType={setShiftType}
              onExit={() => setActive(false)}
            />
          </>
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="gratificados" />
        <Tabs.Screen name="ocorrencias" />
        <Tabs.Screen name="stats" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <SearchModal />
    </>
  );
}
