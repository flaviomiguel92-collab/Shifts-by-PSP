import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, SafeAreaView,
  Platform, StyleSheet, Modal, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Palette, CalendarCog, Bookmark, Download, CloudUpload,
  Smartphone, TriangleAlert, LogOut, ChevronRight, X, Trash2, Settings2,
} from 'lucide-react-native';
import { useDataStore } from '../../src/store/dataStore';
import { useAuthStore } from '../../src/store/authStore';
import { usePreferencesStore } from '../../src/store/preferencesStore';
import { useTheme } from '../../src/theme/themes';
import {
  getSessions, revokeSession, getOccurrences, deleteOccurrence, SessionInfo,
} from '../../src/services/api';
import {
  exportMonthlyPDF, exportShiftsToCSV, exportGratifiedToCSV,
  shareCSV, exportFullBackup, pickAndReadJsonWeb, BackupPayload,
} from '../../src/utils/exportUtils';
import { toast } from '../../src/utils/toast';

type ResetScope = 'calendar' | 'gratified' | 'occurrences' | 'all';
type ActiveModal = 'appearance' | 'shiftTypes' | 'templates' | 'export' | 'backup' | 'sessions' | 'reset' | 'config' | null;
type IconColor = 'purple' | 'blue' | 'teal' | 'amber' | 'coral' | 'pink' | 'red';

const ICON_LIGHT: Record<IconColor, { bg: string; ic: string }> = {
  purple: { bg: '#EEEDFE', ic: '#534AB7' },
  blue:   { bg: '#E6F1FB', ic: '#185FA5' },
  teal:   { bg: '#E1F5EE', ic: '#0F6E56' },
  amber:  { bg: '#FAEEDA', ic: '#854F0B' },
  coral:  { bg: '#FAECE7', ic: '#993C1D' },
  pink:   { bg: '#FBEAF0', ic: '#993556' },
  red:    { bg: '#FCEBEB', ic: '#A32D2D' },
};

const ICON_DARK: Record<IconColor, { bg: string; ic: string }> = {
  purple: { bg: 'rgba(107,91,217,0.18)', ic: '#A89EF8' },
  blue:   { bg: 'rgba(59,130,246,0.18)',  ic: '#60A5FA' },
  teal:   { bg: 'rgba(16,185,129,0.18)',  ic: '#34D399' },
  amber:  { bg: 'rgba(245,158,11,0.18)',  ic: '#FBBF24' },
  coral:  { bg: 'rgba(249,115,22,0.18)',  ic: '#FB923C' },
  pink:   { bg: 'rgba(236,72,153,0.18)',  ic: '#F472B6' },
  red:    { bg: 'rgba(239,68,68,0.18)',   ic: '#F87171' },
};

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return iso; }
}

// ─── ModalSheet ───────────────────────────────────────────────────────────────
function ModalSheet({
  visible, onClose, title, isLight, children,
}: {
  visible: boolean; onClose: () => void; title: string;
  isLight: boolean; children: React.ReactNode;
}) {
  const bg = isLight ? '#FFFFFF' : '#1F2937';
  const bd = isLight ? '#E8EBF0' : 'rgba(148,163,184,0.18)';
  const tc = isLight ? '#1E293B' : '#F1F5F9';
  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
        <View style={[ms.sheet, { backgroundColor: bg, borderTopColor: bd }]}>
          <View style={[ms.handle, { backgroundColor: isLight ? '#CBD5E1' : 'rgba(255,255,255,0.15)' }]} />
          <View style={[ms.header, { borderBottomColor: bd }]}>
            <Text style={[ms.title, { color: tc }]}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[ms.closeBtn, { backgroundColor: isLight ? 'rgba(15,23,42,0.06)' : 'rgba(148,163,184,0.18)' }]}
            >
              <X size={16} color={isLight ? '#64748B' : '#94A3B8'} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ms.body}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 0.5,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5,
  },
  title: { fontSize: 16, fontWeight: '500' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
});

