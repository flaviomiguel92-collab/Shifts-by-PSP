import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { SHIFT_TYPE_COLORS } from '../theme/colors';

export const formatDate = (date: string | Date, formatStr: string = 'dd/MM/yyyy'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, { locale: pt });
};

export const formatMonth = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date + '-01') : date;
  return format(dateObj, 'MMMM yyyy', { locale: pt });
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

export const getMonthDays = (monthStr: string): Date[] => {
  const date = parseISO(monthStr + '-01');
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachDayOfInterval({ start, end });
};

export const getCalendarDays = (monthStr: string): (Date | null)[] => {
  const days = getMonthDays(monthStr);
  const firstDay = days[0];
  const startPadding = getDay(firstDay);
  
  // Adjust for Monday start (0 = Monday, 6 = Sunday)
  const adjustedPadding = startPadding === 0 ? 6 : startPadding - 1;
  
  const paddedDays: (Date | null)[] = [];
  
  // Add empty days for padding
  for (let i = 0; i < adjustedPadding; i++) {
    paddedDays.push(null);
  }
  
  // Add actual days
  paddedDays.push(...days);
  
  return paddedDays;
};

export const getNextMonth = (monthStr: string): string => {
  const date = parseISO(monthStr + '-01');
  return format(addMonths(date, 1), 'yyyy-MM');
};

export const getPrevMonth = (monthStr: string): string => {
  const date = parseISO(monthStr + '-01');
  return format(subMonths(date, 1), 'yyyy-MM');
};

export const getCurrentMonth = (): string => {
  return format(new Date(), 'yyyy-MM');
};

export const getCurrentYear = (): string => {
  return format(new Date(), 'yyyy');
};

export const dateToString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/** Cores quando não há tipo configurado em `shiftTypes` (ex.: storage vazio após reload). */
const FALLBACK_SHIFT_PALETTE = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
];

export function hashStringToUint(str: string): number {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function fallbackColorForShiftTypeName(name: string): string {
  const key = String(name || '').trim();
  if (!key) return '#6B7280';
  const idx = hashStringToUint(key) % FALLBACK_SHIFT_PALETTE.length;
  return FALLBACK_SHIFT_PALETTE[idx];
}

/**
 * Resolve a cor definitiva para um tipo de turno.
 * Prioridade: cor guardada → mapa de nomes conhecidos → hash deterministico.
 * Nunca devolve cinzento (#6B7280) a não ser que o nome seja vazio.
 */
export function resolveShiftColor(name: string, storedColor?: string | null): string {
  if (storedColor && storedColor.trim()) return storedColor.trim();
  const key = String(name || '').trim();
  if (!key) return '#6B7280';
  const known = (SHIFT_TYPE_COLORS as Record<string, string | undefined>)[key];
  if (known) return known;
  return fallbackColorForShiftTypeName(key);
}
