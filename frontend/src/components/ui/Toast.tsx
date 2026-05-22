import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore, ToastItem, ToastVariant } from '../../utils/toast';
import { COLORS } from '../../theme/colors';

const VARIANT_CONFIG: Record<ToastVariant, { bg: string; border: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', icon: 'checkmark-circle', color: COLORS.success },
  error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  icon: 'alert-circle',    color: COLORS.error },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', icon: 'warning',         color: COLORS.warning },
  info:    { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', icon: 'information-circle', color: COLORS.primaryLight },
};

function ToastCard({ toast }: { toast: ToastItem }) {
  const { dismiss } = useToastStore();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const cfg = VARIANT_CONFIG[toast.variant];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => dismiss(toast.id));
  };

  return (
    <Animated.View style={[styles.toast, { backgroundColor: cfg.bg, borderColor: cfg.border, opacity, transform: [{ translateY }] }]}>
      <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      <Text style={[styles.message, { color: COLORS.textPrimary }]} numberOfLines={2}>{toast.message}</Text>
      <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={14} color={COLORS.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastContainer() {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 44,
    left: 12,
    right: 12,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    backgroundColor: COLORS.backgroundSecondary,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