// ─── PRow ─────────────────────────────────────────────────────────────────────
function PRow({
  Icon, color, title, subtitle, onPress, isLight, isFirst,
}: {
  Icon: React.ElementType; color: IconColor; title: string;
  subtitle: string; onPress: () => void; isLight: boolean; isFirst?: boolean;
}) {
  const c = isLight ? ICON_LIGHT[color] : ICON_DARK[color];
  return (
    <TouchableOpacity
      style={[pr.row, !isFirst && { borderTopWidth: 0.5, borderTopColor: isLight ? '#F1F5F9' : 'rgba(148,163,184,0.12)' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[pr.iconBox, { backgroundColor: c.bg }]}>
        <Icon size={16} color={c.ic} strokeWidth={2} />
      </View>
      <View style={pr.rowText}>
        <Text style={[pr.rowTitle, { color: isLight ? '#1E293B' : '#F1F5F9' }]}>{title}</Text>
        <Text style={[pr.rowSub]}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color={isLight ? '#CBD5E1' : '#475569'} strokeWidth={2} />
    </TouchableOpacity>
  );
}

const pr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  iconBox: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 12, fontWeight: '500' },
  rowSub: { fontSize: 10, fontWeight: '400', color: '#94A3B8', marginTop: 1 },
});

// ─── PGroup ───────────────────────────────────────────────────────────────────
function PGroup({ label, children, isLight }: { label: string; children: React.ReactNode; isLight: boolean }) {
  return (
    <View style={[pg.group, {
      backgroundColor: isLight ? '#FFFFFF' : '#111827',
      borderColor: isLight ? '#E8EBF0' : 'rgba(148,163,184,0.18)',
    }]}>
      <View style={[pg.header, { backgroundColor: isLight ? '#FAFBFC' : '#1F2937' }]}>
        <Text style={[pg.label, { color: isLight ? '#6B5BD9' : '#8B7FF8' }]}>{label.toUpperCase()}</Text>
      </View>
      {children}
    </View>
  );
}

const pg = StyleSheet.create({
  group: { borderRadius: 14, borderWidth: 0.5, overflow: 'hidden', marginBottom: 10 },
  header: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 5 },
  label: { fontSize: 10, fontWeight: '500', letterSpacing: 0.6 },
});

