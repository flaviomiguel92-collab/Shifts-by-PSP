import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/themes';

const TAB_CONFIG: Record<string, { icon: string; iconActive: string; label: string }> = {
  index:        { icon: 'calendar-outline',       iconActive: 'calendar',       label: 'Turnos' },
  gratificados: { icon: 'cash-outline',           iconActive: 'cash',           label: 'Gratificados' },
  ocorrencias:  { icon: 'shield-outline',         iconActive: 'shield',         label: 'Ocorrências' },
  stats:        { icon: 'stats-chart-outline',    iconActive: 'stats-chart',    label: 'Painel' },
  profile:      { icon: 'person-outline',         iconActive: 'person',         label: 'Perfil' },
};

function TabItem({
  route,
  isFocused,
  onPress,
}: {
  route: any;
  isFocused: boolean;
  onPress: () => void;
}) {
  const config = TAB_CONFIG[route.name] ?? {
    icon: 'ellipse-outline',
    iconActive: 'ellipse',
    label: route.name,
  };

  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isFocused ? 1.1 : 1,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
      Animated.timing(glowOpacity, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [glowOpacity, isFocused, scale]);

  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        {/* Active indicator dot */}
        <Animated.View style={[styles.activeBar, { opacity: glowOpacity }]} />

        <Ionicons
          name={(isFocused ? config.iconActive : config.icon) as any}
          size={22}
          color={isFocused ? '#60A5FA' : '#475569'}
        />
        <Text style={[styles.label, isFocused && styles.labelActive]}>
          {config.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function CustomTabBar({ state, navigation }: any) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const t = useTheme();
  const isLight = !t.isDark;

  return (
    <View
      style={[
        styles.wrapper,
        isWide && styles.wrapperWide,
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.container,
          isLight && {
            backgroundColor: 'rgba(255,255,255,0.98)',
            borderColor: t.borderStrong,
            shadowOpacity: 0.12,
          },
        ]}
      >
        {state.routes.map((route: any, index: number) => (
          <TabItem
            key={route.key}
            route={route}
            isFocused={state.index === index}
            onPress={() => navigation.navigate(route.name)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    paddingHorizontal: 14,
    paddingTop: 8,
    pointerEvents: 'box-none' as any,
  },
  wrapperWide: {
    paddingHorizontal: 40,
    paddingBottom: 20,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(5, 8, 22, 0.96)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.18)',
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 24,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 3,
    position: 'relative',
    minWidth: 52,
  },
  activeBar: {
    position: 'absolute',
    top: -2,
    width: 28,
    height: 2,
    backgroundColor: '#3B82F6',
    borderRadius: 1,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#60A5FA',
  },
});