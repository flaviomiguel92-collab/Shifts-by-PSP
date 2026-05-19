import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { useDataStore } from '../src/store/dataStore';
import { usePreferencesStore } from '../src/store/preferencesStore';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Animated, StyleSheet, Image } from 'react-native';
import { COLORS } from '../src/theme/colors';
import { ToastContainer } from '../src/components/ui/Toast';
import { OfflineBanner } from '../src/components/ui/OfflineBanner';
import { InstallPrompt } from '../src/components/ui/InstallPrompt';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

const logoImage = require('../assets/images/icon.png');

function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    });
  }, [opacity, scale, pulse]);

  return (
    <View style={splashStyles.container}>
      <Animated.View style={[splashStyles.logoWrap, { opacity, transform: [{ scale }] }]}>
        <Animated.View style={[splashStyles.logoGlow, { transform: [{ scale: pulse }] }]} />
        <Image source={logoImage} style={splashStyles.logoImage} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  logoWrap: {
    alignItems: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  logoImage: {
    width: 200,
    height: 200,
  },
});

export default function RootLayout() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [isInitialized, setIsInitialized] = useState(false);
  const [fontsLoaded] = useFonts(Ionicons.font);

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

  if (!isInitialized || !fontsLoaded) {
    return <SplashScreen />;
  }

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
