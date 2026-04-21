import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShiftType, SHIFT_LABELS, SHIFT_COLORS, Shift } from '../types';

interface ShiftsSummaryProps {
  shifts: Shift[];
  month: string;
}

export const ShiftsSummary: React.FC<ShiftsSummaryProps> = ({ shifts, month }) => {
  const counts = useMemo(() => {
    const counts: Record<ShiftType, number> = {
      manha: 0,
      tarde: 0,
      noite: 0,
      ferias: 0,
      folga: 0,
      excesso: 0,
    };

    shifts.forEach((shift) => {
      counts[shift.shift_type]++;
    });

    return counts;
  }, [shifts]);

  const monthName = new Date(month + '-01').toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Turnos</Text>
        <Text style={styles.monthText}>{monthName.toUpperCase()}</Text>
      </View>

      <View style={styles.counters}>
        <View style={styles.counterItem}>
          <Text style={styles.counterValue}>{counts.noite}</Text>
          <Text style={styles.counterLabel}>Noite</Text>
        </View>
        <View style={styles.counterItem}>
          <Text style={styles.counterValue}>{counts.manha}</Text>
          <Text style={styles.counterLabel}>Manhã</Text>
        </View>
        <View style={styles.counterItem}>
          <Text style={styles.counterValue}>{counts.tarde}</Text>
          <Text style={styles.counterLabel}>Tarde</Text>
        </View>
        <View style={styles.counterItem}>
          <Text style={styles.counterValue}>{counts.folga}</Text>
          <Text style={styles.counterLabel}>Folga</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {Object.entries(SHIFT_LABELS).map(([key, label]) => (
          <View key={key} style={styles.legendItem}>
            <View
              style={[
                styles.colorBox,
                { backgroundColor: SHIFT_COLORS[key as ShiftType] },
              ]}
            />
            <Text style={styles.legendLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  monthText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  counters: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#374151',
    borderBottomColor: '#374151',
  },
  counterItem: {
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#D1D5DB',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#D1D5DB',
  },
});
