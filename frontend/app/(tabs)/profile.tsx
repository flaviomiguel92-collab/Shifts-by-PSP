import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ScrollView, SafeAreaView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '../../src/store/dataStore';
import { useAuthStore } from '../../src/store/authStore';
import {
  exportMonthlyPDF, exportShiftsToCSV, exportGratifiedToCSV, shareCSV,
  exportFullBackup, pickAndReadJsonWeb, BackupPayload,
} from '../../src/utils/exportUtils';
import { toast } from '../../src/utils/toast';
import { getSessions, revokeSession, getOccurrences, deleteOccurrence, SessionInfo } from '../../src/services/api';
import { ReportModal } from '../../src/components/ReportModal';

type ResetScope = 'calendar' | 'gratified' | 'occurrences' | 'all';

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={15} color="#475569" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function GlassCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function CollapseBtn({
  label, expanded, onPress, danger,
}: { label: string; expanded: boolean; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={styles.collapseBtn} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.collapseBtnText, danger && { color: '#FCA5A5' }]}>{label}</Text>
      <Ionicons
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={16}
        color={danger ? '#EF4444' : '#475569'}
      />
    </TouchableOpacity>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function ProfileScreen() {
  const store = useDataStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const {
    shifts, shiftTypes, gratifiedEntries, gratifications, cycles,
    gratifiedConfig, gratifiedTemplates, currentMonth,
    deleteShiftType, resetData, resetCalendarData,
    resetGratifiedData, resetOccurrencesData,
    setGratifiedConfig, deleteGratifiedTemplate,
    restoreFromBackup,
  } = store;

  const [isBackupExpanded, setIsBackupExpanded] = useState(false);
  const [isShiftTypesExpanded, setIsShiftTypesExpanded] = useState(false);
  const [isTemplatesExpanded, setIsTemplatesExpanded] = useState(false);
  const [isExportExpanded, setIsExportExpanded] = useState(false);
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [isResetExpanded, setIsResetExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [activeReset, setActiveReset] = useState<ResetScope | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(false);
  const [isSessionsExpanded, setIsSessionsExpanded] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
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
    setSessionsLoading(true);
    setSessionsError(false);
    try {
      const list = await getSessions();
      setSessions(list);
    } catch {
      setSessionsError(true);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSessionsExpanded) loadSessions();
  }, [isSessionsExpanded, loadSessions]);

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

  const doDeleteAccount = async () => {
    if (isDeletingAccount) return;
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      // authStore clears auth state; RootLayout redirects to /login.
    } catch (err) {
      console.error('[deleteAccount]', err);
      const msg = err instanceof Error ? err.message : 'Erro ao eliminar a conta.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Erro', msg);
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteAccount = () => {
    const msg1 = 'Eliminar a conta apaga PERMANENTEMENTE todos os seus dados (turnos, ciclos, ocorrências, gratificações). Esta ação é irreversível. Continuar?';
    const msg2 = 'Tem mesmo a certeza? Não há forma de recuperar os dados.';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(msg1) && window.confirm(msg2)) {
        doDeleteAccount();
      }
      return;
    }
    Alert.alert('Eliminar Conta', msg1, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Continuar',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Confirmação Final', msg2, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar Conta', style: 'destructive', onPress: doDeleteAccount },
          ]),
      },
    ]);
  };

  const purgeOccurrencesFromApi = async () => {
    const list = await getOccurrences();
    if (!Array.isArray(list) || list.length === 0) return;
    await Promise.all(list.map(async (occ: { id?: string }) => {
      if (!occ?.id) return;
      await deleteOccurrence(occ.id);
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

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const payload: BackupPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        shiftTypes: shiftTypes || [],
        cycles: cycles || [],
        gratifiedConfig: gratifiedConfig || {},
        gratifiedTemplates: gratifiedTemplates || [],
        gratifiedEntries: gratifiedEntries || [],
        shifts: shifts || [],
        gratifications: gratifications || [],
      };
      await exportFullBackup(payload);
      toast.success('Backup exportado');
    } catch (err) {
      console.error('Backup error:', err);
      toast.error('Erro ao exportar backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Importação', 'A importação de JSON está disponível apenas na versão web.');
      return;
    }
    const confirm = typeof window !== 'undefined' && window.confirm(
      'Importar backup? Os dados locais actuais (tipos de turno, ciclos, config, templates) serão substituídos.'
    );
    if (!confirm) return;
    setIsRestoring(true);
    try {
      const payload = await pickAndReadJsonWeb();
      await restoreFromBackup(payload);
      toast.success('Backup restaurado com sucesso');
    } catch (err: any) {
      console.error('Restore error:', err);
      toast.error(err?.message || 'Erro ao restaurar backup');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Revogar esta sessão?')
      : await new Promise<boolean>((res) =>
          Alert.alert('Revogar', 'Revogar esta sessão?', [
            { text: 'Cancelar', style: 'cancel', onPress: () => res(false) },
            { text: 'Revogar', style: 'destructive', onPress: () => res(true) },
          ])
        );
    if (!confirmed) return;
    setRevokingId(sessionId);
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      toast.success('Sessão revogada');
    } catch {
      toast.error('Erro ao revogar sessão');
    } finally {
      setRevokingId(null);
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

        {/* Backup & restore */}
        <Section title="Cópia de segurança" icon="cloud-download-outline">
          <CollapseBtn
            label={isBackupExpanded ? 'Ocultar opções' : 'Exportar / Importar'}
            expanded={isBackupExpanded}
            onPress={() => setIsBackupExpanded(!isBackupExpanded)}
          />
          {isBackupExpanded && (
            <GlassCard style={{ marginTop: 8 }}>
              {[
                {
                  action: handleBackup,
                  loading: isBackingUp,
                  icon: 'archive-outline' as const,
                  label: 'Exportar JSON',
                  desc: 'Cópia completa de turnos, tipos, ciclos e configurações',
                  color: '#3B82F6',
                },
                {
                  action: handleRestore,
                  loading: isRestoring,
                  icon: 'refresh-outline' as const,
                  label: 'Importar JSON',
                  desc: 'Restaurar dados a partir de um ficheiro de backup',
                  color: '#8B5CF6',
                },
              ].map((item, i, arr) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.exportBtn, i < arr.length - 1 && styles.exportBtnBorder]}
                  onPress={item.action}
                  disabled={item.loading}
                  activeOpacity={0.75}
                >
                  <View style={[styles.exportIcon, { backgroundColor: `${item.color}18` }]}>
                    {item.loading
                      ? <ActivityIndicator size="small" color={item.color} />
                      : <Ionicons name={item.icon} size={16} color={item.color} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exportLabel}>{item.label}</Text>
                    <Text style={styles.exportDesc}>{item.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#334155" />
                </TouchableOpacity>
              ))}
            </GlassCard>
          )}
        </Section>

        {/* Shift types */}
        <Section title="Tipos de turno" icon="color-palette-outline">
          <CollapseBtn
            label={isShiftTypesExpanded ? 'Ocultar tipos' : 'Ver tipos de turno'}
            expanded={isShiftTypesExpanded}
            onPress={() => setIsShiftTypesExpanded(!isShiftTypesExpanded)}
          />
          {isShiftTypesExpanded && (
            <GlassCard style={{ marginTop: 8 }}>
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
          )}
        </Section>

        {/* Gratified templates */}
        <Section title="Gratificados guardados" icon="bookmark-outline">
          <CollapseBtn
            label={isTemplatesExpanded ? 'Ocultar templates' : 'Ver templates guardados'}
            expanded={isTemplatesExpanded}
            onPress={() => setIsTemplatesExpanded(!isTemplatesExpanded)}
          />
          {isTemplatesExpanded && (
            <GlassCard style={{ marginTop: 8 }}>
              {(!gratifiedTemplates || gratifiedTemplates.length === 0) ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Ainda não tens gratificados guardados.</Text>
                </View>
              ) : (
                gratifiedTemplates.map((tmpl: any, i: number) => (
                  <View key={tmpl.name} style={[styles.listRow, i === gratifiedTemplates.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={[styles.listRowText, { flex: 1 }]}>{tmpl.name}</Text>
                    <TouchableOpacity onPress={() => deleteGratifiedTemplate(tmpl.name)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </GlassCard>
          )}
        </Section>

        {/* Export */}
        <Section title="Exportar dados" icon="download-outline">
          <CollapseBtn
            label={isExportExpanded ? 'Ocultar exportações' : 'Ver opções de exportação'}
            expanded={isExportExpanded}
            onPress={() => setIsExportExpanded(!isExportExpanded)}
          />
          {isExportExpanded && (
            <GlassCard style={{ marginTop: 8 }}>
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
          )}
        </Section>

        {/* Report */}
        <Section title="Relatório de Serviço" icon="document-text-outline">
          <CollapseBtn
            label={isReportExpanded ? 'Ocultar relatório' : 'Gerar boletim PSP'}
            expanded={isReportExpanded}
            onPress={() => setIsReportExpanded(!isReportExpanded)}
          />
          {isReportExpanded && (
            <GlassCard style={{ marginTop: 8 }}>
              <TouchableOpacity
                style={styles.exportBtn}
                onPress={() => setShowReportModal(true)}
                activeOpacity={0.75}
              >
                <View style={[styles.exportIcon, { backgroundColor: '#6366F118' }]}>
                  <Ionicons name="document-attach-outline" size={16} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exportLabel}>Gerar Boletim (.docx)</Text>
                  <Text style={styles.exportDesc}>Preenche e descarrega o modelo oficial PSP</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#334155" />
              </TouchableOpacity>
            </GlassCard>
          )}
        </Section>

        {/* Active sessions */}
        <Section title="Sessões ativas" icon="phone-portrait-outline">
          <CollapseBtn
            label={isSessionsExpanded ? 'Ocultar sessões' : 'Ver sessões ativas'}
            expanded={isSessionsExpanded}
            onPress={() => setIsSessionsExpanded(!isSessionsExpanded)}
          />
          {isSessionsExpanded && (
            <GlassCard style={{ marginTop: 8 }}>
              {sessionsLoading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                </View>
              ) : sessionsError ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Erro ao carregar sessões.</Text>
                  <TouchableOpacity onPress={loadSessions} style={{ marginTop: 8 }}>
                    <Text style={{ color: '#3B82F6', fontSize: 13 }}>Tentar novamente</Text>
                  </TouchableOpacity>
                </View>
              ) : sessions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Nenhuma sessão encontrada.</Text>
                </View>
              ) : (
                sessions.map((s, i) => (
                  <View key={s.session_id} style={[styles.sessionRow, i === sessions.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.sessionBadgeRow}>
                        <Ionicons name="phone-portrait-outline" size={13} color={s.is_current ? '#3B82F6' : '#475569'} />
                        {s.is_current && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>Sessão atual</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.sessionMeta}>Criada em: {formatDate(s.created_at)}</Text>
                      <Text style={styles.sessionMeta}>Expira em: {formatDate(s.expires_at)}</Text>
                    </View>
                    {!s.is_current && (
                      <TouchableOpacity
                        style={[styles.revokeBtn, revokingId === s.session_id && { opacity: 0.5 }]}
                        onPress={() => handleRevokeSession(s.session_id)}
                        disabled={revokingId === s.session_id}
                        activeOpacity={0.75}
                      >
                        {revokingId === s.session_id
                          ? <ActivityIndicator size="small" color="#EF4444" />
                          : <Text style={styles.revokeBtnText}>Revogar</Text>}
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </GlassCard>
          )}
        </Section>

        {/* Config */}
        <Section title="Configurações de gratificados" icon="settings-outline">
          <CollapseBtn
            label={isConfigExpanded ? 'Ocultar configurações' : 'Mostrar configurações'}
            expanded={isConfigExpanded}
            onPress={() => setIsConfigExpanded(!isConfigExpanded)}
          />
          {isConfigExpanded && (
            <GlassCard style={{ marginTop: 8 }}>
              {cfgFields.map((f) => (
                <View key={f.key} style={styles.cfgField}>
                  <Text style={styles.cfgLabel}>{f.label}</Text>
                  <TextInput
                    placeholderTextColor="#334155"
                    value={cfg[f.key as keyof typeof cfg]}
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
          <CollapseBtn
            label={isResetExpanded ? 'Ocultar opções' : 'Opções de reset'}
            expanded={isResetExpanded}
            onPress={() => setIsResetExpanded(!isResetExpanded)}
            danger
          />
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

        {/* Delete account (GDPR erasure) */}
        <TouchableOpacity
          style={[styles.deleteAccountBtn, isDeletingAccount && { opacity: 0.6 }]}
          onPress={handleDeleteAccount}
          disabled={isDeletingAccount}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={16} color="#F87171" />
          <Text style={styles.deleteAccountText}>
            {isDeletingAccount ? 'A eliminar…' : 'Eliminar Conta'}
          </Text>
        </TouchableOpacity>

      </ScrollView>

      <ReportModal visible={showReportModal} onClose={() => setShowReportModal(false)} />
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
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#7F1D1D',
    paddingVertical: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  deleteAccountText: { color: '#F87171', fontSize: 13, fontWeight: '700' },
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
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 10,
  },
  sessionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  currentBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  currentBadgeText: { color: '#60A5FA', fontSize: 10, fontWeight: '700' },
  sessionMeta: { color: '#475569', fontSize: 11, marginTop: 1 },
  revokeBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 64,
    alignItems: 'center',
  },
  revokeBtnText: { color: '#FCA5A5', fontSize: 12, fontWeight: '700' },
});
