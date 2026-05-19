import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Shift } from '../../types';
import { resolveShiftColor } from '../../utils/helpers';

interface GridSummaryProps {
  shifts: Shift[];
  shiftTypes: { id: string; name: string; color?: string }[];
  month: string; // YYYY-MM
}

/**
 * "Grelha" theme summary: colored count cards on top + a colour legend that
 * also documents the € (gratificado) and Evento markers used in the grid.
 * Reuses the exact same data/colours as the classic ShiftsSummary.
 */
export const GridSummary: React.FC<GridSummaryProps> = ({ shifts, shiftTypes, month }) => {
  const { width } = useWindowDimensions();
  const compact = width < 420;

  const shiftItems = useMemo(() => {
    const configured = (shiftTypes || [])
      .map((item) => ({
        id: String(item?.id || ''),
        name: String(item?.name || '').trim(),
        color: resolveShiftColor(String(item?.name || '').trim(), item?.color),
      }))
      .filter((item) => item.name.length > 0);

    const configuredNames = new Set(configured.map((i) => i.name));
    const fromShifts = Array.from(
      new Set((shifts || []).map((s) => String(s.shift_type || '').trim()))
    )
      .filter((name) => name.length > 0 && !configuredNames.has(name))
      .map((name) => ({ id: `from-shift-${name}`, name, color: resolveShiftColor(name) }));

    return [...configured, ...fromShifts];
  }, [shiftTypes, shifts]);

  const countsByType = useMemo(() => {
    const map = new Map<string, number>();
    const [year, monthNum] = month.split('-').map(Number);
    (shifts || []).forEach((s) => {
      const d = new Date(String(s.date || ''));
      if (d.getFullYear() !== year || d.getMonth() + 1 !== monthNum) return;
      const t = String(s.shift_type || '').trim();
      if (!t) return;
      map.set(t, (map.get(t) || 0) + 1);
    });
    return map;
  }, [shifts, month]);

  return (
    <View>
      <View style={[styles.cards, { gap: compact ? 8 : 10 }]}>
        {shiftItems.length === 0 ? (
          <Text style={styles.emptyText}>Sem tipos de turno configurados</Text>
        ) : (
          shiftItems.map((item) => (
            <View
              key={item.id}
              style={[
                styles.card,
                { borderColor: item.color + '66', backgroundColor: item.color + '14' },
              ]}
            >
              <Text style={[styles.cardValue, { color: item.color }]}>
                {countsByType.get(item.name) || 0}
              </Text>
              <Text style={styles.cardLabel} numberOfLines={1}>
                {item.name.toUpperCase()}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.legend}>
        {shiftItems.map((item) => (
          <View key={item.id} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel}>{item.name}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={styles.euroChip}>
            <Text style={styles.euroChipText}>€</Text>
          </View>
          <Text style={styles.legendLabel}>Gratificado</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#34D399' }]} />
          <Text style={styles.legendLabel}>Evento</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    flexGrow: 1,
    flexBasis: 64,
    minWidth: 64,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardValue: { fontSize: 22, fontWeight: '800' },
  cardLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  emptyText: { color: '#64748B', fontSize: 13, paddingVertical: 8 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
    columnGap: 14,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { color: '#CBD5E1', fontSize: 11, fontWeight: '600' },
  euroChip: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 5,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  euroChipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
});
