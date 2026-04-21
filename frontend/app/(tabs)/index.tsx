import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useDataStore } from '../../src/store/dataStore';
import { ShiftType, SHIFT_LABELS, Shift, Gratification } from '../../src/types';
import { formatMonth, getCalendarDays, dateToString, WEEKDAYS, getNextMonth, getPrevMonth, formatDate } from '../../src/utils/helpers';
import { getHolidaysMap } from '../../src/utils/holidays';
import { ShiftModal } from '../../src/components/ShiftModal';
import { CycleModal } from '../../src/components/CycleModal';
import { GratifiedModal } from '../../src/components/GratifiedModal';

type EditMode = 'none' | 'quick' | 'cycle_start' | 'cycle_end';

export default function CalendarScreen() {
  const { 
    shifts, 
    shiftTypes,
    cycles,
    gratifiedEntries,
    deleteGratifiedEntry,
    fetchShifts, 
    createShift, 
    updateShift, 
    deleteShift, 
    currentMonth, 
    setCurrentMonth, 
    gratifications,
    fetchGratifications,
  } = useDataStore();

  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [selectedShiftType, setSelectedShiftType] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<{ id: string; name: string; pattern: ShiftType[] } | null>(null);
  const [cycleStartDate, setCycleStartDate] = useState<string | null>(null);
  const [isApplyingCycle, setIsApplyingCycle] = useState(false);

  // Modal states
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showGratifiedModal, setShowGratifiedModal] = useState(false);
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  // Expand/Collapse states
  const [expandedQuickSection, setExpandedQuickSection] = useState(true);
  const [expandedCyclesSection, setExpandedCyclesSection] = useState(false);

  const year = parseInt(currentMonth.split('-')[0]);
  const holidaysMap = useMemo(() => getHolidaysMap(year), [year]);
  const days = getCalendarDays(currentMonth);
  const today = dateToString(new Date());

  const gratifiedForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return (gratifiedEntries || []).filter((e) => e.date === selectedDate);
  }, [gratifiedEntries, selectedDate]);

  // Create maps for quick lookup
  const shiftsMap = useMemo(() => {
    const map = new Map<string, Shift>();
    shifts.forEach(s => map.set(s.date, s));
    return map;
  }, [shifts]);

  const gratificationsMap = useMemo(() => {
    const map = new Map<string, Gratification>();
    gratifications.forEach(g => map.set(g.date, g));
    return map;
  }, [gratifications]);

  useEffect(() => {
    fetchShifts(currentMonth);
    fetchGratifications(currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShifts(currentMonth);
    await fetchGratifications(currentMonth);
    setRefreshing(false);
  };

  const getShiftForDay = useCallback((dateStr: string): Shift | undefined => {
    return shiftsMap.get(dateStr);
  }, [shiftsMap]);

  const getGratificationForDay = useCallback((dateStr: string): Gratification | undefined => {
    return gratificationsMap.get(dateStr);
  }, [gratificationsMap]);

  // Handle day press based on current mode
  const handleDayPress = async (dateStr: string) => {
    console.log('Day pressed:', dateStr, 'Mode:', editMode);

    if (editMode === 'quick' && selectedShiftType) {
      // Quick mode: assign selected shift type
      const existing = getShiftForDay(dateStr);
      if (existing) {
        if (existing.shift_type === selectedShiftType) {
          await deleteShift(existing.id);
        } else {
          await updateShift(existing.id, { shift_type: selectedShiftType });
        }
      } else {
        await createShift({ date: dateStr, shift_type: selectedShiftType });
      }
      await fetchShifts(currentMonth);
    } else if (editMode === 'cycle_start' && selectedCycle) {
      // Cycle mode: first click = start date
      console.log('Setting cycle start date:', dateStr);
      setCycleStartDate(dateStr);
      setEditMode('cycle_end');
    } else if (editMode === 'cycle_end' && selectedCycle && cycleStartDate) {
      // Cycle mode: second click = end date, apply cycle
      console.log('Setting cycle end date:', dateStr, 'Start was:', cycleStartDate);
      await applyCycleFromDates(cycleStartDate, dateStr, selectedCycle.pattern);
    } else {
      // Normal mode: open detail modal
      const shift = getShiftForDay(dateStr);
      const grat = getGratificationForDay(dateStr);
      setSelectedDate(dateStr);
      setSelectedShift(shift || null);
      setSelectedGratification(grat || null);
      setShowDayDetailModal(true);
    }
  };

  // Apply cycle between two dates
  const applyCycleFromDates = async (startDate: string, endDate: string, cycle: ShiftType[]) => {
    setIsApplyingCycle(true);

    const formatLocalDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    try {
      const start = new Date(startDate + 'T12:00:00');
      const end = new Date(endDate + 'T12:00:00');

      if (start > end) {
        Alert.alert('Erro', 'A data de fim deve ser depois da data de início.');
        return;
      }

      let currentDate = new Date(start);
      let i = 0;

      while (currentDate <= end) {
        const shiftType = cycle[i % cycle.length];
        const dateStr = formatLocalDate(currentDate);

        await createShift({
          date: dateStr,
          shift_type: shiftType,
        });

        currentDate.setDate(currentDate.getDate() + 1);
        i++;
      }

      setEditMode('none');
      setSelectedCycle(null);
      setCycleStartDate(null);

      Alert.alert('Sucesso!', 'Ciclo aplicado com sucesso!');
    } catch (error) {
      console.log('Cycle error:', error);
      Alert.alert('Erro', 'Falha ao aplicar ciclo');
    } finally {
      setIsApplyingCycle(false);
    }
  };

  // Handle shift save from modal
  const handleShiftSave = async (shiftData: { 
    shift_type: ShiftType; 
    start_time?: string; 
    end_time?: string; 
    excess_hours?: number;
    note?: string 
  }) => {
    try {
      if (selectedShift) {
        await updateShift(selectedShift.id, shiftData);
      } else {
        await createShift({ date: selectedDate, ...shiftData });
      }
      await fetchShifts(currentMonth);
      setShowShiftModal(false);
      setShowDayDetailModal(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível guardar o turno');
    }
  };

  const handleShiftDelete = async () => {
    if (!selectedShift) return;
    try {
      await deleteShift(selectedShift.id);
      await fetchShifts(currentMonth);
      setShowShiftModal(false);
      setShowDayDetailModal(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível eliminar o turno');
    }
  };

  const handleQuickSelect = (type: string) => {
    if (editMode === 'quick' && selectedShiftType === type) {
      setSelectedShiftType(null);
      setEditMode('none');
    } else {
      setEditMode('quick');
      setSelectedShiftType(type);
      setSelectedCycle(null);
      setCycleStartDate(null);
    }
  };

  const cancelEditMode = () => {
    setEditMode('none');
    setSelectedShiftType(null);
    setSelectedCycle(null);
    setCycleStartDate(null);
  };

  const getShiftDisplayName = (shiftType: string) => {
    return SHIFT_LABELS[shiftType as ShiftType] || shiftType;
  };

  const getShiftDisplayColor = (shiftType: string) => {
    const customShift = shiftTypes.find((s) => s.name === shiftType);
    if (customShift?.color) return customShift.color;
    return SHIFT_COLORS[shiftType as ShiftType] || '#6B7280';
  };

  if (isApplyingCycle) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>A aplicar ciclo...</Text>
          <Text style={styles.loadingSubtext}>Isto pode demorar alguns segundos</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Format current month for badge
  const monthBadgeText = format(new Date(currentMonth + '-01'), 'MMM yyyy').toUpperCase();

  // Shift counts for summary chips
  const monthShifts = shifts.filter((s) => typeof s?.date === 'string' && s.date.startsWith(currentMonth));
  const chipCounts = {
    noite: monthShifts.filter(s => s.shift_type === 'noite').length,
    manha: monthShifts.filter(s => s.shift_type === 'manha').length,
    tarde: monthShifts.filter(s => s.shift_type === 'tarde').length,
    folga: monthShifts.filter(s => s.shift_type === 'folga').length,
  };

  const shiftColors = {
    noite: '#3B82F6',
    manha: '#10B981',
    tarde: '#F59E0B',
    folga: '#8B5CF6',
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Turnos</Text>
        <View style={styles.monthBadge}>
          <Text style={styles.monthBadgeText}>{monthBadgeText}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {/* Month Summary Chips */}
        <View style={styles.chipsContainer}>
          <View style={[styles.chip, styles.chipNoite]}>
            <View style={[styles.chipBar, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.chipNumber}>{chipCounts.noite}</Text>
            <Text style={styles.chipLabel}>Noite</Text>
          </View>
          <View style={[styles.chip, styles.chipManha]}>
            <View style={[styles.chipBar, { backgroundColor: '#10B981' }]} />
            <Text style={styles.chipNumber}>{chipCounts.manha}</Text>
            <Text style={styles.chipLabel}>Manhã</Text>
          </View>
          <View style={[styles.chip, styles.chipTarde]}>
            <View style={[styles.chipBar, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.chipNumber}>{chipCounts.tarde}</Text>
            <Text style={styles.chipLabel}>Tarde</Text>
          </View>
          <View style={[styles.chip, styles.chipFolga]}>
            <View style={[styles.chipBar, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.chipNumber}>{chipCounts.folga}</Text>
            <Text style={styles.chipLabel}>Folga</Text>
          </View>
        </View>

        {/* Quick Selection + Cycles Side by Side */}
        <View style={styles.sectionRow}>
          {/* Quick Selection */}
          <View style={styles.sectionColumn}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setExpandedQuickSection(!expandedQuickSection)}
            >
              <View style={styles.sectionHeaderContent}>
                <Text style={styles.sectionTitle}>Seleção Rápida</Text>
                <Text style={styles.sectionEmoji}>⚡</Text>
              </View>
              <Ionicons 
                name={expandedQuickSection ? "chevron-down" : "chevron-right"} 
                size={20} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
            {expandedQuickSection && (
              <View style={styles.sectionContent}>
                <View style={styles.quickGrid}>
                  {['noite', 'manha', 'tarde', 'folga'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.quickGridBtn,
                        { backgroundColor: shiftColors[type as keyof typeof shiftColors] + '20' },
                        editMode === 'quick' && selectedShiftType === type && {
                          backgroundColor: shiftColors[type as keyof typeof shiftColors],
                        },
                      ]}
                      onPress={() => handleQuickSelect(type)}
                    >
                      <Text style={[
                        styles.quickGridBtnText,
                        editMode === 'quick' && selectedShiftType === type && {
                          color: '#FFFFFF',
                        },
                      ]}>
                        {getShiftDisplayName(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.sectionDivider} />

          {/* Cycles */}
          <View style={styles.sectionColumn}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setExpandedCyclesSection(!expandedCyclesSection)}
            >
              <View style={styles.sectionHeaderContent}>
                <Text style={styles.sectionTitle}>Ciclos</Text>
                <Text style={styles.sectionEmoji}>🔄</Text>
              </View>
              <Ionicons 
                name={expandedCyclesSection ? "chevron-down" : "chevron-right"} 
                size={20} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
            {expandedCyclesSection && (
              <View style={styles.sectionContent}>
                <View style={styles.quickGrid}>
                  <TouchableOpacity
                    style={[styles.quickGridBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => {
                      setShowCycleModal(true);
                      cancelEditMode();
                    }}
                  >
                    <Text style={[styles.quickGridBtnText, { color: '#FFFFFF' }]}>
                      + Novo ciclo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickGridBtn, { backgroundColor: '#6B7280' }]}
                  >
                    <Text style={[styles.quickGridBtnText, { color: '#FFFFFF' }]}>
                      Ciclo Normal
                    </Text>
                  </TouchableOpacity>
                </View>
                {cycles.length > 0 && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {cycles.map((cycle) => (
                      <TouchableOpacity
                        key={cycle.id}
                        style={[
                          styles.cycleItemBtn,
                          selectedCycle?.id === cycle.id && styles.cycleItemBtnActive,
                        ]}
                        onPress={() => {
                          if (selectedCycle?.id === cycle.id) {
                            setSelectedCycle(null);
                            setCycleStartDate(null);
                            setEditMode('none');
                          } else {
                            setEditMode('cycle_start');
                            setSelectedCycle({ id: cycle.id, name: cycle.name, pattern: cycle.pattern });
                            setCycleStartDate(null);
                            setSelectedShiftType(null);
                          }
                        }}
                      >
                        <Text style={[
                          styles.cycleItemBtnText,
                          selectedCycle?.id === cycle.id && styles.cycleItemBtnTextActive,
                        ]}>
                          {cycle.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setCurrentMonth(getPrevMonth(currentMonth))}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{formatMonth(currentMonth)}</Text>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setCurrentMonth(getNextMonth(currentMonth))}
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
              const shift = getShiftForDay(dateStr);
              const gratification = getGratificationForDay(dateStr);
              const isToday = dateStr === today;
              const hasExtra = !!gratification;

              const shiftColor = shift ? (shiftColors[shift.shift_type as keyof typeof shiftColors] || '#6B7280') : null;

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.dayCell,
                    shift && { backgroundColor: shiftColor },
                    isToday && styles.todayCell,
                    editMode !== 'none' && styles.selectableCell,
                  ]}
                  onPress={() => handleDayPress(dateStr)}
                >
                  <View style={styles.dayCellContent}>
                    <Text style={[
                      styles.dayNumber,
                      isToday && styles.todayNumber,
                      shift && styles.shiftDayNumber,
                    ]}>
                      {format(day, 'd')}
                    </Text>
                    {hasExtra && <View style={styles.extraDot} />}
                  </View>
                  {shift && (
                    <Text style={styles.dayShiftType} numberOfLines={1}>
                      {SHIFT_LABELS[shift.shift_type as ShiftType]}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendLabel}>Noite</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendLabel}>Manhã</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendLabel}>Tarde</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.legendLabel}>Folga</Text>
          </View>
        </View>
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal visible={showDayDetailModal} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.dayDetailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDate ? formatDate(selectedDate, 'EEEE, d MMMM yyyy') : ''}
              </Text>
              <TouchableOpacity onPress={() => setShowDayDetailModal(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Shift Section */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Turno</Text>
                {selectedShift ? (
                  <View style={styles.shiftDetailCard}>
                    <View style={[
                      styles.shiftDetailBadge, 
                      { backgroundColor: getShiftDisplayColor(selectedShift.shift_type) }
                    ]}>
                      <Text style={styles.shiftDetailBadgeText}>
                        {getShiftDisplayName(selectedShift.shift_type)}
                      </Text>
                    </View>
                    {selectedShift.start_time && selectedShift.end_time && (
                      <Text style={styles.shiftTime}>
                        {selectedShift.start_time} - {selectedShift.end_time}
                      </Text>
                    )}
                    {selectedShift.shift_type === 'excesso' && selectedShift.excess_hours && (
                      <Text style={styles.excessHoursText}>
                        {selectedShift.excess_hours}h do banco de horas
                      </Text>
                    )}
                    {selectedShift.note && (
                      <Text style={styles.noteText}>Nota: {selectedShift.note}</Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.noDataText}>Sem turno registado</Text>
                )}
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    setShowDayDetailModal(false);
                    setShowShiftModal(true);
                  }}
                >
                  <Ionicons name="pencil" size={18} color="#FFFFFF" />
                  <Text style={styles.editButtonText}>
                    {selectedShift ? 'Editar Turno' : 'Adicionar Turno'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: '#10B981', marginTop: 10 }]}
                  onPress={() => {
                    setShowDayDetailModal(false);
                    setShowGratifiedModal(true);
                  }}
                >
                  <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.editButtonText}>Adicionar Gratificado</Text>
                </TouchableOpacity>
              </View>

              {/* Gratified Section */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Gratificados</Text>
                {gratifiedForSelectedDate.length === 0 ? (
                  <Text style={styles.noDataText}>Sem gratificados registados</Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {gratifiedForSelectedDate.map((g) => (
                      <TouchableOpacity
                        key={g.id}
                        style={styles.gratDetailCard}
                        onLongPress={() => {
                          Alert.alert('Eliminar', 'Eliminar este gratificado?', [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Eliminar',
                              style: 'destructive',
                              onPress: () => deleteGratifiedEntry(g.id),
                            },
                          ]);
                        }}
                      >
                        <View style={styles.gratHeader}>
                          <View style={[styles.gratBadge, { backgroundColor: '#10B981' }]}>
                            <Text style={styles.gratBadgeText}>{g.name}</Text>
                          </View>
                          <Text style={styles.gratValue}>{Number(g.value || 0).toFixed(2)}€</Text>
                        </View>
                        <Text style={styles.hintText}>
                          {g.start_time} - {g.end_time} (já com desconto)
                        </Text>
                        <Text style={[styles.hintText, { marginTop: 4 }]}>
                          Pressiona longo para eliminar
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            {selectedShift && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleShiftDelete}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={styles.deleteBtnText}>Eliminar Turno</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Shift Edit Modal */}
      <ShiftModal
        visible={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        onSave={handleShiftSave}
        onDelete={selectedShift ? handleShiftDelete : undefined}
        date={selectedDate}
        existingShift={selectedShift}
      />

      <CycleModal
        visible={showCycleModal}
        onClose={() => setShowCycleModal(false)}
      />

      <GratifiedModal
        visible={showGratifiedModal}
        onClose={() => setShowGratifiedModal(false)}
        date={selectedDate}
        isHolidayOrWeekend={
          !!selectedDate &&
          (() => {
            const d = new Date(selectedDate + 'T12:00:00');
            const day = d.getDay(); // 0 Sunday, 6 Saturday
            const isWeekend = day === 0 || day === 6;
            const isHoliday = holidaysMap.has(selectedDate);
            return isWeekend || isHoliday;
          })()
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0f14',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#161820',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backButton: {
    padding: 8,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
    fontFamily: 'DM Sans',
  },
  monthBadge: {
    backgroundColor: '#1e2028',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  monthBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D1D5DB',
    fontFamily: 'DM Mono',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Month Summary Chips
  chipsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  chip: {
    flex: 1,
    backgroundColor: '#161820',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  chipBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  chipNoite: {},
  chipManha: {},
  chipTarde: {},
  chipFolga: {},
  chipNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'DM Mono',
    marginTop: 4,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 4,
    fontFamily: 'DM Sans',
  },

  // Quick Selection + Cycles Section
  sectionRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#161820',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  sectionColumn: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
  },
  sectionEmoji: {
    fontSize: 16,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickGridBtn: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
  },
  quickGridBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D1D5DB',
    fontFamily: 'DM Sans',
  },
  cycleItemBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1e2028',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  cycleItemBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  cycleItemBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
    fontFamily: 'DM Sans',
  },
  cycleItemBtnTextActive: {
    color: '#FFFFFF',
  },
  sectionDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  // Calendar
  calendarCard: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#161820',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
    fontFamily: 'DM Sans',
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'DM Sans',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#1e2028',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  dayCellContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    fontFamily: 'DM Mono',
  },
  shiftDayNumber: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  todayCell: {
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  todayNumber: {
    color: '#3B82F6',
  },
  selectableCell: {
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  dayShiftType: {
    fontSize: 7,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
    marginTop: 2,
  },
  extraDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },

  // Legend
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#161820',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: '#D1D5DB',
    fontFamily: 'DM Sans',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  dayDetailModal: {
    backgroundColor: '#161820',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
    flex: 1,
    fontFamily: 'DM Sans',
  },
  modalContent: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
    fontFamily: 'DM Sans',
  },
  shiftDetailCard: {
    backgroundColor: '#1e2028',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  shiftDetailBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  shiftDetailBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
  },
  shiftTime: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 4,
    fontFamily: 'DM Mono',
  },
  excessHoursText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 8,
    fontWeight: '600',
    fontFamily: 'DM Sans',
  },
  noteText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
    fontStyle: 'italic',
    fontFamily: 'DM Sans',
  },
  noDataText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    fontFamily: 'DM Sans',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
  },
  gratDetailCard: {
    backgroundColor: '#1e2028',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  gratHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gratBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  gratBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
  },
  gratValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10B981',
    fontFamily: 'DM Mono',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'DM Sans',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 8,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    fontFamily: 'DM Sans',
  },
});
