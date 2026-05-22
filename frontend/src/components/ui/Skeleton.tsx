import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Skeleton width={80} height={12} borderRadius={6} />
        <Skeleton width={60} height={12} borderRadius={6} />
      </View>
      <Skeleton width="60%" height={22} borderRadius={8} style={{ marginTop: 10 }} />
      <Skeleton width="100%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
      <Skeleton width="80%" height={12} borderRadius={6} style={{ marginTop: 6 }} />
    </View>
  );
}

export function SkeletonCalendarRow() {
  return (
    <View style={styles.calRow}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} width="13%" height={52} borderRadius={10} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  card: {
    backgroundColor: 'rgba(11, 17, 32, 0.75)',
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    padding: 18,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
});
