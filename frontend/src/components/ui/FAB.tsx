import React, { useRef, useState } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet, Animated,
  Platform, ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../theme/colors';

interface FABAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}

interface FABProps {
  actions: FABAction[];
  style?: ViewStyle;
}

export function FAB({ actions, style }: FABProps) {
  const [open, setOpen] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(actions.map(() => new Animated.Value(0))).current;

  const toggle = () => {
    const toValue = open ? 0 : 1;
    Animated.parallel([
      Animated.spring(rotation, { toValue, useNativeDriver: true, tension: 100, friction: 8 }),
      ...actionsAnim.map((anim, i) =>
        Animated.spring(anim, {
          toValue,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
          delay: open ? 0 : i * 40,
        })
      ),
    ]).start();
    setOpen(!open);
  };

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  return (
    <View style={[styles.container, style]} pointerEvents="box-none">
      {/* Action items */}
      {actions.map((action, i) => {
        const translateY = actionsAnim[i].interpolate({ inputRange: [0, 1], outputRange: [0, -1] });
        const opacity = actionsAnim[i];
        const scale = actionsAnim[i].interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
        const bottomOffset = (i + 1) * 62;

        return (
          <Animated.View
            key={i}
            style={[
              styles.actionItem,
              { bottom: bottomOffset, opacity, transform: [{ scale }, { translateY }] },
            ]}
            pointerEvents={open ? 'auto' : 'none'}
          >
            <Text style={styles.actionLabel}>{action.label}</Text>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: action.color || COLORS.backgroundTertiary }]}
              onPress={() => { toggle(); action.onPress(); }}
              activeOpacity={0.85}
            >
              <Ionicons name={action.icon} size={20} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {/* Main FAB button */}
      <TouchableOpacity style={styles.fab} onPress={toggle} activeOpacity={0.9}>
        <LinearGradient
          colors={['#3B82F6', '#1D4ED8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="add" size={26} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 100 : 88,
    alignItems: 'flex-end',
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...SHADOWS.glow,
    shadowColor: '#3B82F6',
  },
  actionItem: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    backgroundColor: 'rgba(5,8,22,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  actionBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    ...SHADOWS.card,
  },
});
