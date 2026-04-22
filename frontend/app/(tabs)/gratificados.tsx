import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { HeaderWithBack } from '../../src/components/HeaderWithBack';
import { useDataStore } from '../../src/store/dataStore';
import { formatCurrency, formatMonth } from '../../src/utils/helpers';

type MonthlyRow = {
  month: string;
  total: number;
  count: number;
};

export default function GratificadosScreen() {
  const store = useDataStore() as any;
  const { gratifiedEntries, currentMonth, setCurrentMonth, currentYear } = store;

  const monthEntries = useMemo(() => {
    return (gratifiedEntries || [])
      .filter((g: any) => String(g?.date || '').startsWith(currentMonth))
      .sort((a: any, b: any) => String(b?.date || '').localeCompare(String(a?.date || '')));
  }, [gratifiedEntries, currentMonth]);

  const monthTotal = useMemo(() => {
    return monthEntries.reduce((sum: number, g: any) => sum + Number(g?.value || 0), 0);
  }, [monthEntries]);

  const yearEntries = useMemo(() => {
    return (gratifiedEntries || []).filter((g: any) => String(g?.date || '').startsWith(currentYear));
  }, [gratifiedEntries, currentYear]);

  const yearTotal = useMemo(() => {
    return yearEntries.reduce((sum: number, g: any) => sum + Number(g?.value || 0), 0);
  }, [yearEntries]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    yearEntries.forEach((g: any) => {
      const month = String(g?.date || '').slice(0, 7);
      if (!month) return;
      const prev = map.get(month) || { total: 0, count: 0 };
      map.set(month, {
        total: prev.total + Number(g?.value || 0),
        count: prev.count + 1,
      });
    });

    const rows: MonthlyRow[] = Array.from(map.entries())
      .map(([month, data]) => ({ month, total: data.total, count: data.count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return rows;
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
    <SafeAreaView style={styles.container}>
      <HeaderWithBack title="Gratificados" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gratificados</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumo do mês</Text>

          <View style={styles.monthSelector}>
            <TouchableOpacity style={styles.navBtn} onPress={goPrevMonth}>
              <Text style={styles.navBtnText}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{formatMonth(currentMonth)}</Text>
            <TouchableOpacity style={styles.navBtn} onPress={goNextMonth}>
              <Text style={styles.navBtnText}>▶</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Qtd. gratificados</Text>
              <Text style={styles.metricValue}>{monthEntries.length}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Total ganho</Text>
              <Text style={[styles.metricValue, { color: '#10B981' }]}>{formatCurrency(monthTotal)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gratificados do mês</Text>
          {monthEntries.length === 0 ? (
            <Text style={styles.emptyText}>Sem gratificados no mês selecionado.</Text>
          ) : (
            monthEntries.map((g: any) => (
              <View key={g.id} style={styles.rowItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{g.name || 'Gratificado'}</Text>
                  <Text style={styles.rowMeta}>
                    {g.date} • {g.start_time}–{g.end_time}
                  </Text>
                  {!!g.note && <Text style={styles.rowMeta}>Obs: {g.note}</Text>}
                </View>
                <Text style={styles.rowValue}>{formatCurrency(Number(g.value || 0))}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumo anual</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Qtd. anual</Text>
              <Text style={styles.metricValue}>{yearEntries.length}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Total anual</Text>
              <Text style={[styles.metricValue, { color: '#10B981' }]}>{formatCurrency(yearTotal)}</Text>
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            {byMonth.length === 0 ? (
              <Text style={styles.emptyText}>Sem gratificados no ano atual.</Text>
            ) : (
              byMonth.map((m) => (
                <View key={m.month} style={styles.monthRow}>
                  <Text style={styles.monthRowLabel}>{formatMonth(m.month)}</Text>
                  <Text style={styles.monthRowCount}>{m.count} reg.</Text>
                  <Text style={styles.monthRowTotal}>{formatCurrency(m.total)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 30 : 4,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 120,
    gap: 10,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navBtn: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  navBtnText: {
    color: '#D1D5DB',
    fontWeight: '800',
  },
  monthLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 10,
  },
  metricLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    marginBottom: 6,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  rowTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  rowMeta: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  rowValue: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 14,
    alignSelf: 'center',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  monthRowLabel: {
    flex: 1,
    color: '#D1D5DB',
    fontSize: 13,
  },
  monthRowCount: {
    color: '#9CA3AF',
    fontSize: 12,
    width: 62,
    textAlign: 'right',
  },
  monthRowTotal: {
    color: '#10B981',
    fontWeight: '700',
    width: 100,
    textAlign: 'right',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
  },
});

