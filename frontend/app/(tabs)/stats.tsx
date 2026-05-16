import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  Platform, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';
import { useDataStore } from '../../src/store/dataStore';
import { formatCurrency, formatMonth, resolveShiftColor } from '../../src/utils/helpers';
import { StatCard, StatCardRow } from '../../src/components/ui/StatCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { COLORS } from '../../src/theme/colors';

function GlassCard({ children, style }: any) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export default function StatsScreen() {
  const { gratifiedEntries, shifts, shiftTypes, currentYear, currentMonth, setCurrentMonth } = useDataStore() as any;

  const yearGrats = useMemo(() =>
    (gratifiedEntries || []).filter((g: any) => String(g.date || '').startsWith(currentYear)),
    [gratifiedEntries, currentYear]);

  const yearlyTotal = useMemo(() =>
    yearGrats.reduce((sum: number, g: any) => sum + (g.value || 0), 0),
    [yearGrats]);

  const monthlyMap = useMemo(() => {
    const map: Record<string, number> = {};
    yearGrats.forEach((g: any) => {
      const month = g.date.slice(0, 7);
      if (!map[month]) map[month] = 0;
      map[month] += g.value || 0;
    });
    return map;
  }, [yearGrats]);

  const chartData = Object.entries(monthlyMap).map(([month, total]) => ({
    value: total as number,
    label: month.slice(5, 7),
    frontColor: '#3B82F6',
    gradientColor: '#1D4ED8',
  }));

  const selectedMonthItems = useMemo(() =>
    (gratifiedEntries || [])
      .filter((g: any) => String(g.date || '').startsWith(currentMonth))
      .sort((a: any, b: any) => String(b.date || '').localeCompare(String(a.date || ''))),
    [gratifiedEntries, currentMonth]);

  const totalSelectedMonth = useMemo(() =>
    selectedMonthItems.reduce((sum: number, g: any) => sum + (g.value || 0), 0),
    [selectedMonthItems]);

  const avgMonth = yearGrats.length > 0
    ? yearlyTotal / Math.max(Object.keys(monthlyMap).length, 1)
    : 0;

  // ── New KPI metrics ──────────────────────────────────────────
  const yearShifts = useMemo(() =>
    (shifts || []).filter((s: any) => String(s.date || '').startsWith(currentYear)),
    [shifts, currentYear]);

  const monthShifts = useMemo(() =>
    (shifts || []).filter((s: any) => String(s.date || '').startsWith(currentMonth)),
    [shifts, currentMonth]);

  // Night shifts: shift types where start_time >= 18:00 OR in a type named with noite/night heuristic
  const nightShiftNames = useMemo(() => {
    const names = new Set<string>();
    (shiftTypes || []).forEach((st: any) => {
      const name = String(st.name || '').toLowerCase();
      const start = String(st.start_time || st.startTime || '');
      if (name.includes('noit') || name.includes('night') || name.includes('24h')) {
        names.add(st.name);
      } else if (start >= '18:00' || start < '06:00') {
        if (start) names.add(st.name);
      }
    });
    return names;
  }, [shiftTypes]);

  const nightShiftsMonth = useMemo(() =>
    monthShifts.filter((s: any) => nightShiftNames.has(s.shift_type)).length,
    [monthShifts, nightShiftNames]);

  // Days off: any shift type with name containing folga/off/descanso or is_working === false
  const offNames = useMemo(() => {
    const names = new Set<string>();
    (shiftTypes || []).forEach((st: any) => {
      const name = String(st.name || '').toLowerCase();
      if (name.includes('folga') || name.includes('off') || name.includes('descanso') || st.is_working === false) {
        names.add(st.name);
      }
    });
    return names;
  }, [shiftTypes]);

  const daysOffMonth = useMemo(() =>
    monthShifts.filter((s: any) => offNames.has(s.shift_type)).length,
    [monthShifts, offNames]);

  // Shift type distribution for current month
  const shiftTypeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    monthShifts.forEach((s: any) => {
      const name = String(s.shift_type || '');
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => {
        const st = (shiftTypes || []).find((t: any) => t.name === name);
        return { name, count, color: resolveShiftColor(name, st?.color) };
      })
      .sort((a, b) => b.count - a.count);
  }, [monthShifts, shiftTypes]);

  // Yearly heatmap data
  const heatmapData = useMemo(() => {
    const shiftMap = new Map<string, string>();
    yearShifts.forEach((s: any) => {
      const st = (shiftTypes || []).find((t: any) => t.name === s.shift_type);
      shiftMap.set(s.date, resolveShiftColor(s.shift_type, st?.color));
    });
    const months: { monthStr: string; cells: (string | null)[] }[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthStr = `${currentYear}-${String(m).padStart(2, '0')}`;
      const daysInMonth = new Date(parseInt(currentYear), m, 0).getDate();
      const firstDayOfWeek = new Date(`${monthStr}-01T12:00:00`).getDay();
      const cells: (string | null)[] = [];
      for (let pad = 0; pad < firstDayOfWeek; pad++) cells.push(null);
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
        cells.push(shiftMap.get(dateStr) ?? '');
      }
      months.push({ monthStr, cells });
    }
    return months;
  }, [yearShifts, shiftTypes, currentYear]);

  const MONTH_ABBR: Record<string, string> = {
    '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
    '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
  };

  // Consecutive working days up to today in the current month
  const consecutiveWorkingDays = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const sortedShifts = monthShifts
      .filter((s: any) => !offNames.has(s.shift_type) && s.date <= today)
      .map((s: any) => s.date)
      .sort()
      .reverse();
    let count = 0;
    let prev: Date | null = null;
    for (const dateStr of sortedShifts) {
      const d = new Date(dateStr + 'T12:00:00');
      if (!prev) { count = 1; prev = d; continue; }
      const diff = (prev.getTime() - d.getTime()) / 86400000;
      if (diff === 1) { count++; prev = d; } else break;
    }
    return count;
  }, [monthShifts, offNames]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Painel</Text>
          <Text style={styles.pageSubtitle}>Estatísticas · {currentYear}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero total card */}
        <LinearGradient
          colors={['#0F2850', '#1D4ED8', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroGlow} />
          <Text style={styles.heroLabel}>Total Anual (Gratificados)</Text>
          <Text style={styles.heroValue}>{formatCurrency(yearlyTotal)}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{yearGrats.length}</Text>
              <Text style={styles.heroStatLabel}>Entradas</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{formatCurrency(avgMonth)}</Text>
              <Text style={styles.heroStatLabel}>Média/mês</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Monthly KPI cards */}
        <SectionHeader
          title={`Resumo de ${formatMonth(currentMonth)}`}
          style={{ paddingHorizontal: 4 }}
        />
        <StatCardRow>
          <StatCard
            label="Turnos este mês"
            value={monthShifts.length}
            icon="calendar-outline"
            color={COLORS.primary}
            size="sm"
          />
          <StatCard
            label="Noites"
            value={nightShiftsMonth}
            icon="moon-outline"
            color={COLORS.secondary}
            size="sm"
          />
        </StatCardRow>
        <StatCardRow style={{ marginTop: 10 }}>
          <StatCard
            label="Folgas"
            value={daysOffMonth}
            icon="bed-outline"
            color={COLORS.textTertiary}
            size="sm"
          />
          <StatCard
            label="Dias consecutivos"
            value={consecutiveWorkingDays}
            icon="flame-outline"
            color={COLORS.warning}
            size="sm"
          />
        </StatCardRow>

        {/* Shift type breakdown */}
        {shiftTypeBreakdown.length > 0 && (
          <GlassCard>
            <SectionHeader title="Turnos do mês por tipo" />
            {shiftTypeBreakdown.map((item, i) => {
              const pct = monthShifts.length > 0 ? (item.count / monthShifts.length) * 100 : 0;
              return (
                <View key={item.name} style={[styles.tableRow, i === shiftTypeBreakdown.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[styles.typeDot, { backgroundColor: item.color }]} />
                  <Text style={styles.tableMonth}>{item.name}</Text>
                  <View style={styles.tableBarWrap}>
                    <View style={[styles.tableBar, { width: `${Math.max(pct, 2)}%` as any, backgroundColor: item.color }]} />
                  </View>
                  <Text style={styles.tableValue}>{item.count}×</Text>
                </View>
              );
            })}
          </GlassCard>
        )}

        {/* Yearly heatmap */}
        <GlassCard>
          <Text style={styles.cardTitle}>Calendário anual de turnos · {currentYear}</Text>
          <View style={styles.heatmapGrid}>
            {heatmapData.map((month) => (
              <View key={month.monthStr} style={styles.heatmapMonth}>
                <Text style={styles.heatmapMonthLabel}>{MONTH_ABBR[month.monthStr.slice(5, 7)]}</Text>
                <View style={styles.heatmapDayGrid}>
                  {month.cells.map((color, i) => (
                    <View
                      key={i}
                      style={[
                        styles.heatmapDay,
                        color === null
                          ? { backgroundColor: 'transparent' }
                          : color
                          ? { backgroundColor: color, opacity: 0.85 }
                          : { backgroundColor: 'rgba(255,255,255,0.05)' },
                      ]}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Bar chart */}
        {chartData.length > 0 && (
          <GlassCard>
            <Text style={styles.cardTitle}>Gratificados por mês</Text>
            <BarChart
              data={chartData}
              barWidth={26}
              spacing={14}
              roundedTop
              xAxisThickness={0}
              yAxisThickness={0}
              noOfSections={4}
              maxValue={Math.max(...chartData.map((d) => d.value), 100)}
              isAnimated
              barBorderRadius={6}
              hideRules
              yAxisTextStyle={{ color: '#475569', fontSize: 10 }}
              xAxisLabelTextStyle={{ color: '#475569', fontSize: 10 }}
              renderTooltip={(item: any) => (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipText}>{formatCurrency(item.value)}</Text>
                </View>
              )}
            />
          </GlassCard>
        )}

        {/* Monthly breakdown table */}
        <GlassCard>
          <Text style={styles.cardTitle}>Breakdown mensal</Text>
          {Object.entries(monthlyMap).length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={28} color="#1E293B" />
              <Text style={styles.emptyText}>Sem dados anuais.</Text>
            </View>
          ) : (
            Object.entries(monthlyMap)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([month, total], i, arr) => {
                const max = Math.max(...Object.values(monthlyMap) as number[]);
                const pct = max > 0 ? Math.max(((total as number) / max) * 100, 2) : 2;
                return (
                  <View key={month} style={[styles.tableRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={styles.tableMonth}>{formatMonth(month)}</Text>
                    <View style={styles.tableBarWrap}>
                      <View style={[styles.tableBar, { width: `${pct}%` as any }]} />
                    </View>
                    <Text style={styles.tableValue}>{formatCurrency(total as number)}</Text>
                  </View>
                );
              })
          )}
        </GlassCard>

        {/* Month detail */}
        <GlassCard>
          <Text style={styles.cardTitle}>Detalhe do mês</Text>
          <View style={styles.monthNav}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => {
                const [y, m] = currentMonth.split('-').map(Number);
                const d = new Date(y, m - 2, 1);
                setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
              }}
            >
              <Ionicons name="chevron-back" size={18} color="#60A5FA" />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{formatMonth(currentMonth)}</Text>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => {
                const [y, m] = currentMonth.split('-').map(Number);
                const d = new Date(y, m, 1);
                setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
              }}
            >
              <Ionicons name="chevron-forward" size={18} color="#60A5FA" />
            </TouchableOpacity>
          </View>

          <View style={styles.monthTotalRow}>
            <Ionicons name="cash-outline" size={16} color="#10B981" />
            <Text style={styles.monthTotalLabel}>Total</Text>
            <Text style={styles.monthTotalValue}>{formatCurrency(totalSelectedMonth)}</Text>
          </View>

          {selectedMonthItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Sem gratificados neste mês.</Text>
            </View>
          ) : (
            selectedMonthItems.map((g: any, i: number) => (
              <View key={g.id} style={[styles.tableRow, i === selectedMonthItems.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryName}>{g.name}</Text>
                  <Text style={styles.entryMeta}>{g.date} · {g.start_time}–{g.end_time}</Text>
                </View>
                <Text style={styles.entryValue}>{formatCurrency(Number(g.value || 0))}</Text>
              </View>
            ))
          )}
        </GlassCard>

      </ScrollView>
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
  heroCard: {
    borderRadius: 20,
    padding: 22,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  heroGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    right: -60,
    top: -60,
  },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, letterSpacing: 0.5, marginBottom: 6 },
  heroValue: { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1, marginBottom: 18 },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { color: '#fff', fontWeight: '800', fontSize: 16 },
  heroStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  heroStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 12 },
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
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },
  tooltip: {
    backgroundColor: '#0B1120',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  tooltipText: { color: '#60A5FA', fontSize: 10, fontWeight: '700' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 10,
  },
  tableMonth: { color: '#94A3B8', fontSize: 12, width: 88 },
  tableBarWrap: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  tableBar: { height: 4, backgroundColor: '#3B82F6', borderRadius: 2, minWidth: 4 },
  tableValue: { color: '#10B981', fontWeight: '700', fontSize: 13, width: 90, textAlign: 'right' },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
  monthTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  monthTotalLabel: { color: '#94A3B8', fontSize: 13, flex: 1 },
  monthTotalValue: { color: '#10B981', fontWeight: '800', fontSize: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { color: '#334155', fontSize: 13 },
  entryName: { color: '#E2E8F0', fontWeight: '600', fontSize: 14 },
  entryMeta: { color: '#475569', fontSize: 11, marginTop: 2 },
  entryValue: { color: '#10B981', fontWeight: '800', fontSize: 14 },
  typeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heatmapMonth: {
    width: '46%',
  },
  heatmapMonthLabel: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heatmapDayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  heatmapDay: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
});
