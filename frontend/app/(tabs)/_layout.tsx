import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, useWindowDimensions, StyleSheet } from 'react-native';

const CalendarIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="calendar" size={size} color={color} />
);

const CashIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="cash" size={size} color={color} />
);

const DocumentIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="document-text" size={size} color={color} />
);

const StatsIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="stats-chart" size={size} color={color} />
);

const PersonIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="person" size={size} color={color} />
);

const ReportsIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="document" size={size} color={color} />
);

export default function TabLayout() {
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isMobileSize = width < 768;

  const tabBarHeight = isMobileSize ? (Platform.OS === 'ios' ? 86 : 72) : 80;
  const tabBarPadding = isMobileSize ? 0 : 20;
  const fontSize = isMobileSize ? 10 : 12;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1F2937',
          borderTopColor: '#374151',
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: isMobileSize ? (Platform.OS === 'ios' ? 24 : 10) : 16,
          paddingTop: isMobileSize ? 8 : 12,
          paddingHorizontal: tabBarPadding,
          display: 'flex',
          borderRadius: isWeb ? 0 : 0,
          margin: 0,
          position: isMobileSize ? 'absolute' : 'relative',
          bottom: isMobileSize ? 0 : undefined,
          left: 0,
          right: 0,
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: fontSize,
          fontWeight: '600',
          marginBottom: 4,
        },
        tabBarItemStyle: {
          paddingVertical: isMobileSize ? 4 : 8,
          marginHorizontal: 0,
          flex: 1,
          minHeight: tabBarHeight - 20,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarHideOnKeyboard: true,
        tabBarAllowFontScaling: false,
        tabBarPressColor: 'rgba(59,130,246,0.16)',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Turnos',
          tabBarIcon: CalendarIcon,
        }}
      />
      <Tabs.Screen
        name="gratificados"
        options={{
          title: 'Gratificados',
          tabBarIcon: CashIcon,
        }}
      />
      <Tabs.Screen
        name="ocorrencias"
        options={{
          title: 'Ocorrências',
          tabBarIcon: DocumentIcon,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Painel',
          tabBarIcon: StatsIcon,
        }}
      />
      <Tabs.Screen
        name="relatorios"
        options={{
          title: 'Relatórios',
          tabBarIcon: ReportsIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: PersonIcon,
        }}
      />
    </Tabs>
  );
}
