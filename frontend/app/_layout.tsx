import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { useDataStore } from '../src/store/dataStore';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../src/theme/colors';
import { ToastContainer } from '../src/components/ui/Toast';
import { OfflineBanner } from '../src/components/ui/OfflineBanner';
import { InstallPrompt } from '../src/components/ui/InstallPrompt';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

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
        <View style={splashStyles.logoBox}>
          <Text style={splashStyles.logoLetter}>S</Text>
        </View>
        <Text style={splashStyles.appName}>Shift</Text>
        <Text style={splashStyles.appSub}>Gestão de Turnos</Text>
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
    gap: 12,
  },
  logoGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    top: -10,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 34,
    fontWeight: '800',
    color: '#3B82F6',
    letterSpacing: -1,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: -0.5,
  },
  appSub: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    letterSpacing: 0.5,
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
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="index" />
      </Stack>
      <StatusBar style="light" />
      <ToastContainer />
    </>
  );
}
