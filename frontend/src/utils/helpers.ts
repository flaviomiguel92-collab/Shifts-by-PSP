import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';

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
