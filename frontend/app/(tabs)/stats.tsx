import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';
import { useDataStore } from '../../src/store/dataStore';
import { formatCurrency, formatMonth } from '../../src/utils/helpers';
import { HeaderWithBack } from '../../src/components/HeaderWithBack';

export default function StatsScreen() {
  const { shifts, gratifiedEntries, currentYear, currentMonth, setCurrentMonth } = useDataStore();

  const yearGrats = useMemo(() => {
    return (gratifiedEntries || []).filter((g) => String(g.date || '').startsWith(currentYear));
  }, [gratifiedEntries, currentYear]);

  const yearlyTotal = useMemo(() => {
    return yearGrats.reduce((sum, g) => sum + (g.value || 0), 0);
  }, [yearGrats]);

  const monthlyMap = useMemo(() => {
    const map = {};

    yearGrats.forEach(g => {
      const month = g.date.slice(0, 7);
      if (!map[month]) map[month] = 0;
      map[month] += g.value || 0;
    });

    return map;
  }, [yearGrats]);

  const chartData = Object.entries(monthlyMap).map(([month, total]) => ({
    value: total,
    label: month.slice(5, 7),
    frontColor: '#10B981',
  }));

  const selectedMonthItems = useMemo(() => {
    return (gratifiedEntries || [])
      .filter((g) => String(g.date || '').startsWith(currentMonth))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [gratifiedEntries, currentMonth]);

  const totalSelectedMonth = useMemo(() => {
    return selectedMonthItems.reduce((sum, g) => sum + (g.value || 0), 0);
  }, [selectedMonthItems]);

  const shiftStats = useMemo(() => {
    let folgas = 0;
    let ferias = 0;
    let excesso = 0;

    shifts.forEach(s => {
      if (s.shift_type === 'folga') folgas++;
      if (s.shift_type === 'ferias') ferias++;
      if (s.shift_type === 'excesso') excesso++;
    });

    return { folgas, ferias, excesso };
  }, [shifts]);

  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithBack title="Painel" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Estatísticas</Text>
        <View style={styles.yearSelector}>
          <Text style={styles.yearText}>{currentYear}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Anual (Gratificados)</Text>
          <Text style={styles.totalValue}>{formatCurrency(yearlyTotal)}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="bed" size={20} color="#6B7280" />
            <Text style={styles.statValue}>{shiftStats.folgas}</Text>
            <Text style={styles.statLabel}>Folgas</Text>
          </View>

          <View style={styles.statBox}>
            <Ionicons name="airplane" size={20} color="#10B981" />
            <Text style={styles.statValue}>{shiftStats.ferias}</Text>
            <Text style={styles.statLabel}>Férias</Text>
          </View>

          <View style={styles.statBox}>
            <Ionicons name="flash" size={20} color="#EF4444" />
            <Text style={styles.statValue}>{shiftStats.excesso}</Text>
            <Text style={styles.statLabel}>Excesso</Text>
          </View>
        </View>

        {chartData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Gratificados por mês</Text>

            <BarChart
              data={chartData}
              barWidth={28}
              spacing={16}
              roundedTop
              xAxisThickness={0}
              yAxisThickness={0}
              noOfSections={4}
              maxValue={Math.max(...chartData.map(d => d.value), 100)}
              isAnimated
              barBorderRadius={4}
              hideRules
            />
          </View>
        )}

        <View style={styles.listCard}>
          <Text style={styles.listTitle}>Resumo mensal</Text>

          {Object.entries(monthlyMap).map(([month, total]) => (
            <View key={month} style={styles.listItem}>
              <Text style={styles.listMonth}>{formatMonth(month)}</Text>
              <Text style={styles.listValue}>{formatCurrency(total)}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.listCard, { marginTop: 16 }]}>
          <Text style={styles.listTitle}>Gratificados do mês</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <TouchableOpacity
              style={{ paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#111827', borderRadius: 8 }}
              onPress={() => {
                const [y, m] = currentMonth.split('-').map(Number);
                const d = new Date(y, m - 2, 1);
                setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
              }}
            >
              <Text style={{ color: '#D1D5DB', fontWeight: '700' }}>◀</Text>
            </TouchableOpacity>
            <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{formatMonth(currentMonth)}</Text>
            <TouchableOpacity
              style={{ paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#111827', borderRadius: 8 }}
              onPress={() => {
                const [y, m] = currentMonth.split('-').map(Number);
                const d = new Date(y, m, 1);
                setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
              }}
            >
              <Text style={{ color: '#D1D5DB', fontWeight: '700' }}>▶</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 16, marginBottom: 10 }}>
            Total: {formatCurrency(totalSelectedMonth)}
          </Text>

          {selectedMonthItems.length === 0 ? (
            <Text style={{ color: '#6B7280' }}>Sem gratificados neste mês.</Text>
          ) : (
            selectedMonthItems.map((g: any) => (
              <View key={g.id} style={[styles.listItem, { flexDirection: 'column', alignItems: 'stretch' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{g.name}</Text>
                  <Text style={{ color: '#10B981', fontWeight: '800' }}>{formatCurrency(Number(g.value || 0))}</Text>
                </View>
                <Text style={{ color: '#9CA3AF', marginTop: 4 }}>
                  {g.date} • {g.start_time}–{g.end_time}
                </Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 16,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  yearSelector: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  yearText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 150 },

  totalCard: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },

  totalLabel: { color: '#D1FAE5', fontSize: 14 },
  totalValue: { color: '#FFFFFF', fontSize: 32, fontWeight: '800' },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  statBox: {
    flex: 1,
    backgroundColor: '#1F2937',
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
  },

  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },

  chartCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  chartTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },

  listCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
  },

  listTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },

  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },

  listMonth: {
    color: '#D1D5DB',
  },

  listValue: {
    color: '#10B981',
    fontWeight: '700',
  },
});