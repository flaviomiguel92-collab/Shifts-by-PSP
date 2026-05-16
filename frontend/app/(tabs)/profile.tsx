import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ScrollView, SafeAreaView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDataStore } from '../../src/store/dataStore';
import { useAuthStore } from '../../src/store/authStore';
import { storage } from '../../src/utils/storage';
import { exportMonthlyPDF, exportShiftsToCSV, exportGratifiedToCSV, shareCSV } from '../../src/utils/exportUtils';
import { toast } from '../../src/utils/toast';

type ResetScope = 'calendar' | 'gratified' | 'occurrences' | 'all';

const API_ROOT = process.env.EXPO_PUBLIC_API_URL || 'https://shift-olama-backend.onrender.com';
const buildOccurrencesEndpoint = () => `${API_ROOT.replace(/\/$/, '')}/api/occurrences`;

function Section({ title, icon, children }: any) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={15} color="#475569" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function GlassCard({ children, style }: any) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export default function ProfileScreen() {
  const router = useRouter();
  const store = useDataStore() as any;
  const user = useAuthStore((s: any) => s.user);
  const logout = useAuthStore((s: any) => s.logout);
  const {
    shifts, shiftTypes, gratifiedEntries, currentMonth,
    deleteShiftType, resetData, resetCalendarData,
    resetGratifiedData, resetOccurrencesData,
    gratifiedConfig, setGratifiedConfig, gratifiedTemplates, deleteGratifiedTemplate,
  } = store;

  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [isResetExpanded, setIsResetExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeReset, setActiveReset] = useState<ResetScope | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

  const resetOptions = useMemo(() => [
    { key: 'calendar' as ResetScope, title: 'Calendário', desc: 'Apaga turnos, tipos de turno, gratificações e ciclos.', icon: 'calendar-outline' },
    { key: 'gratified' as ResetScope, title: 'Gratificados', desc: 'Apaga templates, entradas e configurações.', icon: 'cash-outline' },
    { key: 'occurrences' as ResetScope, title: 'Ocorrências', desc: 'Apaga as ocorrências do backend e estado local.', icon: 'document-text-outline' },
    { key: 'all' as ResetScope, title: 'Tudo', desc: 'Apaga todos os dados da aplicação neste perfil.', icon: 'trash-outline' },
  ], []);

  const doLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      // Navigation handled by _layout.tsx watching isAuthenticated
    } catch (err) {
      console.error('[logout]', err);
      if (Platform.OS === 'web') {
        window.alert('Erro ao terminar a sessão. Tente novamente.');
      } else {
        Alert.alert('Erro', 'Erro ao terminar a sessão');
      }
      setIsLoggingOut(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Terminar sessão? Irá sair da aplicação.')) {
        doLogout();
      }
      return;
    }
    Alert.alert('Terminar Sessão', 'Tem a certeza que deseja terminar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Terminar', style: 'destructive', onPress: doLogout },
    ]);
  };

  const purgeOccurrencesFromApi = async () => {
    const token = await storage.getItem('session_token');
    const ep = buildOccurrencesEndpoint();
    const res = await fetch(ep, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) return;
    await Promise.all(list.map(async (occ: { id?: string }) => {
      if (!occ?.id) return;
      const dr = await fetch(`${ep}/${occ.id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' });
      if (!dr.ok && dr.status !== 404) throw new Error(`HTTP ${dr.status}`);
    }));
  };

  const executeReset = async (scope: ResetScope) => {
    setActiveReset(scope);
    try {
      let warn: string | null = null;
      if (scope === 'calendar') await resetCalendarData();
      if (scope === 'gratified') await resetGratifiedData();
      if (scope === 'occurrences') {
        try { await purgeOccurrencesFromApi(); } catch { warn = 'Locais limpos, mas não foi possível limpar no servidor.'; }
        await resetOccurrencesData();
      }
      if (scope === 'all') {
        try { await purgeOccurrencesFromApi(); } catch { warn = 'Dados locais limpos, mas não foi possível limpar ocorrências no servidor.'; }
        await resetData();
      }
      if (warn) {
        Alert.alert('Concluído com aviso', warn);
      } else {
        Alert.alert('Sucesso', 'Dados apagados com sucesso.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível concluir o reset.');
    } finally {
      setActiveReset(null);
    }
  };

  const handleExport = async (type: 'pdf' | 'shifts_csv' | 'gratified_csv') => {
    setIsExporting(true);
    try {
      if (type === 'pdf') {
        await exportMonthlyPDF(shifts || [], currentMonth, shiftTypes || [], currentMonth.slice(0, 4));
        toast.success('PDF gerado');
      } else if (type === 'shifts_csv') {
        const csv = exportShiftsToCSV(shifts || [], currentMonth);
        await shareCSV(csv, `turnos-${currentMonth}.csv`);
        toast.success('CSV de turnos exportado');
      } else {
        const csv = exportGratifiedToCSV(gratifiedEntries || [], currentMonth);
        await shareCSV(csv, `gratificados-${currentMonth}.csv`);
        toast.success('CSV de gratificados exportado');
      }
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Erro ao exportar');
    } finally {
      setIsExporting(false);
    }
  };

  const confirmReset = (scope: ResetScope) => {
    const labels: Record<ResetScope, string> = { calendar: 'Calendário', gratified: 'Gratificados', occurrences: 'Ocorrências', all: 'Tudo' };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Apagar ${labels[scope]}? Irreversível.`)) executeReset(scope);
      return;
    }
    Alert.alert(`Resetar ${labels[scope]}`, `Apagar dados de ${labels[scope]}? Irreversível.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', style: 'destructive', onPress: () => executeReset(scope) },
    ]);
  };

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
    : '??';

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
    <SafeAreaView style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User hero */}
        <LinearGradient
          colors={['#0B1120', '#111827']}
          style={styles.userHero}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'Utilizador'}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
          </View>
        </LinearGradient>

        {/* Shift types */}
        <Section title="Tipos de turno" icon="color-palette-outline">
          <GlassCard>
            {(!shiftTypes || shiftTypes.length === 0) ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Sem tipos de turno criados.</Text>
              </View>
            ) : (
              shiftTypes.map((item: any, i: number) => (
                <View key={item.id} style={[styles.listRow, i === shiftTypes.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[styles.colorDot, { backgroundColor: item.color || '#475569' }]} />
                  <Text style={styles.listRowText}>{item.name}</Text>
                  <TouchableOpacity onPress={() => deleteShiftType(item.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </GlassCard>
        </Section>

        {/* Gratified templates */}
        <Section title="Gratificados guardados" icon="bookmark-outline">
          <GlassCard>
            {(!gratifiedTemplates || gratifiedTemplates.length === 0) ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Ainda não tens gratificados guardados.</Text>
              </View>
            ) : (
              gratifiedTemplates.map((t: any, i: number) => (
                <View key={t.name} style={[styles.listRow, i === gratifiedTemplates.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={[styles.listRowText, { flex: 1 }]}>{t.name}</Text>
                  <TouchableOpacity onPress={() => deleteGratifiedTemplate(t.name)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </GlassCard>
        </Section>

        {/* Export */}
        <Section title="Exportar dados" icon="download-outline">
          <GlassCard>
            <Text style={styles.exportMonthLabel}>Mês: {currentMonth}</Text>
            {[
              { type: 'pdf' as const, icon: 'document-text-outline' as const, label: 'PDF — Escala do mês', color: '#EF4444', desc: 'Calendário mensal formatado para imprimir' },
              { type: 'shifts_csv' as const, icon: 'grid-outline' as const, label: 'CSV — Turnos do mês', color: '#10B981', desc: 'Tabela de turnos para Excel' },
              { type: 'gratified_csv' as const, icon: 'cash-outline' as const, label: 'CSV — Gratificados do mês', color: '#F59E0B', desc: 'Tabela de gratificados para Excel' },
            ].map((item, i, arr) => (
              <TouchableOpacity
                key={item.type}
                style={[styles.exportBtn, i < arr.length - 1 && styles.exportBtnBorder]}
                onPress={() => handleExport(item.type)}
                disabled={isExporting}
                activeOpacity={0.75}
              >
                <View style={[styles.exportIcon, { backgroundColor: `${item.color}18` }]}>
                  {isExporting ? (
                    <ActivityIndicator size="small" color={item.color} />
                  ) : (
                    <Ionicons name={item.icon} size={16} color={item.color} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exportLabel}>{item.label}</Text>
                  <Text style={styles.exportDesc}>{item.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#334155" />
              </TouchableOpacity>
            ))}
          </GlassCard>
        </Section>

        {/* Config */}
        <Section title="Configurações de gratificados" icon="settings-outline">
          <TouchableOpacity
            style={styles.collapseBtn}
            onPress={() => setIsConfigExpanded(!isConfigExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.collapseBtnText}>
              {isConfigExpanded ? 'Ocultar configurações' : 'Mostrar configurações'}
            </Text>
            <Ionicons name={isConfigExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#475569" />
          </TouchableOpacity>

          {isConfigExpanded && (
            <GlassCard style={{ marginTop: 8 }}>
              {cfgFields.map((f) => (
                <View key={f.key} style={styles.cfgField}>
                  <Text style={styles.cfgLabel}>{f.label}</Text>
                  <TextInput
                    placeholderTextColor="#334155"
                    value={(cfg as any)[f.key]}
                    onChangeText={(v) => setCfg((prev) => ({ ...prev, [f.key]: v }))}
                    style={styles.cfgInput}
                    keyboardType={f.key.includes('Start') || f.key.includes('End') ? 'default' : 'numeric'}
                  />
                </View>
              ))}
              <TouchableOpacity
                style={styles.saveConfigBtn}
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
                  Alert.alert('OK', 'Configurações guardadas.');
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={styles.saveConfigText}>Guardar Configurações</Text>
              </TouchableOpacity>
            </GlassCard>
          )}
        </Section>

        {/* Reset */}
        <Section title="Limpar dados" icon="warning-outline">
          <TouchableOpacity
            style={styles.collapseBtn}
            onPress={() => setIsResetExpanded(!isResetExpanded)}
            activeOpacity={0.7}
          >
            <Text style={[styles.collapseBtnText, { color: '#FCA5A5' }]}>
              {isResetExpanded ? 'Ocultar opções' : 'Opções de reset'}
            </Text>
            <Ionicons name={isResetExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#EF4444" />
          </TouchableOpacity>

          {isResetExpanded && (
            <View style={{ gap: 8, marginTop: 8 }}>
              {resetOptions.map((opt) => {
                const loading = activeReset === opt.key;
                return (
                  <GlassCard key={opt.key} style={{ borderColor: 'rgba(239, 68, 68, 0.15)' }}>
                    <View style={styles.resetRow}>
                      <Ionicons name={opt.icon as any} size={18} color="#EF4444" />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.resetTitle}>{opt.title}</Text>
                        <Text style={styles.resetDesc}>{opt.desc}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => confirmReset(opt.key)}
                      disabled={!!activeReset}
                      style={[styles.resetBtn, loading && styles.resetBtnLoading]}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.resetBtnText}>
                        {loading ? 'A processar...' : `Resetar ${opt.title}`}
                      </Text>
                    </TouchableOpacity>
                  </GlassCard>
                );
              })}
            </View>
          )}
        </Section>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, isLoggingOut && { opacity: 0.6 }]}
          onPress={handleLogout}
          disabled={isLoggingOut}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutText}>Terminar Sessão</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050816' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 0,
    paddingBottom: 120,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  userHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: -14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#60A5FA', fontSize: 18, fontWeight: '800' },
  userInfo: { flex: 1 },
  userName: { color: '#F1F5F9', fontSize: 17, fontWeight: '700' },
  userEmail: { color: '#475569', fontSize: 12, marginTop: 2 },
  section: { marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: 'rgba(11, 17, 32, 0.75)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 10,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  listRowText: { color: '#CBD5E1', fontSize: 14, flex: 1 },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  emptyState: { paddingVertical: 16, alignItems: 'center' },
  emptyText: { color: '#334155', fontSize: 13 },
  collapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(11, 17, 32, 0.75)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  collapseBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  cfgField: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  cfgLabel: { color: '#475569', fontSize: 11, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  cfgInput: {
    backgroundColor: 'rgba(5, 8, 22, 0.5)',
    color: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    fontSize: 14,
  },
  saveConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  saveConfigText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  resetRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  resetTitle: { color: '#F1F5F9', fontWeight: '600', fontSize: 14 },
  resetDesc: { color: '#475569', fontSize: 12, marginTop: 2 },
  resetBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resetBtnLoading: { opacity: 0.5 },
  resetBtnText: { color: '#FCA5A5', fontWeight: '700', fontSize: 13 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 28,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  logoutText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  exportMonthLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingVertical: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    marginBottom: 4,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  exportBtnBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  exportIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportLabel: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
  },
  exportDesc: {
    color: '#475569',
    fontSize: 12,
    marginTop: 2,
  },
});
