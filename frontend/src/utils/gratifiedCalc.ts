import { getHolidaysMap, isHoliday } from './holidays';

export type GratifiedKind = 'pequeno' | 'grande';

export type GratifiedConfig = {
  baseSmall4h: number;
  baseLarge4h: number;
  fractionSmallPerHour: number;
  fractionLargePerHour: number;
  discountPercent: number;
  smallStart: string; // "HH:MM"
  smallEnd: string;   // "HH:MM"
  largeStart: string; // "HH:MM"
  largeEnd: string;   // "HH:MM"
};

export type GratifiedLine =
  | { kind: 'base'; gratifiedKind: GratifiedKind; start: string; end: string; value: number }
  | { kind: 'fraction'; gratifiedKind: GratifiedKind; start: string; end: string; value: number };

export type GratifiedCalcResult = {
  subtotal: number;
  discountPercent: number;
  total: number;
  lines: GratifiedLine[];
  meta: {
    isHolidayOrWeekend: boolean;
    startKind: GratifiedKind;
    durationMinutes: number;
  };
};

const pad2 = (n: number) => String(n).padStart(2, '0');

export const timeToMinutes = (t: string): number => {
  const [hStr, mStr] = (t || '').split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return (h * 60 + m + 24 * 60) % (24 * 60);
};

export const minutesToTime = (mins: number): string => {
  const m = (mins % (24 * 60) + 24 * 60) % (24 * 60);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
};

export const addMinutesToTime = (t: string, delta: number): string => {
  return minutesToTime(timeToMinutes(t) + delta);
};

const inRange = (start: number, end: number, x: number): boolean => {
  // Handles overnight ranges (e.g., 18:00 -> 06:00)
  if (start <= end) return x >= start && x <= end;
  return x >= start || x <= end;
};

export const getGratifiedKindForStart = (
  startTime: string,
  config: GratifiedConfig,
  isHolidayOrWeekend: boolean
): GratifiedKind => {
  if (isHolidayOrWeekend) return 'grande';
  const m = timeToMinutes(startTime);
  const smallStart = timeToMinutes(config.smallStart);
  const smallEnd = timeToMinutes(config.smallEnd);
  // "Pequeno" if start between 06:01 and 17:59
  if (inRange(smallStart, smallEnd, m)) return 'pequeno';
  return 'grande';
};

const valueForBase = (kind: GratifiedKind, config: GratifiedConfig) =>
  kind === 'pequeno' ? config.baseSmall4h : config.baseLarge4h;
const valueForFraction = (kind: GratifiedKind, config: GratifiedConfig) =>
  kind === 'pequeno' ? config.fractionSmallPerHour : config.fractionLargePerHour;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const calcGratifiedValue = (args: {
  date: string; // YYYY-MM-DD (used for meta only)
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isHolidayOrWeekend: boolean;
  config: GratifiedConfig;
}): GratifiedCalcResult => {
  const { date, startTime, endTime, isHolidayOrWeekend, config } = args;

  // Safety rule: on Saturdays, Sundays and Portuguese national holidays,
  // all gratified blocks/fractions are always "grande".
  const d = new Date(`${date}T12:00:00`);
  const weekday = d.getDay();
  const isWeekendByDate = weekday === 0 || weekday === 6;
  const holiday = Number.isFinite(d.getTime())
    ? isHoliday(date, getHolidaysMap(d.getFullYear()))
    : undefined;
  const enforcedHolidayOrWeekend = isHolidayOrWeekend || isWeekendByDate || !!holiday;

  const startM = timeToMinutes(startTime);
  let endM = timeToMinutes(endTime);
  if (endM <= startM) endM += 24 * 60;

  const durationMinutes = Math.max(0, endM - startM);
  const durationHoursRoundedUp = Math.ceil(durationMinutes / 60);

  const lines: GratifiedLine[] = [];

  let cursorM = startM;
  let remainingHours = durationHoursRoundedUp;

  const startKind = getGratifiedKindForStart(startTime, config, enforcedHolidayOrWeekend);

  // Full 4h blocks
  while (remainingHours >= 4) {
    const kind = getGratifiedKindForStart(minutesToTime(cursorM), config, enforcedHolidayOrWeekend);
    const value = valueForBase(kind, config);
    lines.push({
      kind: 'base',
      gratifiedKind: kind,
      start: minutesToTime(cursorM),
      end: minutesToTime(cursorM + 240),
      value,
    });
    cursorM += 240;
    remainingHours -= 4;
  }

  // Fractions (per hour), with 3rd fraction converting to 1 base
  while (remainingHours > 0) {
    if (remainingHours >= 3) {
      const kind = getGratifiedKindForStart(minutesToTime(cursorM), config, enforcedHolidayOrWeekend);
      const value = valueForBase(kind, config);
      lines.push({
        kind: 'base',
        gratifiedKind: kind,
        start: minutesToTime(cursorM),
        end: minutesToTime(cursorM + 180),
        value,
      });
      cursorM += 180;
      remainingHours -= 3;
      continue;
    }

    const kind = getGratifiedKindForStart(minutesToTime(cursorM), config, enforcedHolidayOrWeekend);
    const value = valueForFraction(kind, config);
    lines.push({
      kind: 'fraction',
      gratifiedKind: kind,
      start: minutesToTime(cursorM),
      end: minutesToTime(cursorM + 60),
      value,
    });
    cursorM += 60;
    remainingHours -= 1;
  }

  const subtotal = round2(lines.reduce((sum, l) => sum + (l.value || 0), 0));
  const discountPercent = Number(config.discountPercent || 0);
  const total = round2(subtotal * (1 - discountPercent / 100));

  return {
    subtotal,
    discountPercent,
    total,
    lines,
    meta: {
      isHolidayOrWeekend: enforcedHolidayOrWeekend,
      startKind,
      durationMinutes,
    },
  };
};