// ─── ProfileScreen ────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const store = useDataStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const calendarTheme = usePreferencesStore((s) => s.calendarTheme);
  const setCalendarTheme = usePreferencesStore((s) => s.setCalendarTheme);
  const th = useTheme();
  const isLight = !th.isDark;

  const {
    shifts, shiftTypes, gratifiedEntries, gratifications, cycles,
    gratifiedConfig, gratifiedTemplates, currentMonth,
    deleteShiftType, resetData, resetCalendarData,
    resetGratifiedData, resetOccurrencesData,
    setGratifiedConfig, deleteGratifiedTemplate, restoreFromBackup,
  } = store;

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [activeReset, setActiveReset] = useState<ResetScope | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [cfg, setCfg] = useState({
    baseSmall4h: String(gratifiedConfig?.baseSmall4h ?? ''),
    baseLarge4h: String(gratifiedConfig?.baseLarge4h ?? ''),
    fractionSmallPerHour: String(gratifiedConfig?.fractionSmallPerHour ?? ''),
    fractionLargePerHour: String(gratifiedConfig?.fractionLargePerHour ?? ''),
    discountPercent: String(gratifiedConfig?.discountPercent ?? ''),
    smallStart: String(gratifiedConfig?.smallStart ?? ''),
    smallEnd: String(gratifiedConfig?.smallEnd ?? ''),
    largeStart: String(gratifiedConfig?.largeStart ?? ''),
    largeEnd: String(gratifiedConfig?.largeEnd ?? ''),
  });

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true); setSessionsError(false);
    try { setSessions(await getSessions()); }
    catch { setSessionsError(true); }
    finally { setSessionsLoading(false); }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => { if (activeModal === 'sessions') loadSessions(); }, [activeModal, loadSessions]);

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
    : '??';

  const themeLabel: Record<string, string> = {
    grid: 'Grelha (escuro)', classic: 'Clássico (escuro)', light: 'Claro',
  };

  const bgApp = isLight ? '#FAFBFC' : th.bg;
  const tc = isLight ? '#1E293B' : '#F1F5F9';
  const ts = isLight ? '#64748B' : '#94A3B8';
  const dividBd = 'rgba(148,163,184,0.18)';
  const inputBg = isLight ? '#F8FAFC' : 'rgba(5,8,22,0.5)';
  const inputBd = isLight ? '#E2E8F0' : 'rgba(148,163,184,0.22)';

  const open = (m: ActiveModal) => setActiveModal(m);
  const close = () => setActiveModal(null);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const doLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try { await logout(); }
    catch {
      Platform.OS === 'web'
        ? window.alert('Erro ao terminar a sessão.')
        : Alert.alert('Erro', 'Erro ao terminar a sessão.');
      setIsLoggingOut(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') { window.confirm('Terminar sessão?') && doLogout(); return; }
    Alert.alert('Terminar Sessão', 'Tem a certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Terminar', style: 'destructive', onPress: doLogout },
    ]);
  };

  const doDeleteAccount = async () => {
    if (isDeletingAccount) return;
    setIsDeletingAccount(true);
    try { await deleteAccount(); }
    catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao eliminar a conta.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erro', msg);
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteAccount = () => {
    const msg = 'Eliminar a conta apaga PERMANENTEMENTE todos os seus dados. Esta ação é irreversível.';
    if (Platform.OS === 'web') {
      window.confirm(msg) && window.confirm('Tem mesmo a certeza?') && doDeleteAccount();
      return;
    }
    Alert.alert('Eliminar Conta', msg, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: doDeleteAccount },
    ]);
  };

  const handleExport = async (type: 'pdf' | 'shifts_csv' | 'gratified_csv') => {
    setIsExporting(true);
    try {
      if (type === 'pdf') {
        await exportMonthlyPDF(shifts || [], currentMonth, shiftTypes || [], currentMonth.slice(0, 4));
        toast.success('PDF gerado');
      } else if (type === 'shifts_csv') {
        await shareCSV(exportShiftsToCSV(shifts || [], currentMonth), `turnos-${currentMonth}.csv`);
        toast.success('CSV exportado');
      } else {
        await shareCSV(exportGratifiedToCSV(gratifiedEntries || [], currentMonth), `gratificados-${currentMonth}.csv`);
        toast.success('CSV exportado');
      }
    } catch { toast.error('Erro ao exportar'); }
    finally { setIsExporting(false); }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      await exportFullBackup({
        version: 1, exportedAt: new Date().toISOString(),
        shiftTypes: shiftTypes || [], cycles: cycles || [],
        gratifiedConfig: gratifiedConfig || {}, gratifiedTemplates: gratifiedTemplates || [],
        gratifiedEntries: gratifiedEntries || [], shifts: shifts || [],
        gratifications: gratifications || [],
      } as BackupPayload);
      toast.success('Backup exportado');
    } catch { toast.error('Erro ao exportar backup'); }
    finally { setIsBackingUp(false); }
  };

  const handleRestore = async () => {
    if (Platform.OS !== 'web') { Alert.alert('Importação', 'Disponível apenas na versão web.'); return; }
    if (!window.confirm('Importar backup? Os dados actuais serão substituídos.')) return;
    setIsRestoring(true);
    try {
      await restoreFromBackup(await pickAndReadJsonWeb());
      toast.success('Backup restaurado');
    } catch (err: any) { toast.error(err?.message || 'Erro ao restaurar'); }
    finally { setIsRestoring(false); }
  };

  const purgeOccurrencesFromApi = async () => {
    const list = await getOccurrences();
    if (Array.isArray(list)) await Promise.all(list.map((o: any) => o?.id && deleteOccurrence(o.id)));
  };

  const executeReset = async (scope: ResetScope) => {
    setActiveReset(scope);
    try {
      let warn: string | null = null;
      if (scope === 'calendar') await resetCalendarData();
      if (scope === 'gratified') await resetGratifiedData();
      if (scope === 'occurrences') {
        try { await purgeOccurrencesFromApi(); } catch { warn = 'Locais limpos, mas falhou no servidor.'; }
        await resetOccurrencesData();
      }
      if (scope === 'all') {
        try { await purgeOccurrencesFromApi(); } catch { warn = 'Dados locais limpos, mas ocorrências no servidor falharam.'; }
        await resetData();
      }
      warn ? Alert.alert('Concluído com aviso', warn) : Alert.alert('Sucesso', 'Dados apagados.');
    } catch { Alert.alert('Erro', 'Não foi possível concluir o reset.'); }
    finally { setActiveReset(null); }
  };

  const confirmReset = (scope: ResetScope) => {
    const labels: Record<ResetScope, string> = {
      calendar: 'Calendário', gratified: 'Gratificados', occurrences: 'Ocorrências', all: 'Tudo',
    };
    if (Platform.OS === 'web') {
      window.confirm(`Apagar ${labels[scope]}? Irreversível.`) && executeReset(scope);
      return;
    }
    Alert.alert(`Resetar ${labels[scope]}`, `Apagar dados de ${labels[scope]}? Irreversível.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', style: 'destructive', onPress: () => executeReset(scope) },
    ]);
  };

  const handleRevokeSession = async (sessionId: string) => {
    const ok = Platform.OS === 'web'
      ? window.confirm('Revogar esta sessão?')
      : await new Promise<boolean>((res) =>
          Alert.alert('Revogar', 'Revogar esta sessão?', [
            { text: 'Cancelar', onPress: () => res(false) },
            { text: 'Revogar', style: 'destructive', onPress: () => res(true) },
          ])
        );
    if (!ok) return;
    setRevokingId(sessionId);
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      toast.success('Sessão revogada');
    } catch { toast.error('Erro ao revogar sessão'); }
    finally { setRevokingId(null); }
  };

  const resetOptions: { key: ResetScope; title: string; desc: string }[] = [
    { key: 'calendar', title: 'Calendário', desc: 'Apaga turnos, tipos de turno e ciclos.' },
    { key: 'gratified', title: 'Gratificados', desc: 'Apaga templates, entradas e configurações.' },
    { key: 'occurrences', title: 'Ocorrências', desc: 'Apaga ocorrências local e no servidor.' },
    { key: 'all', title: 'Tudo', desc: 'Apaga todos os dados da aplicação.' },
  ];

  const cfgFields = [
    { key: 'baseSmall4h', label: 'Gratificado Pequeno (base 4h) €' },
    { key: 'baseLarge4h', label: 'Gratificado Grande (base 4h) €' },
    { key: 'fractionSmallPerHour', label: 'Fração Pequena (por hora) €' },
    { key: 'fractionLargePerHour', label: 'Fração Grande (por hora) €' },
    { key: 'discountPercent', label: 'Desconto aplicado %' },
    { key: 'smallStart', label: 'Horário Pequeno início (HH:MM)' },
    { key: 'smallEnd', label: 'Horário Pequeno fim (HH:MM)' },
    { key: 'largeStart', label: 'Horário Grande início (HH:MM)' },
    { key: 'largeEnd', label: 'Horário Grande fim (HH:MM)' },
  ];

  return (
    <SafeAreaView style={[s.root, { backgroundColor: bgApp }]}>
      <ScrollView style={s.scroll} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* Page title */}
        <View style={s.pageTitle}>
          <Text style={[s.pageTitleText, { color: tc }]}>Perfil</Text>
          <Text style={[s.pageTitleSub, { color: ts }]}>Conta e definições</Text>
        </View>

        {/* Hero card */}
        <LinearGradient
          colors={isLight ? ['#EEF1FE', '#F4ECFC'] : ['#0B1120', '#111827']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={[s.avatar, { backgroundColor: isLight ? '#6B5BD9' : 'rgba(59,130,246,0.2)' }]}>
            <Text style={[s.avatarText, { color: isLight ? '#FFFFFF' : '#60A5FA' }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.heroName, { color: isLight ? '#1E293B' : '#F1F5F9' }]}>{user?.name || 'Utilizador'}</Text>
            <Text style={[s.heroEmail, { color: isLight ? '#64748B' : '#94A3B8' }]}>{user?.email || ''}</Text>
          </View>
        </LinearGradient>

        {/* Groups */}
        <PGroup label="Personalização" isLight={isLight}>
          <PRow Icon={Palette} color="purple" title="Aparência"
            subtitle={themeLabel[calendarTheme] || calendarTheme}
            onPress={() => open('appearance')} isLight={isLight} isFirst />
          <PRow Icon={CalendarCog} color="blue" title="Tipos de turno"
            subtitle={`${(shiftTypes || []).length} configurados`}
            onPress={() => open('shiftTypes')} isLight={isLight} />
        </PGroup>

        <PGroup label="Dados" isLight={isLight}>
          <PRow Icon={Bookmark} color="teal" title="Templates gratificados"
            subtitle={`${(gratifiedTemplates || []).length} guardados`}
            onPress={() => open('templates')} isLight={isLight} isFirst />
          <PRow Icon={Download} color="amber" title="Exportar"
            subtitle="PDF, Excel, CSV"
            onPress={() => open('export')} isLight={isLight} />
          <PRow Icon={CloudUpload} color="coral" title="Backup"
            subtitle="Exportar / Importar JSON"
            onPress={() => open('backup')} isLight={isLight} />
          <PRow Icon={Settings2} color="purple" title="Configurações gratificados"
            subtitle="Valores e horários"
            onPress={() => open('config')} isLight={isLight} />
        </PGroup>

        <PGroup label="Conta" isLight={isLight}>
          <PRow Icon={Smartphone} color="pink" title="Sessões activas"
            subtitle={sessionsLoading ? '…' : `${sessions.length} dispositivo${sessions.length !== 1 ? 's' : ''}`}
            onPress={() => open('sessions')} isLight={isLight} isFirst />
          <PRow Icon={TriangleAlert} color="red" title="Limpar dados"
            subtitle="Reset opções"
            onPress={() => open('reset')} isLight={isLight} />
        </PGroup>

        {/* Logout */}
        <TouchableOpacity
          style={[s.logoutBtn, { backgroundColor: isLight ? '#FCEBEB' : 'rgba(239,68,68,0.12)' }, isLoggingOut && { opacity: 0.6 }]}
          onPress={handleLogout}
          disabled={isLoggingOut}
          activeOpacity={0.8}
        >
          <LogOut size={14} color={isLight ? '#A32D2D' : '#F87171'} strokeWidth={2} />
          <Text style={[s.logoutText, { color: isLight ? '#A32D2D' : '#F87171' }]}>
            {isLoggingOut ? 'A terminar…' : 'Terminar sessão'}
          </Text>
        </TouchableOpacity>

        {/* Delete account */}
        <TouchableOpacity
          style={[s.deleteBtn, isDeletingAccount && { opacity: 0.5 }]}
          onPress={handleDeleteAccount}
          disabled={isDeletingAccount}
          activeOpacity={0.75}
        >
          <Trash2 size={13} color="#F87171" strokeWidth={2} />
          <Text style={s.deleteBtnText}>{isDeletingAccount ? 'A eliminar…' : 'Eliminar conta'}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Appearance modal ─────────────────────────────────────────────────── */}
      <ModalSheet visible={activeModal === 'appearance'} onClose={close} title="Aparência" isLight={isLight}>
        {([
          { key: 'grid' as const, label: 'Grelha (escuro)', desc: 'Cartões legíveis, número colorido e nota do turno' },
          { key: 'classic' as const, label: 'Clássico (escuro)', desc: 'Célula preenchida com a cor do turno' },
          { key: 'light' as const, label: 'Claro', desc: 'Toda a app em modo claro, com a grelha legível' },
        ]).map((opt) => {
          const active = calendarTheme === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setCalendarTheme(opt.key)}
              activeOpacity={0.8}
              style={[
                m.themeOpt,
                { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)', borderColor: isLight ? '#E2E8F0' : 'rgba(148,163,184,0.22)' },
                active && { borderColor: isLight ? '#6B5BD9' : '#3B82F6', backgroundColor: isLight ? '#EEEDFE' : 'rgba(59,130,246,0.12)' },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[m.themeOptLabel, { color: active ? (isLight ? '#6B5BD9' : '#60A5FA') : tc }]}>{opt.label}</Text>
                <Text style={[m.themeOptDesc, { color: ts }]}>{opt.desc}</Text>
              </View>
              <View style={active
                ? [m.radioFill, { backgroundColor: isLight ? '#6B5BD9' : '#3B82F6' }]
                : [m.radioEmpty, { borderColor: isLight ? '#CBD5E1' : '#475569' }]} />
            </TouchableOpacity>
          );
        })}
      </ModalSheet>

      {/* ── Shift types modal ────────────────────────────────────────────────── */}
      <ModalSheet visible={activeModal === 'shiftTypes'} onClose={close} title="Tipos de turno" isLight={isLight}>
        {(!shiftTypes || shiftTypes.length === 0) ? (
          <Text style={[m.empty, { color: ts }]}>Sem tipos de turno criados.</Text>
        ) : (
          shiftTypes.map((item: any, i: number) => (
            <View key={item.id} style={[m.listRow, { borderBottomColor: dividBd }, i === shiftTypes.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[m.colorDot, { backgroundColor: item.color || '#6B5BD9' }]} />
              <Text style={[m.listText, { color: tc, flex: 1 }]}>{item.name}</Text>
              <TouchableOpacity onPress={() => deleteShiftType(item.id)} style={m.trashBtn} activeOpacity={0.7}>
                <Trash2 size={14} color="#F87171" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ModalSheet>

      {/* ── Templates modal ──────────────────────────────────────────────────── */}
      <ModalSheet visible={activeModal === 'templates'} onClose={close} title="Templates gratificados" isLight={isLight}>
        {(!gratifiedTemplates || gratifiedTemplates.length === 0) ? (
          <Text style={[m.empty, { color: ts }]}>Ainda não tens gratificados guardados.</Text>
        ) : (
          gratifiedTemplates.map((tmpl: any, i: number) => (
            <View key={tmpl.name} style={[m.listRow, { borderBottomColor: dividBd }, i === gratifiedTemplates.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={[m.listText, { color: tc, flex: 1 }]}>{tmpl.name}</Text>
              <TouchableOpacity onPress={() => deleteGratifiedTemplate(tmpl.name)} style={m.trashBtn} activeOpacity={0.7}>
                <Trash2 size={14} color="#F87171" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ModalSheet>

      {/* ── Export modal ─────────────────────────────────────────────────────── */}
      <ModalSheet visible={activeModal === 'export'} onClose={close} title="Exportar dados" isLight={isLight}>
        <Text style={[m.sectionLabel, { color: isLight ? '#6B5BD9' : '#8B7FF8' }]}>MÊS: {currentMonth}</Text>
        {[
          { type: 'pdf' as const, label: 'PDF — Escala do mês', desc: 'Calendário mensal formatado para imprimir', col: isLight ? '#A32D2D' : '#F87171' },
          { type: 'shifts_csv' as const, label: 'CSV — Turnos do mês', desc: 'Tabela de turnos para Excel', col: isLight ? '#0F6E56' : '#34D399' },
          { type: 'gratified_csv' as const, label: 'CSV — Gratificados do mês', desc: 'Tabela de gratificados para Excel', col: isLight ? '#854F0B' : '#FBBF24' },
        ].map((item, i, arr) => (
          <TouchableOpacity
            key={item.type}
            style={[m.exportRow, i < arr.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: dividBd }]}
            onPress={() => handleExport(item.type)}
            disabled={isExporting}
            activeOpacity={0.75}
          >
            <View style={[m.exportIcon, { backgroundColor: `${item.col}18` }]}>
              {isExporting
                ? <ActivityIndicator size="small" color={item.col} />
                : <Download size={16} color={item.col} strokeWidth={2} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[m.exportLabel, { color: tc }]}>{item.label}</Text>
              <Text style={[m.exportDesc, { color: ts }]}>{item.desc}</Text>
            </View>
            <ChevronRight size={16} color={isLight ? '#CBD5E1' : '#475569'} strokeWidth={2} />
          </TouchableOpacity>
        ))}
      </ModalSheet>

      {/* ── Backup modal ─────────────────────────────────────────────────────── */}
      <ModalSheet visible={activeModal === 'backup'} onClose={close} title="Backup" isLight={isLight}>
        {[
          { action: handleBackup, loading: isBackingUp, label: 'Exportar JSON', desc: 'Cópia completa de todos os dados', col: isLight ? '#185FA5' : '#60A5FA' },
          { action: handleRestore, loading: isRestoring, label: 'Importar JSON', desc: 'Restaurar a partir de um ficheiro de backup', col: isLight ? '#534AB7' : '#A89EF8' },
        ].map((item, i, arr) => (
          <TouchableOpacity
            key={item.label}
            style={[m.exportRow, i < arr.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: dividBd }]}
            onPress={item.action}
            disabled={item.loading}
            activeOpacity={0.75}
          >
            <View style={[m.exportIcon, { backgroundColor: `${item.col}18` }]}>
              {item.loading
                ? <ActivityIndicator size="small" color={item.col} />
                : <CloudUpload size={16} color={item.col} strokeWidth={2} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[m.exportLabel, { color: tc }]}>{item.label}</Text>
              <Text style={[m.exportDesc, { color: ts }]}>{item.desc}</Text>
            </View>
            <ChevronRight size={16} color={isLight ? '#CBD5E1' : '#475569'} strokeWidth={2} />
          </TouchableOpacity>
        ))}
      </ModalSheet>

      {/* ── Sessions modal ───────────────────────────────────────────────────── */}
      <ModalSheet visible={activeModal === 'sessions'} onClose={close} title="Sessões activas" isLight={isLight}>
        {sessionsLoading ? (
          <ActivityIndicator color={isLight ? '#6B5BD9' : '#3B82F6'} style={{ marginVertical: 20 }} />
        ) : sessionsError ? (
          <View style={{ alignItems: 'center', padding: 16 }}>
            <Text style={{ color: ts, marginBottom: 8 }}>Erro ao carregar sessões.</Text>
            <TouchableOpacity onPress={loadSessions}>
              <Text style={{ color: isLight ? '#6B5BD9' : '#60A5FA' }}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : sessions.length === 0 ? (
          <Text style={[m.empty, { color: ts }]}>Nenhuma sessão encontrada.</Text>
        ) : (
          sessions.map((s, i) => (
            <View key={s.session_id} style={[m.sessionRow, { borderBottomColor: dividBd }, i === sessions.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Smartphone size={13} color={s.is_current ? (isLight ? '#6B5BD9' : '#60A5FA') : ts} strokeWidth={2} />
                  {s.is_current && (
                    <View style={[m.curBadge, { backgroundColor: isLight ? '#EEEDFE' : 'rgba(59,130,246,0.15)' }]}>
                      <Text style={[m.curBadgeText, { color: isLight ? '#534AB7' : '#60A5FA' }]}>Sessão atual</Text>
                    </View>
                  )}
                </View>
                <Text style={[m.sessionMeta, { color: ts }]}>Criada: {fmtDate(s.created_at)}</Text>
                <Text style={[m.sessionMeta, { color: ts }]}>Expira: {fmtDate(s.expires_at)}</Text>
              </View>
              {!s.is_current && (
                <TouchableOpacity
                  style={[m.revokeBtn, { borderColor: isLight ? '#FECACA' : 'rgba(239,68,68,0.2)', backgroundColor: isLight ? '#FCEBEB' : 'rgba(239,68,68,0.1)' }, revokingId === s.session_id && { opacity: 0.5 }]}
                  onPress={() => handleRevokeSession(s.session_id)}
                  disabled={revokingId === s.session_id}
                  activeOpacity={0.75}
                >
                  {revokingId === s.session_id
                    ? <ActivityIndicator size="small" color="#F87171" />
                    : <Text style={[m.revokeBtnText, { color: isLight ? '#A32D2D' : '#F87171' }]}>Revogar</Text>}
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ModalSheet>

      {/* ── Reset modal ──────────────────────────────────────────────────────── */}
      <ModalSheet visible={activeModal === 'reset'} onClose={close} title="Limpar dados" isLight={isLight}>
        <Text style={[m.warningText, { color: isLight ? '#B8741F' : '#FBBF24' }]}>
          Atenção: estas operações são irreversíveis.
        </Text>
        {resetOptions.map((opt) => {
          const loading = activeReset === opt.key;
          return (
            <View key={opt.key} style={[m.resetCard, { backgroundColor: isLight ? '#FCEBEB' : 'rgba(239,68,68,0.08)', borderColor: isLight ? '#FECACA' : 'rgba(239,68,68,0.2)' }]}>
              <Text style={[m.resetTitle, { color: tc }]}>{opt.title}</Text>
              <Text style={[m.resetDesc, { color: ts }]}>{opt.desc}</Text>
              <TouchableOpacity
                style={[m.resetActionBtn, loading && { opacity: 0.5 }]}
                onPress={() => confirmReset(opt.key)}
                disabled={!!activeReset}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#F87171" />
                  : <Text style={m.resetActionText}>Resetar {opt.title}</Text>}
              </TouchableOpacity>
            </View>
          );
        })}
      </ModalSheet>

      {/* ── Config modal ─────────────────────────────────────────────────────── */}
      <ModalSheet visible={activeModal === 'config'} onClose={close} title="Configurações gratificados" isLight={isLight}>
        {cfgFields.map((f) => (
          <View key={f.key} style={[m.cfgField, { borderBottomColor: dividBd }]}>
            <Text style={[m.cfgLabel, { color: ts }]}>{f.label}</Text>
            <TextInput
              style={[m.cfgInput, { color: tc, backgroundColor: inputBg, borderColor: inputBd }]}
              placeholderTextColor={ts}
              value={cfg[f.key as keyof typeof cfg]}
              onChangeText={(v) => setCfg((prev) => ({ ...prev, [f.key]: v }))}
              keyboardType={f.key.includes('Start') || f.key.includes('End') ? 'default' : 'numeric'}
            />
          </View>
        ))}
        <TouchableOpacity
          style={[m.saveBtn, { backgroundColor: isLight ? '#0F6E56' : '#059669' }]}
          onPress={() => {
            setGratifiedConfig({
              baseSmall4h: Number(cfg.baseSmall4h),
              baseLarge4h: Number(cfg.baseLarge4h),
              fractionSmallPerHour: Number(cfg.fractionSmallPerHour),
              fractionLargePerHour: Number(cfg.fractionLargePerHour),
              discountPercent: Number(cfg.discountPercent),
              smallStart: cfg.smallStart,
              smallEnd: cfg.smallEnd,
              largeStart: cfg.largeStart,
              largeEnd: cfg.largeEnd,
            });
            Alert.alert('Guardado', 'Configurações guardadas com sucesso.');
          }}
          activeOpacity={0.85}
        >
          <Text style={m.saveBtnText}>Guardar configurações</Text>
        </TouchableOpacity>
      </ModalSheet>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 120,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  pageTitle: { marginBottom: 16, paddingHorizontal: 2 },
  pageTitleText: { fontSize: 22, fontWeight: '500' },
  pageTitleSub: { fontSize: 13, fontWeight: '400', marginTop: 2 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, marginBottom: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '500' },
  heroName: { fontSize: 15, fontWeight: '500' },
  heroEmail: { fontSize: 12, fontWeight: '400', marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 12, borderRadius: 12, marginTop: 10,
  },
  logoutText: { fontSize: 11, fontWeight: '500' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, marginTop: 4,
  },
  deleteBtnText: { color: '#F87171', fontSize: 12, fontWeight: '400' },
});

const m = StyleSheet.create({
  themeOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 0.5, marginBottom: 8,
  },
  themeOptLabel: { fontSize: 14, fontWeight: '500' },
  themeOptDesc: { fontSize: 12, marginTop: 2 },
  radioFill: { width: 18, height: 18, borderRadius: 9 },
  radioEmpty: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5 },
  empty: { textAlign: 'center', fontSize: 13, marginVertical: 20 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, gap: 10 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  listText: { fontSize: 14 },
  trashBtn: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)' },
  sectionLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 0.8, marginBottom: 12 },
  exportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  exportIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exportLabel: { fontSize: 13, fontWeight: '500' },
  exportDesc: { fontSize: 11, marginTop: 2 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, gap: 10 },
  curBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  curBadgeText: { fontSize: 10, fontWeight: '500' },
  sessionMeta: { fontSize: 11, marginTop: 1 },
  revokeBtn: { borderWidth: 0.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 64, alignItems: 'center' },
  revokeBtnText: { fontSize: 12, fontWeight: '500' },
  warningText: { fontSize: 12, marginBottom: 12 },
  resetCard: { borderRadius: 12, borderWidth: 0.5, padding: 12, marginBottom: 10 },
  resetTitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  resetDesc: { fontSize: 11, marginBottom: 10 },
  resetActionBtn: { borderRadius: 8, paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.15)' },
  resetActionText: { color: '#F87171', fontSize: 12, fontWeight: '500' },
  cfgField: { paddingVertical: 10, borderBottomWidth: 0.5 },
  cfgLabel: { fontSize: 11, fontWeight: '400', marginBottom: 6 },
  cfgInput: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 0.5, fontSize: 14 },
  saveBtn: { borderRadius: 12, paddingVertical: 12, marginTop: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
});
