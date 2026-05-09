/**
 * PSP Shift Manager - Tactical Design Color Palette
 * Professional police operations aesthetic
 */

export const COLORS = {
  // Primary (Authority & Trust)
  primary: '#3B82F6',
  primaryDark: '#1E40AF',
  primaryLight: '#60A5FA',

  // Backgrounds
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  backgroundTertiary: '#334155',

  // Text
  textPrimary: '#E2E8F0',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  textMuted: '#64748B',

  // Shift Types
  shiftMorning: '#22C55E',      // Green
  shiftNight: '#A855F7',         // Purple
  shiftAdmin: '#EF4444',         // Red
  shiftEvening: '#F59E0B',       // Orange

  // Status Colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Gratification
  gratificationPositive: '#22C55E',

  // Occurrences
  occurrenceHigh: '#EA580C',
  occurrenceMedium: '#3B82F6',
  occurrenceLow: '#10B981',

  // Borders
  borderLight: '#334155',
  borderDark: '#1E293B',

  // Overlay
  overlayDark: 'rgba(0,0,0,0.7)',
  overlayLight: 'rgba(59, 130, 246, 0.1)',
};

export const SHIFT_TYPE_COLORS = {
  'Manhã': COLORS.shiftMorning,
  'Morning': COLORS.shiftMorning,
  'Noite': COLORS.shiftNight,
  'Night': COLORS.shiftNight,
  'Administrativo': COLORS.shiftAdmin,
  'Administrative': COLORS.shiftAdmin,
  'Tarde': COLORS.shiftEvening,
  'Evening': COLORS.shiftEvening,
};

export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'System',
    mono: 'Courier New',
  },
  sizes: {
    xs: 11,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 24,
    '3xl': 28,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
};
