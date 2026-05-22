import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useTheme } from '../../theme/themes';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  rightLabel?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  style?: ViewStyle;
}

export function SectionHeader({ title, subtitle, rightLabel, rightIcon, onRightPress, style }: SectionHeaderProps) {
  const th = useTheme();
  const isLight = !th.isDark;
  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        <Text style={[styles.title, isLight && { color: th.textMuted }]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, isLight && { color: th.textMuted }]}>{subtitle}</Text>}
      </View>
      {(rightLabel || rightIcon) && (
        <TouchableOpacity onPress={onRightPress} style={styles.right} activeOpacity={0.7}>
          {rightLabel && <Text style={styles.rightLabel}>{rightLabel}</Text>}
          {rightIcon && <Ionicons name={rightIcon} size={14} color={COLORS.primaryLight} />}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  left: { flex: 1 },
  title: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  rightLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primaryLight,
  },
});
