import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shift } from '../types';

interface ShiftsSummaryProps {
  shifts: Shift[];
  shiftTypes: { id: string; name: string; color?: string }[];
  month: string;
}

export const ShiftsSummary: React.FC<ShiftsSummaryProps> = ({ shifts, shiftTypes, month }) => {
  const shiftItems = useMemo(() => {
    const normalizedConfigured = (shiftTypes || [])
      .map((item) => ({
        id: String(item?.id || ''),
        name: String(item?.name || '').trim(),
        color: item?.color || '#6B7280',
      }))
      .filter((item) => item.name.length > 0);

    const configuredNames = new Set(normalizedConfigured.map((item) => item.name));
    const unknownFromShifts = Array.from(new Set((shifts || []).map((shift) => String(shift.shift_type || '').trim())))
      .filter((name) => name.length > 0 && !configuredNames.has(name))
      .map((name) => ({
        id: `from-shift-${name}`,
        name,
        color: '#6B7280',
      }));

    return [...normalizedConfigured, ...unknownFromShifts];
  }, [shiftTypes, shifts]);

  const countsByType = useMemo(() => {
    const map = new Map<string, number>();
    (shifts || []).forEach((shift) => {
      const typeName = String(shift.shift_type || '').trim();
      if (!typeName) return;
      map.set(typeName, (map.get(typeName) || 0) + 1);
    });
    return map;
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
        {shiftItems.map((item) => (
          <View key={item.id} style={styles.counterItem}>
            <Text style={[styles.counterValue, { color: item.color }]}>{countsByType.get(item.name) || 0}</Text>
            <Text style={styles.counterLabel} numberOfLines={1}>{item.name}</Text>
          </View>
        ))}
        {shiftItems.length === 0 && (
          <Text style={styles.emptyText}>Sem tipos de turno configurados</Text>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {shiftItems.map((item) => (
          <View key={item.id} style={styles.legendItem}>
            <View
              style={[
                styles.colorBox,
                { backgroundColor: item.color },
              ]}
            />
            <Text style={styles.legendLabel}>{item.name}</Text>
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
    width: '100%',
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
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 10,
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#374151',
    borderBottomColor: '#374151',
  },
  counterItem: {
    minWidth: 68,
    flexGrow: 1,
    flexShrink: 1,
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
  emptyText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
});
