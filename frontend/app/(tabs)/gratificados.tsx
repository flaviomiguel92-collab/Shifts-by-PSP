import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Platform, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '../../src/store/dataStore';
import { formatCurrency, formatMonth } from '../../src/utils/helpers';
import { getHolidaysMap } from '../../src/utils/holidays';
import { GratifiedModal } from '../../src/components/GratifiedModal';
import { FAB } from '../../src/components/ui/FAB';
import { exportGratifiedToXLSX } from '../../src/utils/exportUtils';
import { toast } from '../../src/utils/toast';

function GlassCard({ children, style }: any) {
  return <View style={[cardStyle.card, style]}>{children}</View>;
}

const cardStyle = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(11, 17, 32, 0.75)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
});

export default function GratificadosScreen() {
  const store = useDataStore() as any;
  const { gratifiedEntries, currentMonth, setCurrentMonth, currentYear } = store;

  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const year = parseInt(today.slice(0, 4));
  const holidaysMap = useMemo(() => getHolidaysMap(year), [year]);
  const todayIsHolidayOrWeekend = useMemo(() => {
    const d = new Date(today + 'T12:00:00');
    return d.getDay() === 0 || d.getDay() === 6 || holidaysMap.has(today);
  }, [today, holidaysMap]);

  const monthEntries = useMemo(() =>
    (gratifiedEntries || [])
      .filter((g: any) => String(g?.date || '').startsWith(currentMonth))
      .sort((a: any, b: any) => String(b?.date || '').localeCompare(String(a?.date || ''))),
    [gratifiedEntries, currentMonth]);

  const monthTotal = useMemo(() =>
    monthEntries.reduce((sum: number, g: any) => sum + Number(g?.value || 0), 0),
    [monthEntries]);

  const yearEntries = useMemo(() =>
    (gratifiedEntries || []).filter((g: any) => String(g?.date || '').startsWith(currentYear)),
    [gratifiedEntries, currentYear]);

  const yearTotal = useMemo(() =>
    yearEntries.reduce((sum: number, g: any) => sum + Number(g?.value || 0), 0),
    [yearEntries]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    yearEntries.forEach((g: any) => {
      const month = String(g?.date || '').slice(0, 7);
      if (!month) return;
      const prev = map.get(month) || { total: 0, count: 0 };
      map.set(month, { total: prev.total + Number(g?.value || 0), count: prev.count + 1 });
    });
    return Array.from(map.entries())
      .map(([month, data]) => ({ month, total: data.total, count: data.count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [yearEntries]);

  const goPrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const goNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Gratificados</Text>
          <Text style={styles.pageSubtitle}>{currentYear}</Text>
        </View>
        <View style={styles.totalPill}>
          <Ionicons name="cash-outline" size={14} color="#10B981" />
          <Text style={styles.totalPillText}>{formatCurrency(yearTotal)}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Month summary */}
        <GlassCard>
          <Text style={styles.cardTitle}>Resumo do mês</Text>
          <View style={styles.monthNav}>
            <TouchableOpacity style={styles.navBtn} onPress={goPrevMonth}>
              <Ionicons name="chevron-back" size={18} color="#60A5FA" />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{formatMonth(currentMonth)}</Text>
            <TouchableOpacity style={styles.navBtn} onPress={goNextMonth}>
              <Ionicons name="chevron-forward" size={18} color="#60A5FA" />
            </TouchableOpacity>
          </View>
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Ionicons name="list-outline" size={18} color="#94A3B8" style={{ marginBottom: 6 }} />
              <Text style={styles.kpiLabel}>Qtd. gratificados</Text>
              <Text style={styles.kpiValue}>{monthEntries.length}</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiBox}>
              <Ionicons name="cash-outline" size={18} color="#10B981" style={{ marginBottom: 6 }} />
              <Text style={styles.kpiLabel}>Total ganho</Text>
              <Text style={[styles.kpiValue, { color: '#10B981' }]}>{formatCurrency(monthTotal)}</Text>
            </View>
          </View>
        </GlassCard>

        {/* Month entries */}
        <GlassCard>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Gratificados do mês</Text>
            <TouchableOpacity
              style={styles.xlsxBtn}
              onPress={async () => {
                setIsExporting(true);
                try {
                  await exportGratifiedToXLSX(gratifiedEntries || [], currentYear);
                  toast.success('Excel exportado');
                } catch {
                  toast.error('Erro ao exportar Excel');
                } finally {
                  setIsExporting(false);
                }
              }}
              disabled={isExporting}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={13} color="#10B981" />
              <Text style={styles.xlsxBtnText}>Excel</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={15} color="#475569" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Pesquisar por nome…"
              placeholderTextColor="#334155"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color="#475569" />
              </TouchableOpacity>
            )}
          </View>

          {(() => {
            const q = searchQuery.trim().toLowerCase();
            const filtered = q
              ? monthEntries.filter((g: any) => String(g?.name || '').toLowerCase().includes(q))
              : monthEntries;
            if (filtered.length === 0) {
              return (
                <View style={styles.emptyState}>
                  <Ionicons name="cash-outline" size={28} color="#1E293B" />
                  <Text style={styles.emptyText}>
                    {q ? 'Nenhum resultado para esta pesquisa.' : 'Sem gratificados no mês selecionado.'}
                  </Text>
                </View>
              );
            }
            return filtered.map((g: any, i: number) => (
              <View key={g.id} style={[styles.entryRow, i === filtered.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.entryLeft}>
                  <Text style={styles.entryName}>{g.name || 'Gratificado'}</Text>
                  <View style={styles.entryMeta}>
                    <Ionicons name="calendar-outline" size={11} color="#475569" />
                    <Text style={styles.entryMetaText}>{g.date}</Text>
                    {g.start_time && (
                      <>
                        <Ionicons name="time-outline" size={11} color="#475569" />
                        <Text style={styles.entryMetaText}>{g.start_time}–{g.end_time}</Text>
                      </>
                    )}
                  </View>
                  {!!g.note && <Text style={styles.entryNote}>{g.note}</Text>}
                </View>
                <View style={styles.entryValueWrap}>
                  <Text style={styles.entryValue}>{formatCurrency(Number(g.value || 0))}</Text>
                </View>
              </View>
            ));
          })()}
        </GlassCard>

        {/* Annual summary */}
        <GlassCard>
          <Text style={styles.cardTitle}>Resumo anual</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Ionicons name="list-outline" size={18} color="#94A3B8" style={{ marginBottom: 6 }} />
              <Text style={styles.kpiLabel}>Qtd. anual</Text>
              <Text style={styles.kpiValue}>{yearEntries.length}</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiBox}>
              <Ionicons name="trending-up-outline" size={18} color="#10B981" style={{ marginBottom: 6 }} />
              <Text style={styles.kpiLabel}>Total anual</Text>
              <Text style={[styles.kpiValue, { color: '#10B981' }]}>{formatCurrency(yearTotal)}</Text>
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            {byMonth.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="bar-chart-outline" size={24} color="#1E293B" />
                <Text style={styles.emptyText}>Sem gratificados no ano atual.</Text>
              </View>
            ) : (
              byMonth.map((m, i) => {
                const pct = yearTotal > 0 ? Math.max((m.total / yearTotal) * 100, 2) : 2;
                return (
                  <View key={m.month} style={[styles.monthRow, i === byMonth.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={styles.monthRowLabel}>{formatMonth(m.month)}</Text>
                    <View style={styles.monthBarWrap}>
                      <View style={[styles.monthBar, { width: `${pct}%` as any }]} />
                    </View>
                    <Text style={styles.monthRowCount}>{m.count}×</Text>
                    <Text style={styles.monthRowTotal}>{formatCurrency(m.total)}</Text>
                  </View>
                );
              })
            )}
          </View>
        </GlassCard>

      </ScrollView>

      <GratifiedModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        date={today}
        isHolidayOrWeekend={todayIsHolidayOrWeekend}
      />

      <FAB
        actions={[
          {
            icon: 'cash-outline',
            label: 'Novo Gratificado',
            color: '#10B981',
            onPress: () => setShowModal(true),
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050816' },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#F1F5F9', letterSpacing: -0.3 },
  pageSubtitle: { fontSize: 12, color: '#475569', marginTop: 2 },
  totalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  totalPillText: { color: '#10B981', fontWeight: '700', fontSize: 13 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 12,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  xlsxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  xlsxBtnText: { color: '#10B981', fontSize: 11, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5,8,22,0.5)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#F1F5F9',
    fontSize: 13,
    padding: 0,
    backgroundColor: 'transparent',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: 'rgba(5, 8, 22, 0.5)',
    borderRadius: 12,
    padding: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { color: '#F1F5F9', fontWeight: '700', fontSize: 15 },
  kpiRow: { flexDirection: 'row' },
  kpiBox: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  kpiDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 4 },
  kpiLabel: { color: '#475569', fontSize: 11, marginBottom: 4, textAlign: 'center' },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#F1F5F9', textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  emptyText: { color: '#334155', fontSize: 13 },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 12,
  },
  entryLeft: { flex: 1 },
  entryName: { color: '#E2E8F0', fontWeight: '600', fontSize: 14, marginBottom: 4 },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  entryMetaText: { color: '#475569', fontSize: 11 },
  entryNote: { color: '#475569', fontSize: 11, marginTop: 3, fontStyle: 'italic' },
  entryValueWrap: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  entryValue: { color: '#10B981', fontWeight: '800', fontSize: 14 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 8,
  },
  monthRowLabel: { color: '#94A3B8', fontSize: 12, width: 88 },
  monthBarWrap: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  monthBar: { height: 4, backgroundColor: '#10B981', borderRadius: 2, minWidth: 4 },
  monthRowCount: { color: '#475569', fontSize: 12, width: 28, textAlign: 'right' },
  monthRowTotal: { color: '#10B981', fontWeight: '700', fontSize: 13, width: 88, textAlign: 'right' },
});
