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
import { HeaderWithBack } from '../../src/components/HeaderWithBack';
import { 
  ShiftType, 
  SHIFT_LABELS, 
  SHIFT_COLORS, 
  Shift, 
  Gratification, 
  GRATIFICATION_COLORS, 
  GRATIFICATION_LABELS,
  GratificationType 
} from '../../src/types';
import { formatMonth, getCalendarDays, dateToString, WEEKDAYS, getNextMonth, getPrevMonth, formatDate } from '../../src/utils/helpers';
import { getHolidaysMap } from '../../src/utils/holidays';
import { storage } from '../../src/utils/storage';
import { ShiftModal } from '../../src/components/ShiftModal';
import { CycleModal } from '../../src/components/CycleModal';
import { GratifiedModal } from '../../src/components/GratifiedModal';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
  const [selectedGratification, setSelectedGratification] = useState<Gratification | null>(null);

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
    } catch (error) {
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
    } catch (error) {
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

  const handleCycleSelect = (cycle: ShiftType[]) => {
    // Legacy helper (kept for call sites, but cycles are now objects)
    setEditMode('cycle_start');
    setSelectedCycle({ id: 'legacy', name: 'legacy', pattern: cycle });
    setCycleStartDate(null);
    setSelectedShiftType(null);
  };

  const cancelEditMode = () => {
    setEditMode('none');
    setSelectedShiftType(null);
    setSelectedCycle(null);
    setCycleStartDate(null);
  };

  const shiftCounts = useMemo(() => {
    const monthShifts = shifts.filter((s) => typeof s?.date === 'string' && s.date.startsWith(currentMonth));
    const counts: Record<string, number> = {};
    monthShifts.forEach((s) => {
      const key = s.shift_type;
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [shifts, currentMonth]);

  // Check if date is in cycle range
  const isInCycleRange = (dateStr: string) => {
    if (!cycleStartDate || editMode !== 'cycle_end') return false;
    return dateStr >= cycleStartDate;
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

  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithBack title="Turnos" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Turnos</Text>
        {editMode !== 'none' && (
          <TouchableOpacity style={styles.cancelBtn} onPress={cancelEditMode}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {/* Quick Selection Bar */}
        <View style={styles.quickBar}>
          <Text style={styles.quickBarTitle}>Seleção Rápida - clica no turno e depois nos dias</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
<View style={styles.quickButtons}>
  {shiftTypes.map((shift) => (
    <TouchableOpacity
      key={shift.name}
      style={[
        styles.quickBtn,
        { borderColor: shift.color },
        editMode === 'quick' && selectedShiftType === shift.name && {
          backgroundColor: shift.color,
        },
      ]}
      onPress={() => handleQuickSelect(shift.name)}
    >
      <Text
        style={[
          styles.quickBtnText,
          {
            color:
              editMode === 'quick' && selectedShiftType === shift.name
                ? '#FFF'
                : shift.color,
          },
        ]}
      >
        {shift.name}
      </Text>
    </TouchableOpacity>
  ))}
</View>
          </ScrollView>
          {editMode === 'quick' && selectedShiftType && (
            <Text style={styles.modeHint}>
              ✓ Toca nos dias para aplicar "{getShiftDisplayName(selectedShiftType)}"
            </Text>
          )}
        </View>

        {/* Cycles Bar */}
        <View style={styles.cyclesBar}>
          <Text style={styles.quickBarTitle}>Ciclos - seleciona, depois toca no dia inicial e final</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.cycleButtons}>
              <TouchableOpacity
                style={[styles.cycleBtn, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  setShowCycleModal(true);
                  cancelEditMode();
                }}
              >
                <Text style={[styles.cycleBtnText, { color: '#FFFFFF' }]}>+ Novo</Text>
              </TouchableOpacity>

              {cycles.map((cycle) => (
                <TouchableOpacity
                  key={cycle.id}
                  style={[
                    styles.cycleBtn,
                    selectedCycle?.id === cycle.id && styles.cycleBtnActive,
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
                    styles.cycleBtnText,
                    selectedCycle?.id === cycle.id && styles.cycleBtnTextActive,
                  ]}>
                    {cycle.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {editMode === 'cycle_start' && (
            <Text style={styles.modeHint}>
              ✓ Ciclo selecionado! Agora toca no DIA INICIAL
            </Text>
          )}
          {editMode === 'cycle_end' && cycleStartDate && (
            <Text style={styles.modeHintGreen}>
              ✓ Início: {format(new Date(cycleStartDate + 'T12:00:00'), 'dd/MM')} - Agora toca no DIA FINAL
            </Text>
          )}
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
              const holiday = holidaysMap.get(dateStr);
              const hasGratification = !!gratification;
              const isCycleStart = cycleStartDate === dateStr;
              const inCycleRange = isInCycleRange(dateStr);

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.dayCell,
                    isToday && styles.todayCell,
                    hasGratification && styles.hasGratificationCell,
                    isCycleStart && styles.cycleStartCell,
                    inCycleRange && styles.inCycleRangeCell,
                    editMode !== 'none' && styles.selectableCell,
                  ]}
                  onPress={() => handleDayPress(dateStr)}
                >
                  <Text style={[
                    styles.dayText,
                    isToday && styles.todayText,
                    holiday && styles.holidayText,
                    isCycleStart && styles.cycleStartText,
                  ]}>
                    {format(day, 'd')}
                  </Text>

                  {shift ? (
                    <View style={[
                      styles.shiftBadge,
                      { backgroundColor: getShiftDisplayColor(shift.shift_type) }
                    ]}>
                      <Text style={styles.shiftBadgeText} numberOfLines={1}>
                        {getShiftDisplayName(shift.shift_type)}
                        {shift.shift_type === 'excesso' && shift.excess_hours ? ` ${shift.excess_hours}h` : ''}
                      </Text>
                    </View>
                  ) : holiday ? (
                    <View style={styles.holidayBadge}>
                      <Text style={styles.holidayBadgeText}>Feriado</Text>
                    </View>
                  ) : (
                    <View style={styles.emptyBadge} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

{/* Summary */}
<View style={styles.summaryCard}>
  <Text style={styles.summaryTitle}>Resumo do Mês</Text>
  <View style={styles.summaryGrid}>
    {Object.keys(shiftCounts).length === 0 ? (
      <Text style={styles.noDataText}>Ainda não existem turnos neste mês.</Text>
    ) : (
    Object.keys(shiftCounts).map((type) => (
      <View key={type} style={styles.summaryItem}>
        <View
          style={[
            styles.summaryDot,
            {
              backgroundColor: getShiftDisplayColor(type),
            },
          ]}
        />
        <Text style={styles.summaryLabel}>{getShiftDisplayName(type)}</Text>
        <Text style={styles.summaryCount}>{shiftCounts[type]}</Text>
      </View>
    )))}
  </View>
</View>

        {/* Legend */}
        <View style={styles.legendCard}>
          <View style={styles.legendItem}>
            <View style={styles.legendCircle} />
            <Text style={styles.legendText}>= Dia com extra registado</Text>
          </View>
          <Text style={styles.legendHint}>Toca num dia para ver detalhes e editar</Text>
        </View>
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal visible={showDayDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
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
        </View>
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
    backgroundColor: '#111827',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150,
  },
  quickBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1F2937',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  quickBarTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modeHint: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 10,
    fontWeight: '600',
  },
  modeHintGreen: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 10,
    fontWeight: '600',
  },
  cyclesBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1F2937',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cycleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cycleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  cycleBtnActive: {
    backgroundColor: '#3B82F6',
  },
  cycleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  cycleBtnTextActive: {
    color: '#FFFFFF',
  },
  calendarCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  calendarHeader: {
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
    minHeight: 60,
    borderRadius: 8,
  },
  todayCell: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  hasGratificationCell: {
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 8,
    margin: 1,
  },
  cycleStartCell: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  inCycleRangeCell: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  selectableCell: {
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    margin: 1,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
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
  cycleStartText: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  shiftBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: '95%',
  },
  shiftBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  holidayBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  holidayBadgeText: {
    fontSize: 7,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyBadge: {
    height: 18,
  },
  summaryCard: {
    marginHorizontal: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  summaryCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  legendCard: {
    marginHorizontal: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  legendText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  legendHint: {
    fontSize: 10,
    color: '#4B5563',
    marginTop: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  dayDetailModal: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
    flex: 1,
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
  },
  shiftDetailCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  },
  shiftTime: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 4,
  },
  excessHoursText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 8,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
    fontStyle: 'italic',
  },
  noDataText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
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
  },
  gratDetailCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  },
  gratValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10B981',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
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
  },
});
