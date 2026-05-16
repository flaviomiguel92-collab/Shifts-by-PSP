export const COLORS = {
  // Backgrounds — deep space
  background: '#050816',
  backgroundSecondary: '#0B1120',
  backgroundTertiary: '#111827',

  // Glass card surfaces
  glass: 'rgba(11, 17, 32, 0.75)',
  glassBorder: 'rgba(59, 130, 246, 0.12)',
  glassHover: 'rgba(11, 17, 32, 0.9)',

  // Primary — neon blue
  primary: '#3B82F6',
  primaryDark: '#1D4ED8',
  primaryLight: '#60A5FA',
  primaryGlow: 'rgba(59, 130, 246, 0.3)',

  // Secondary — purple
  secondary: '#8B5CF6',
  secondaryGlow: 'rgba(139, 92, 246, 0.25)',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  textMuted: '#475569',
  textInactive: '#64748B',

  // Status
  success: '#10B981',
  successGlow: 'rgba(16, 185, 129, 0.2)',
  warning: '#F59E0B',
  warningGlow: 'rgba(245, 158, 11, 0.2)',
  error: '#EF4444',
  errorGlow: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6',

  // Borders
  borderLight: 'rgba(255, 255, 255, 0.06)',
  borderMedium: 'rgba(255, 255, 255, 0.10)',
  borderAccent: 'rgba(59, 130, 246, 0.20)',
  borderDark: '#0B1120',

  // Shift types
  shiftMorning: '#22C55E',
  shiftNight: '#A855F7',
  shiftAdmin: '#EF4444',
  shiftEvening: '#F59E0B',

  // Gratification
  gratificationPositive: '#10B981',

  // Occurrences
  occurrenceHigh: '#EA580C',
  occurrenceMedium: '#3B82F6',
  occurrenceLow: '#10B981',

  // Overlay
  overlayDark: 'rgba(0, 0, 0, 0.85)',
  overlayLight: 'rgba(59, 130, 246, 0.08)',
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
  'Folga': '#64748B',
  'Day Off': '#64748B',
  'Descanso': '#64748B',
};

export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
  },
  sizes: {
    xs: 11,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 22,
    '3xl': 28,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '800' as const,
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
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
};

// Shared shadow presets
export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  glowSuccess: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  button: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  float: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
};
