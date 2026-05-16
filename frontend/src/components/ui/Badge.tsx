import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral' | 'primary' | 'secondary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

const VARIANT_MAP: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  success: { bg: 'rgba(16,185,129,0.12)', text: COLORS.success, border: 'rgba(16,185,129,0.2)' },
  warning: { bg: 'rgba(245,158,11,0.12)', text: COLORS.warning, border: 'rgba(245,158,11,0.2)' },
  error: { bg: 'rgba(239,68,68,0.12)', text: COLORS.error, border: 'rgba(239,68,68,0.2)' },
  neutral: { bg: 'rgba(148,163,184,0.08)', text: COLORS.textTertiary, border: COLORS.borderLight },
  primary: { bg: 'rgba(59,130,246,0.12)', text: COLORS.primaryLight, border: 'rgba(59,130,246,0.2)' },
  secondary: { bg: 'rgba(139,92,246,0.12)', text: COLORS.secondary, border: 'rgba(139,92,246,0.2)' },
};

export function Badge({ label, variant = 'neutral', icon, style, size = 'sm' }: BadgeProps) {
  const v = VARIANT_MAP[variant];
  const textSize = size === 'sm' ? 10 : 12;
  const iconSize = size === 'sm' ? 10 : 12;
  const ph = size === 'sm' ? 8 : 10;
  const pv = size === 'sm' ? 3 : 5;

  return (
    <View style={[
      styles.container,
      { backgroundColor: v.bg, borderColor: v.border, paddingHorizontal: ph, paddingVertical: pv },
      style,
    ]}>
      {icon && <Ionicons name={icon} size={iconSize} color={v.text} style={{ marginRight: 4 }} />}
      <Text style={[styles.text, { color: v.text, fontSize: textSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
