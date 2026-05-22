import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../theme/colors';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  subtitle?: string;
  trend?: { value: string; positive: boolean };
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

export function StatCard({ label, value, icon, color = COLORS.primary, subtitle, trend, style, size = 'md' }: StatCardProps) {
  const isSmall = size === 'sm';

  return (
    <View style={[styles.card, style]}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={isSmall ? 14 : 16} color={color} />
        </View>
        {trend && (
          <View style={[styles.trend, { backgroundColor: trend.positive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }]}>
            <Ionicons
              name={trend.positive ? 'trending-up' : 'trending-down'}
              size={10}
              color={trend.positive ? COLORS.success : COLORS.error}
            />
            <Text style={[styles.trendText, { color: trend.positive ? COLORS.success : COLORS.error }]}>
              {trend.value}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.value, { color, fontSize: isSmall ? 20 : 26 }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.label, { fontSize: isSmall ? 10 : 11 }]}>{label}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

export function StatCardRow({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.glass,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: COLORS.glassBorder,
    padding: 14,
    ...SHADOWS.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '500',
  },
  value: {
    fontWeight: '500',
    letterSpacing: -0.5,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  label: {
    fontWeight: '500',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textInactive,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
});
