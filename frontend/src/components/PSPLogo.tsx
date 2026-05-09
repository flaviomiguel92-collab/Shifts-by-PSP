import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';

interface PSPLogoProps {
  size?: number;
  variant?: 'badge' | 'icon' | 'full';
}

export const PSPLogo: React.FC<PSPLogoProps> = ({ size = 80, variant = 'badge' }) => {
  const iconSize = size * 0.6;
  const badgeSize = size;

  if (variant === 'icon') {
    return (
      <View
        style={[
          styles.badge,
          {
            width: iconSize,
            height: iconSize,
            borderRadius: iconSize / 2,
          },
        ]}
      >
        <Text style={{ fontSize: iconSize * 0.5 }}>🛡️</Text>
      </View>
    );
  }

  if (variant === 'full') {
    return (
      <View style={styles.fullLogoContainer}>
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 8,
            },
          ]}
        >
          <View style={styles.badgeContent}>
            {/* Cap */}
            <View style={styles.cap}>
              <Text style={styles.star}>★</Text>
            </View>
            {/* Officer silhouette */}
            <View style={styles.silhouette}>
              <View style={styles.head} />
              <View style={styles.body} />
            </View>
          </View>
        </View>
        <Text style={styles.brandText}>PSP TURNOS</Text>
        <Text style={styles.brandSubtext}>Gestão de Turnos Profissionais</Text>
      </View>
    );
  }

  // Default badge variant
  return (
    <View
      style={[
        styles.badge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 8,
        },
      ]}
    >
      <View style={styles.badgeContent}>
        {/* Cap */}
        <View style={styles.cap}>
          <Text style={styles.star}>★</Text>
        </View>
        {/* Officer silhouette */}
        <View style={styles.silhouette}>
          <View style={styles.head} />
          <View style={styles.body} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullLogoContainer: {
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    backgroundColor: COLORS.primaryDark,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  badgeContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cap: {
    position: 'absolute',
    top: '8%',
    width: '70%',
    height: '20%',
    backgroundColor: COLORS.primary,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  star: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  silhouette: {
    position: 'absolute',
    top: '20%',
    width: '60%',
    height: '70%',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  head: {
    width: '35%',
    height: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    marginBottom: 4,
  },
  body: {
    width: '75%',
    height: '65%',
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
  },
  brandText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 2,
  },
  brandSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
