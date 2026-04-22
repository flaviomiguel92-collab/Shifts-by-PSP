import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

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

export default function TabLayout() {
  const isWeb = Platform.OS === 'web';
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1F2937',
          borderTopColor: '#374151',
          borderTopWidth: 1,
          height: isWeb ? 70 : (Platform.OS === 'ios' ? 85 : 65),
          paddingBottom: isWeb ? 15 : (Platform.OS === 'ios' ? 25 : 10),
          paddingTop: isWeb ? 12 : 10,
          paddingHorizontal: isWeb ? 20 : 0,
          display: isWeb ? 'flex' : 'flex',
          borderRadius: isWeb ? 12 : 0,
          margin: isWeb ? 16 : 0,
          position: isWeb ? 'relative' : 'absolute',
          bottom: isWeb ? 'auto' : 0,
          left: isWeb ? 0 : 0,
          right: isWeb ? 0 : 0,
          width: isWeb ? 'auto' : '100%',
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: isWeb ? 12 : 10,
          fontWeight: '600',
          marginBottom: isWeb ? 2 : 0,
        },
        tabBarItemStyle: {
          paddingVertical: isWeb ? 8 : 0,
          marginHorizontal: isWeb ? 8 : 0,
        },
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
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: PersonIcon,
        }}
      />
    </Tabs>
  );
}
