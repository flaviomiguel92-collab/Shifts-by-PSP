import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS } from '../../theme/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  activeOpacity?: number;
  noPadding?: boolean;
  accent?: boolean;
}

export function GlassCard({ children, style, onPress, activeOpacity = 0.75, noPadding, accent }: GlassCardProps) {
  const cardStyle = [
    styles.card,
    accent && styles.cardAccent,
    noPadding && { padding: 0 },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={activeOpacity}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.glass,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 18,
    ...SHADOWS.card,
  },
  cardAccent: {
    borderColor: COLORS.borderAccent,
  },
});
