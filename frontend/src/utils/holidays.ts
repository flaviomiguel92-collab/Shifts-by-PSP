// Portuguese National Holidays
// Calculates both fixed and variable (Easter-based) holidays

// Calculate Easter Sunday using the Anonymous Gregorian algorithm
export const getEasterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
};

// Get Good Friday (2 days before Easter)
export const getGoodFriday = (year: number): Date => {
  const easter = getEasterSunday(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  return goodFriday;
};

// Get Corpus Christi (60 days after Easter)
export const getCorpusChristi = (year: number): Date => {
  const easter = getEasterSunday(year);
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  return corpusChristi;
};

// Format date as YYYY-MM-DD
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface Holiday {
  date: string;
  name: string;
  shortName: string;
}

// Get all Portuguese national holidays for a given year
export const getPortugueseHolidays = (year: number): Holiday[] => {
  const holidays: Holiday[] = [
    // Fixed holidays
    { date: `${year}-01-01`, name: 'Ano Novo', shortName: 'Ano Novo' },
    { date: `${year}-04-25`, name: 'Dia da Liberdade', shortName: 'Liberdade' },
    { date: `${year}-05-01`, name: 'Dia do Trabalhador', shortName: 'Trabalho' },
    { date: `${year}-06-10`, name: 'Dia de Portugal', shortName: 'Portugal' },
    { date: `${year}-08-15`, name: 'Assunção de Nossa Senhora', shortName: 'Assunção' },
    { date: `${year}-10-05`, name: 'Implantação da República', shortName: 'República' },
    { date: `${year}-11-01`, name: 'Dia de Todos os Santos', shortName: 'Santos' },
    { date: `${year}-12-01`, name: 'Restauração da Independência', shortName: 'Restauração' },
    { date: `${year}-12-08`, name: 'Imaculada Conceição', shortName: 'Imaculada' },
    { date: `${year}-12-25`, name: 'Natal', shortName: 'Natal' },
    
    // Variable holidays (Easter-based)
    { date: formatDateKey(getGoodFriday(year)), name: 'Sexta-feira Santa', shortName: 'Sexta Santa' },
    { date: formatDateKey(getEasterSunday(year)), name: 'Domingo de Páscoa', shortName: 'Páscoa' },
    { date: formatDateKey(getCorpusChristi(year)), name: 'Corpo de Deus', shortName: 'Corpo Deus' },
  ];
  
  return holidays;
};

// Get holidays as a map for quick lookup
export const getHolidaysMap = (year: number): Map<string, Holiday> => {
  const holidays = getPortugueseHolidays(year);
  const map = new Map<string, Holiday>();
  
  holidays.forEach(holiday => {
    map.set(holiday.date, holiday);
  });
  
  return map;
};

// Check if a date is a holiday
export const isHoliday = (dateStr: string, holidaysMap: Map<string, Holiday>): Holiday | undefined => {
  return holidaysMap.get(dateStr);
};
