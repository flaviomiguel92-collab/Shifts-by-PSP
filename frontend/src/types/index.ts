export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  created_at?: string;
}

export type ShiftType = string;

export interface ShiftTypeConfig {
  id: string;
  name: string;
  shortLabel?: string;
  short_name?: string;
  color: string;
  start_time?: string;
  end_time?: string;
  /** @deprecated use start_time */ startTime?: string;
  /** @deprecated use end_time */ endTime?: string;
  is_working?: boolean;
  order?: number;
}

export interface Shift {
  id: string;
  user_id: string;
  date: string;
  shift_type: ShiftType;
  start_time?: string;
  end_time?: string;
  note?: string;
  created_at?: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  date: string;
  title: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  note?: string;
  created_at?: string;
}

export type GratificationType = 'hora_extra' | 'gratificacao' | 'premio';

export interface Gratification {
  id: string;
  user_id: string;
  date: string;
  gratification_type: GratificationType;
  value: number;
  note?: string;
  shift_id?: string;
  created_at?: string;
}

export interface MonthlyStats {
  month: string;
  total_gratifications: number;
  gratification_count: number;
  average_per_gratification: number;
  by_type: Record<string, { total: number; count: number }>;
  shifts_count: number;
  shifts_by_type: Record<string, number>;
}

export interface YearlyStats {
  year: string;
  total_gratifications: number;
  gratification_count: number;
  average_per_gratification: number;
  average_monthly: number;
  projection_annual: number;
  by_month: Record<string, { total: number; count: number }>;
  by_type: Record<string, { total: number; count: number }>;
}

export interface ComparisonStats {
  months: { month: string; total: number; count: number }[];
}

export const GRATIFICATION_LABELS: Record<GratificationType, string> = {
  hora_extra: 'Hora Extra',
  gratificacao: 'Gratificação',
  premio: 'Prémio',
};

export const GRATIFICATION_COLORS: Record<GratificationType, string> = {
  hora_extra: '#3B82F6',
  gratificacao: '#10B981',
  premio: '#F59E0B',
};
