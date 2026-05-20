import { usePreferencesStore } from '../store/preferencesStore';

/**
 * Semantic theme tokens. Only "chrome" (surfaces / text / borders) flips
 * between dark and light; brand accents and status colours are shared so the
 * app keeps its identity in both modes.
 */
export interface ThemeColors {
  // Surfaces
  bg: string; // app background
  bgAlt: string; // secondary background / scroll areas
  surface: string; // cards
  surfaceAlt: string; // modals / bottom sheets
  surfaceInput: string; // text inputs
  // Lines
  border: string; // hairline borders
  borderStrong: string; // visible separators / input borders
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  textInverse: string; // text on accent fills
  // Overlays
  overlay: string; // modal backdrop
  // Shared accents / status (same in both themes)
  accent: string;
  accentLight: string;
  accentSoft: string; // translucent accent fill
  success: string;
  warning: string;
  danger: string;
  purple: string;
  // Misc
  skeleton: string;
  isDark: boolean;
}

const dark: ThemeColors = {
  bg: '#050816',
  bgAlt: '#0B1120',
  surface: '#111827',
  surfaceAlt: '#1F2937',
  surfaceInput: 'transparent',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: '#374151',
  textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textFaint: '#475569',
  textInverse: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.7)',
  accent: '#3B82F6',
  accentLight: '#60A5FA',
  accentSoft: 'rgba(59,130,246,0.12)',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  skeleton: 'rgba(255,255,255,0.06)',
  isDark: true,
};

const light: ThemeColors = {
  // Page sits a hair off-white so white cards/modals read as elevated.
  bg: '#F8FAFC',           // slate-50
  bgAlt: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#FFFFFF',
  surfaceInput: '#F8FAFC', // slate-50 — input chips contrast with white card
  // Borders: visible, follow Tailwind slate scale.
  border: '#E2E8F0',         // slate-200
  borderStrong: '#CBD5E1',   // slate-300
  // Text hierarchy: slate-900 → 700 → 500 → 400
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
  textInverse: '#FFFFFF',
  overlay: 'rgba(15,23,42,0.50)',
  accent: '#2563EB',
  accentLight: '#3B82F6',
  accentSoft: 'rgba(37,99,235,0.10)',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  purple: '#7C3AED',
  skeleton: '#E2E8F0',
  isDark: false,
};

export const THEME_COLORS = { dark, light };

export function getThemeColors(isLight: boolean): ThemeColors {
  return isLight ? light : dark;
}

/** Reactive hook — re-renders when the user switches theme. */
export function useTheme(): ThemeColors {
  const calendarTheme = usePreferencesStore((s) => s.calendarTheme);
  return getThemeColors(calendarTheme === 'light');
}
