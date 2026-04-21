import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Shift, Gratification, ShiftType, SHIFT_COLORS, GRATIFICATION_COLORS, GratificationType } from '../types';
import { getCalendarDays, formatMonth, dateToString, WEEKDAYS, getNextMonth, getPrevMonth } from '../utils/helpers';
import { getHolidaysMap } from '../utils/holidays';

interface CalendarProps {
  month: string;
  shifts: Shift[];
  gratifications?: Gratification[];
  onDayPress: (date: string) => void;
  onMonthChange: (month: string) => void;
}

// Short labels for calendar display
const SHIFT_SHORT_LABELS: Record<ShiftType, string> = {
  manha: 'M',
  tarde: 'T',
  noite: 'N',
  ferias: 'Fér',
  folga: 'Flg',
  excesso: 'Exc',
};

export const Calendar: React.FC<CalendarProps> = ({
  month,
  shifts,
  gratifications = [],
  onDayPress,
  onMonthChange,
}) => {
  const days = getCalendarDays(month);
  const year = parseInt(month.split('-')[0]);
  const holidaysMap = useMemo(() => getHolidaysMap(year), [year]);
  
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
                  { backgroundColor: SHIFT_COLORS[shift.shift_type as ShiftType] }
                ]}>
                  <Text style={styles.shiftBadgeText}>
                    {SHIFT_SHORT_LABELS[shift.shift_type as ShiftType]}
                  </Text>
                </View>
              ) : holiday ? (
                <View style={styles.holidayBadge}>
                  <Text style={styles.holidayBadgeText}>Fer</Text>
                </View>
              ) : (
                <View style={styles.emptyBadge} />
              )}

              {/* Show gratification indicator as underline */}
              {gratification && (
                <View style={[
                  styles.gratificationUnderline,
                  { backgroundColor: GRATIFICATION_COLORS[gratification.gratification_type as GratificationType] }
                ]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.underlineIndicator, { backgroundColor: '#10B981' }]} />
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
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 56,
  },
  todayCell: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  todayText: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  holidayText: {
    color: '#EF4444',
    fontWeight: '700',
  },
  shiftBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  shiftBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  holidayBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  holidayBadgeText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyBadge: {
    height: 18,
  },
  gratificationUnderline: {
    position: 'absolute',
    bottom: 2,
    width: 20,
    height: 3,
    borderRadius: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  underlineIndicator: {
    width: 16,
    height: 3,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    color: '#6B7280',
  },
});
