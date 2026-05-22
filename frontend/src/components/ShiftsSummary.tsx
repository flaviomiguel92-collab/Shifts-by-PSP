import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Shift } from '../types';
import { resolveShiftColor } from '../utils/helpers';
import { COLORS } from '../theme/colors';
import { useTheme } from '../theme/themes';

interface ShiftsSummaryProps {
  shifts: Shift[];
  shiftTypes: { id: string; name: string; color?: string }[];
  month: string;
}

export const ShiftsSummary: React.FC<ShiftsSummaryProps> = ({ shifts, shiftTypes, month }) => {
  const { width } = useWindowDimensions();
  const th = useTheme();
  const isLight = !th.isDark;
  const isMobileSize = width < 480;
  const shiftItems = useMemo(() => {
    const normalizedConfigured = (shiftTypes || [])
      .map((item) => ({
        id: String(item?.id || ''),
        name: String(item?.name || '').trim(),
        color: resolveShiftColor(String(item?.name || '').trim(), item?.color),
      }))
      .filter((item) => item.name.length > 0);

    const configuredNames = new Set(normalizedConfigured.map((item) => item.name));
    const unknownFromShifts = Array.from(new Set((shifts || []).map((shift) => String(shift.shift_type || '').trim())))
      .filter((name) => name.length > 0 && !configuredNames.has(name))
      .map((name) => ({
        id: `from-shift-${name}`,
        name,
        color: resolveShiftColor(name),
      }));

    return [...normalizedConfigured, ...unknownFromShifts];
  }, [shiftTypes, shifts]);

  const countsByType = useMemo(() => {
    const map = new Map<string, number>();
    const [year, monthNum] = month.split('-').map(Number);
    (shifts || []).forEach((shift) => {
      const shiftDate = new Date(String(shift.date || ''));
      if (shiftDate.getFullYear() !== year || shiftDate.getMonth() + 1 !== monthNum) return;
      const typeName = String(shift.shift_type || '').trim();
      if (!typeName) return;
      map.set(typeName, (map.get(typeName) || 0) + 1);
    });
    return map;
  }, [shifts, month]);

  const monthName = new Date(month + '-01').toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={[styles.container, isLight && { backgroundColor: th.surface, borderColor: th.borderStrong, borderWidth: 0.5 }, { padding: isMobileSize ? 12 : 16 }]}>
      <View style={styles.header}>
        <Text style={[styles.title, isLight && { color: th.textPrimary }, { fontSize: isMobileSize ? 20 : 24 }]}>Turnos</Text>
        <Text style={[styles.monthText, isLight && { color: th.textMuted }]}>{monthName.toUpperCase()}</Text>
      </View>

      <View style={[styles.counters, isLight && { borderTopColor: th.border, borderBottomColor: th.border }, { columnGap: isMobileSize ? 8 : 12, rowGap: isMobileSize ? 8 : 10 }]}>
        {shiftItems.map((item) => (
          <View key={item.id} style={[styles.counterItem, { minWidth: isMobileSize ? 60 : 68 }]}>
            <Text style={[styles.counterValue, { color: item.color, fontSize: isMobileSize ? 18 : 20 }]}>
              {countsByType.get(item.name) || 0}
            </Text>
            <Text style={[styles.counterLabel, isLight && { color: th.textSecondary }, { fontSize: isMobileSize ? 10 : 11 }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        ))}
        {shiftItems.length === 0 && (
          <Text style={[styles.emptyText, isLight && { color: th.textMuted }]}>Sem tipos de turno configurados</Text>
        )}
      </View>

      {/* Legend */}
      <View style={[styles.legend, { gap: isMobileSize ? 8 : 12 }]}>
        {shiftItems.map((item) => (
          <View key={item.id} style={[styles.legendItem, { gap: isMobileSize ? 4 : 6 }]}>
            <View
              style={[
                styles.colorBox,
                { backgroundColor: item.color },
              ]}
            />
            <Text style={[styles.legendLabel, isLight && { color: th.textSecondary }, { fontSize: isMobileSize ? 10 : 11 }]}>{item.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.backgroundSecondary,
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
    fontWeight: '500',
    color: '#FFFFFF',
  },
  monthText: {
    fontSize: 12,
    fontWeight: '500',
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
    fontWeight: '500',
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
