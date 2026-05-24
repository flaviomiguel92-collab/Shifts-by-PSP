import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { dateToString } from '../../utils/helpers';
import { Holiday } from '../../utils/holidays';
import { Shift, CalendarEvent } from '../../types';
import { GratifiedEntry } from '../../store/dataStore';
import { getThemeColors } from '../../theme/themes';

interface CalendarGridProps {
  weeks: (Date | null)[][];
  isGridTheme: boolean;
  isLight: boolean;
  t: ReturnType<typeof getThemeColors>;
  today: string;
  holidaysMap: Map<string, Holiday>;
  gratifiedByDateMap: Map<string, GratifiedEntry[]>;
  eventsByDateMap: Map<string, CalendarEvent[]>;
  editMode: string;
  selectedDates: Set<string>;
  cycleStartDate: string | null;
  loading: boolean;
  getShiftForDay: (dateStr: string) => Shift | undefined;
  getShiftDisplayColor: (shiftType: string) => string;
  getShiftDisplayName: (shiftType: string) => string;
  isInCycleRange: (dateStr: string) => boolean;
  onDayPress: (dateStr: string, pageX: number, pageY: number) => void;
  onDayLongPress: (dateStr: string) => void;
}

export function CalendarGrid({
  weeks, isGridTheme, isLight, t, today, holidaysMap,
  gratifiedByDateMap, eventsByDateMap, editMode, selectedDates,
  cycleStartDate, loading, getShiftForDay, getShiftDisplayColor,
  getShiftDisplayName, isInCycleRange, onDayPress, onDayLongPress,
}: CalendarGridProps) {
  return (
    <View style={[styles.daysGrid, loading && { opacity: 0 }]}>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (!day) {
              return (
                <View
                  key={`empty-${wi}-${di}`}
                  style={isGridTheme ? styles.gridDayCellEmpty : styles.dayCell}
                />
              );
            }

            const dateStr = dateToString(day);
            const shift = getShiftForDay(dateStr);
            const isToday = dateStr === today;
            const holiday = holidaysMap.get(dateStr);
            const dayGratifiedEntries = gratifiedByDateMap.get(dateStr) || [];
            const hasGratification = dayGratifiedEntries.length > 0;
            const gratifiedCount = dayGratifiedEntries.length;
            const hasEvent = (eventsByDateMap.get(dateStr) || []).length > 0;
            const isCycleStart = cycleStartDate === dateStr;
            const inCycleRange = isInCycleRange(dateStr);
            const isMultiSelected = editMode === 'multi_select' && selectedDates.has(dateStr);

            if (isGridTheme) {
              const shiftColor = shift ? getShiftDisplayColor(shift.shift_type) : null;
              const numColor = shiftColor
                || (isToday ? '#3B82F6' : holiday ? '#EF4444' : (isLight ? t.textPrimary : '#E2E8F0'));
              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.gridDayCell,
                    isLight && { backgroundColor: t.bgAlt, borderColor: t.border },
                    shiftColor && !isMultiSelected && {
                      borderColor: shiftColor + '66',
                      backgroundColor: shiftColor + (isLight ? '1F' : '14'),
                    },
                    isToday && styles.gridTodayCell,
                    isMultiSelected && styles.multiSelectedCell,
                    isCycleStart && styles.cycleStartCell,
                    inCycleRange && styles.inCycleRangeCell,
                    editMode !== 'none' && styles.selectableCell,
                  ]}
                  onPress={(e) => {
                    const { pageX, pageY } = e.nativeEvent;
                    onDayPress(dateStr, pageX, pageY);
                  }}
                  onLongPress={() => onDayLongPress(dateStr)}
                  delayLongPress={350}
                >
                  <Text style={[styles.gridDayNum, { color: numColor }]}>
                    {format(day, 'd')}
                  </Text>

                  {isMultiSelected ? (
                    <View style={styles.multiCheckWrap}>
                      <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
                    </View>
                  ) : (
                    <>
                      {hasGratification && (
                        <View style={styles.gratifiedChip}>
                          <Text style={styles.gratifiedChipText}>
                            {gratifiedCount > 1 ? `€${gratifiedCount}` : '€'}
                          </Text>
                        </View>
                      )}
                      {shift ? (
                        <View style={styles.gridBody}>
                          <Text
                            style={[styles.gridShiftLabel, { color: shiftColor || (isLight ? t.textPrimary : '#E2E8F0') }]}
                            numberOfLines={1}
                          >
                            {getShiftDisplayName(shift.shift_type).toUpperCase()}
                          </Text>
                          {!!shift.note && (
                            <Text style={styles.gridNoteText} numberOfLines={1}>
                              {shift.note.toUpperCase()}
                            </Text>
                          )}
                        </View>
                      ) : holiday ? (
                        <View style={styles.gridBody}>
                          <Text style={styles.gridHolidayText} numberOfLines={1}>
                            FERIADO
                          </Text>
                        </View>
                      ) : null}
                      {hasEvent && <View style={styles.gridEventDot} />}
                    </>
                  )}
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={dateStr}
                style={[
                  styles.dayCell,
                  isToday && styles.todayCell,
                  isMultiSelected && styles.multiSelectedCell,
                  shift && !isMultiSelected && {
                    backgroundColor: getShiftDisplayColor(shift.shift_type),
                    opacity: 0.8,
                  },
                  isCycleStart && styles.cycleStartCell,
                  inCycleRange && styles.inCycleRangeCell,
                  editMode !== 'none' && styles.selectableCell,
                ]}
                onPress={(e) => {
                  const { pageX, pageY } = e.nativeEvent;
                  onDayPress(dateStr, pageX, pageY);
                }}
                onLongPress={() => onDayLongPress(dateStr)}
                delayLongPress={350}
              >
                <Text style={[
                  styles.dayText,
                  isToday && styles.todayText,
                  holiday && styles.holidayText,
                  isCycleStart && styles.cycleStartText,
                  shift && !isMultiSelected && styles.shiftDayText,
                  isMultiSelected && styles.multiSelectedDayText,
                ]}>
                  {format(day, 'd')}
                </Text>

                {isMultiSelected && (
                  <View style={styles.multiCheckWrap}>
                    <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
                  </View>
                )}

                {hasGratification && !isMultiSelected && (
                  <View style={styles.gratifiedChip}>
                    <Text style={styles.gratifiedChipText}>
                      {gratifiedCount > 1 ? `€${gratifiedCount}` : '€'}
                    </Text>
                  </View>
                )}

                {hasEvent && !isMultiSelected && (
                  <View style={styles.eventBadge}>
                    <Text style={styles.eventBadgeText} numberOfLines={1}>Evento</Text>
                  </View>
                )}

                {!isMultiSelected && (shift ? (
                  <View style={styles.shiftNameBadge}>
                    <Text style={styles.shiftNameText} numberOfLines={1}>
                      {getShiftDisplayName(shift.shift_type)}
                    </Text>
                    {shift.start_time ? (
                      <Text style={styles.shiftTimeText} numberOfLines={1}>
                        {shift.start_time}
                      </Text>
                    ) : null}
                  </View>
                ) : holiday ? (
                  <View style={styles.holidayBadge}>
                    <Text style={styles.holidayBadgeText}>Feriado</Text>
                  </View>
                ) : (
                  <View style={styles.emptyBadge} />
                ))}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  daysGrid: {},
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 58,
    borderRadius: 10,
    position: 'relative',
  },
  todayCell: {
    borderWidth: 0.5,
    borderColor: 'rgba(59, 130, 246, 0.9)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  gratifiedChip: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 16,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gratifiedChipText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 11,
  },
  gridDayCell: {
    flex: 1,
    margin: 2,
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(148,163,184,0.22)',
    backgroundColor: 'rgba(148,163,184,0.08)',
    padding: 6,
    position: 'relative',
  },
  gridDayCellEmpty: {
    flex: 1,
    margin: 2,
    minHeight: 64,
  },
  gridTodayCell: {
    borderColor: '#3B82F6',
    borderWidth: 0.5,
  },
  gridDayNum: {
    fontSize: 13,
    fontWeight: '500',
  },
  gridBody: {
    marginTop: 6,
  },
  gridShiftLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  gridNoteText: {
    fontSize: 8,
    fontWeight: '500',
    color: '#94A3B8',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  gridHolidayText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#EF4444',
    letterSpacing: 0.4,
  },
  gridEventDot: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  cycleStartCell: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  inCycleRangeCell: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  selectableCell: {
    borderWidth: 0.5,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    margin: 1,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  shiftDayText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  todayText: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  holidayText: {
    color: '#EF4444',
    fontWeight: '500',
  },
  cycleStartText: {
    color: '#F59E0B',
    fontWeight: '500',
  },
  shiftNameBadge: {
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 2,
    maxWidth: '95%',
    marginTop: 2,
  },
  shiftNameText: {
    fontSize: 7,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  shiftTimeText: {
    fontSize: 6,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 1,
  },
  holidayBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  holidayBadgeText: {
    fontSize: 7,
    fontWeight: '500',
    color: '#EF4444',
  },
  emptyBadge: {
    height: 18,
  },
  eventBadge: {
    marginTop: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignSelf: 'center',
  },
  eventBadgeText: {
    fontSize: 7,
    fontWeight: '500',
    color: '#60A5FA',
  },
  multiSelectedCell: {
    backgroundColor: 'rgba(59, 130, 246, 0.22)',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  multiSelectedDayText: {
    color: '#93C5FD',
    fontWeight: '500',
  },
  multiCheckWrap: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
});
