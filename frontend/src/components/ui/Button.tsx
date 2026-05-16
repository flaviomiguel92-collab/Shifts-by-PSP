import React from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator,
  ViewStyle, TextStyle, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../theme/colors';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const VARIANT_STYLES = {
  primary: {
    container: { overflow: 'hidden' as const },
    text: { color: '#fff' },
    iconColor: '#fff',
    gradient: ['#3B82F6', '#1D4ED8'] as [string, string],
  },
  secondary: {
    container: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    text: { color: COLORS.primaryLight },
    iconColor: COLORS.primaryLight,
    gradient: null,
  },
  ghost: {
    container: {
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderWidth: 1,
      borderColor: COLORS.borderLight,
    },
    text: { color: COLORS.textTertiary },
    iconColor: COLORS.textTertiary,
    gradient: null,
  },
  danger: {
    container: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    text: { color: COLORS.error },
    iconColor: COLORS.error,
    gradient: null,
  },
  success: {
    container: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    text: { color: COLORS.success },
    iconColor: COLORS.success,
    gradient: null,
  },
};

const SIZE_STYLES = {
  sm: { paddingVertical: 8, paddingHorizontal: 14, fontSize: 13, iconSize: 14, borderRadius: 10 },
  md: { paddingVertical: 12, paddingHorizontal: 18, fontSize: 14, iconSize: 16, borderRadius: 12 },
  lg: { paddingVertical: 15, paddingHorizontal: 22, fontSize: 15, iconSize: 18, borderRadius: 14 },
};

export function Button({
  title, onPress, variant = 'primary', size = 'md',
  icon, iconRight, loading, disabled, style, textStyle, fullWidth,
}: ButtonProps) {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];
  const opacity = disabled || loading ? 0.5 : 1;

  const inner = (
    <View style={[styles.inner, { paddingVertical: s.paddingVertical, paddingHorizontal: s.paddingHorizontal }]}>
      {loading ? (
        <ActivityIndicator size="small" color={v.text.color} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={s.iconSize} color={v.iconColor} />}
          <Text style={[styles.text, { fontSize: s.fontSize, ...v.text }, textStyle]}>{title}</Text>
          {iconRight && <Ionicons name={iconRight} size={s.iconSize} color={v.iconColor} />}
        </>
      )}
    </View>
  );

  const containerStyle = [
    styles.container,
    { borderRadius: s.borderRadius, opacity },
    variant === 'primary' && SHADOWS.button,
    fullWidth && { alignSelf: 'stretch' as const },
    v.container,
    style,
  ];

  if (v.gradient) {
    return (
      <TouchableOpacity style={containerStyle} onPress={onPress} disabled={disabled || loading} activeOpacity={0.85}>
        <LinearGradient
          colors={v.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: s.borderRadius }]}
        />
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={containerStyle} onPress={onPress} disabled={disabled || loading} activeOpacity={0.85}>
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontWeight: '700',
  },
});
