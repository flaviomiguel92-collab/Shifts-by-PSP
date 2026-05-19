import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../theme/colors';
import { useTheme } from '../theme/themes';

interface HeaderWithBackProps {
  title: string;
  showBackButton?: boolean;
}

export function HeaderWithBack({ title, showBackButton = true }: HeaderWithBackProps) {
  const router = useRouter();
  const th = useTheme();
  const isLight = !th.isDark;

  return (
    <View style={[styles.header, isLight && { backgroundColor: th.bgAlt, borderBottomColor: th.border }]}>
      {showBackButton && (
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={isLight ? th.textPrimary : '#FFFFFF'} />
        </TouchableOpacity>
      )}
      <Text style={[styles.title, isLight && { color: th.textPrimary }, !showBackButton && styles.titleCentered]}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.backgroundTertiary,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 12,
  },
  titleCentered: {
    textAlign: 'center',
    marginLeft: 0,
  },
  spacer: {
    width: 44,
  },
});
