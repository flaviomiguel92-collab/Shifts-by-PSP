import { create } from 'zustand';
import { storage } from '../utils/storage';

export type Language = 'pt' | 'en';
export type CalendarTheme = 'grid' | 'classic';

interface PreferencesState {
  language: Language;
  calendarTheme: CalendarTheme;
  setLanguage: (lang: Language) => Promise<void>;
  setCalendarTheme: (theme: CalendarTheme) => Promise<void>;
  loadPreferences: () => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  language: 'pt',
  calendarTheme: 'grid',

  setLanguage: async (lang) => {
    set({ language: lang });
    await storage.setItem('pref_language', lang);
  },

  setCalendarTheme: async (theme) => {
    set({ calendarTheme: theme });
    await storage.setItem('pref_calendar_theme', theme);
  },

  loadPreferences: async () => {
    const lang = await storage.getItem('pref_language');
    if (lang === 'pt' || lang === 'en') {
      set({ language: lang });
    }
    const theme = await storage.getItem('pref_calendar_theme');
    if (theme === 'grid' || theme === 'classic') {
      set({ calendarTheme: theme });
    }
  },
}));

// ─── Minimal i18n strings used in Profile ────────────────────────────────────
export const i18n: Record<Language, Record<string, string>> = {
  pt: {
    language: 'Idioma',
    language_pt: 'Português',
    language_en: 'English',
    backup: 'Cópia de segurança',
    backup_export: 'Exportar JSON',
    backup_export_desc: 'Cópia completa de turnos, tipos, ciclos e configurações',
    backup_import: 'Importar JSON',
    backup_import_desc: 'Restaurar dados a partir de um ficheiro de backup',
    sessions: 'Sessões ativas',
    sessions_current: 'Sessão atual',
    sessions_revoke: 'Revogar',
    sessions_revoke_confirm: 'Revogar esta sessão?',
    sessions_created: 'Criada em',
    sessions_expires: 'Expira em',
    sessions_empty: 'Nenhuma sessão encontrada.',
    sessions_error: 'Erro ao carregar sessões.',
  },
  en: {
    language: 'Language',
    language_pt: 'Português',
    language_en: 'English',
    backup: 'Backup',
    backup_export: 'Export JSON',
    backup_export_desc: 'Full backup of shifts, types, cycles and settings',
    backup_import: 'Import JSON',
    backup_import_desc: 'Restore data from a backup file',
    sessions: 'Active sessions',
    sessions_current: 'Current session',
    sessions_revoke: 'Revoke',
    sessions_revoke_confirm: 'Revoke this session?',
    sessions_created: 'Created',
    sessions_expires: 'Expires',
    sessions_empty: 'No sessions found.',
    sessions_error: 'Error loading sessions.',
  },
};
