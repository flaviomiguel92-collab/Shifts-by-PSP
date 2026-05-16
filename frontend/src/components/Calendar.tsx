import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Shift, Gratification } from '../types';
import { getCalendarDays, formatMonth, dateToString, WEEKDAYS, getNextMonth, getPrevMonth, resolveShiftColor } from '../utils/helpers';
import { getHolidaysMap } from '../utils/holidays';
import { useDataStore } from '../store/dataStore';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../theme/colors';

interface CalendarProps {
  month: string;
  shifts: Shift[];
  gratifications?: Gratification[];
  onDayPress: (date: string) => void;
  onMonthChange: (month: string) => void;
}

export const Calendar: React.FC<CalendarProps> = ({
  month,
  shifts,
  gratifications = [],
  onDayPress,
  onMonthChange,
}) => {
  const { shiftTypes } = useDataStore();
  const days = getCalendarDays(month);
  const year = parseInt(month.split('-')[0]);
  const holidaysMap = useMemo(() => getHolidaysMap(year), [year]);

  const getShiftColor = (shiftTypeName: string) => {
    const shiftType = shiftTypes.find((st: any) => st.name === shiftTypeName);
    return resolveShiftColor(shiftTypeName, shiftType?.color);
  };

  const getShiftLabel = (shiftTypeName: string) => {
    const shiftType = shiftTypes.find((st: any) => st.name === shiftTypeName);
    return shiftType?.shortLabel || shiftTypeName.slice(0, 3).toUpperCase();
  };
  
  const getShiftForDay = (date: Date): Shift | undefined => {
    const dateStr = dateToString(date);
    return shifts.find((s) => s.date === dateStr);
  };

  const getGratificationForDay = (date: Date): Gratification | undefined => {
    const dateStr = dateToString(date);
    return gratifications.find((g) => g.date === dateStr);
  };

  const today = dateToString(new Date());

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => onMonthChange(getPrevMonth(month))}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{formatMonth(month)}</Text>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => onMonthChange(getNextMonth(month))}
        >
          <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{day}</Text>
          </View>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {days.map((day, index) => {
          if (!day) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const dateStr = dateToString(day);
          const shift = getShiftForDay(day);
          const gratification = getGratificationForDay(day);
          const isToday = dateStr === today;
          const holiday = holidaysMap.get(dateStr);

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.dayCell,
                isToday && styles.todayCell,
              ]}
              onPress={() => onDayPress(dateStr)}
            >
              <Text style={[
                styles.dayText,
                isToday && styles.todayText,
                holiday && styles.holidayText,
              ]}>
                {format(day, 'd')}
              </Text>
              
              {/* Show shift type with color */}
              {shift ? (
                <View style={[
                  styles.shiftBadge,
                  { backgroundColor: getShiftColor(shift.shift_type) }
                ]}>
                  <Text style={styles.shiftBadgeText}>
                    {getShiftLabel(shift.shift_type)}
                  </Text>
                </View>
              ) : holiday ? (
                <View style={styles.holidayBadge}>
                  <Text style={styles.holidayBadgeText}>Fer</Text>
                </View>
              ) : (
                <View style={styles.emptyBadge} />
              )}

              {/* Show gratification indicator as floating star */}
              {gratification && (
                <View style={styles.gratificationStar}>
                  <Ionicons name="star-sharp" size={12} color="#F59E0B" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <Ionicons name="star" size={12} color="#10B981" />
          <Text style={styles.legendText}>= Extra</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={[styles.legendText, { color: '#EF4444' }]}>Vermelho</Text>
          <Text style={styles.legendText}>= Feriado</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  navButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundTertiary,
  },
  monthTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  weekdayText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    minHeight: 56,
    position: 'relative',
    overflow: 'visible',
  },
  todayCell: {
    backgroundColor: COLORS.overlayLight,
    borderRadius: BORDER_RADIUS.md,
  },
  dayText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  todayText: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  holidayText: {
    color: COLORS.error,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  shiftBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    minWidth: 24,
    alignItems: 'center',
  },
  shiftBadgeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#FFFFFF',
  },
  holidayBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.overlayLight,
  },
  holidayBadgeText: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.error,
  },
  emptyBadge: {
    height: 18,
  },
  gratificationStar: {
    position: 'absolute',
    top: -4,
    right: -4,
    zIndex: 10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  underlineIndicator: {
    width: 16,
    height: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  legendText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textMuted,
  },
});
