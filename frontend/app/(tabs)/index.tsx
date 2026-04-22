import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Platform,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useDataStore } from '../../src/store/dataStore';
import { 
  ShiftType, 
  Shift,
} from '../../src/types';
import { formatMonth, getCalendarDays, dateToString, WEEKDAYS, getNextMonth, getPrevMonth, formatDate } from '../../src/utils/helpers';
import { getHolidaysMap } from '../../src/utils/holidays';
import { ShiftModal } from '../../src/components/ShiftModal';
import { CycleModal } from '../../src/components/CycleModal';
import { GratifiedModal } from '../../src/components/GratifiedModal';
import { ShiftsSummary } from '../../src/components/ShiftsSummary';

type EditMode = 'none' | 'quick' | 'cycle_start' | 'cycle_end';

export default function CalendarScreen() {
  const store = useDataStore() as any;
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
  } = store;

  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [selectedShiftType, setSelectedShiftType] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<{ id: string; name: string; pattern: ShiftType[] } | null>(null);
  const [cycleStartDate, setCycleStartDate] = useState<string | null>(null);
  const [isApplyingCycle, setIsApplyingCycle] = useState(false);
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);

  // Modal states
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showGratifiedModal, setShowGratifiedModal] = useState(false);
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const shiftTypesMap = useMemo(() => {
    const map = new Map<string, any>();
    (shiftTypes || []).forEach((shiftType: any) => {
      const name = String(shiftType?.name || '').trim();
      if (!name) return;
      map.set(name, shiftType);
    });
    return map;
  }, [shiftTypes]);

  const year = parseInt(currentMonth.split('-')[0]);
  const holidaysMap = useMemo(() => getHolidaysMap(year), [year]);
  const days = getCalendarDays(currentMonth);
  const today = dateToString(new Date());

  const gratifiedForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return (gratifiedEntries || []).filter((e: any) => e.date === selectedDate);
  }, [gratifiedEntries, selectedDate]);

  const gratifiedByDateMap = useMemo(() => {
    const map = new Map<string, any[]>();
    (gratifiedEntries || []).forEach((entry: any) => {
      const date = String(entry?.date || '');
      if (!date) return;
      if (!map.has(date)) {
        map.set(date, []);
      }
      map.get(date)?.push(entry);
    });
    return map;
  }, [gratifiedEntries]);

  // Create maps for quick lookup
  const shiftsMap = useMemo(() => {
    const map = new Map<string, Shift>();
    shifts.forEach((s: any) => map.set(s.date, s));
    return map;
  }, [shifts]);

  useEffect(() => {
    fetchShifts(currentMonth);
  }, [currentMonth]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShifts(currentMonth);
    setRefreshing(false);
  };

  const getShiftForDay = useCallback((dateStr: string): Shift | undefined => {
    return shiftsMap.get(dateStr);
  }, [shiftsMap]);

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
      setSelectedDate(dateStr);
      setSelectedShift(shift || null);
      setShowDayDetailModal(true);
    }
  };

  const handleDeleteGratifiedEntry = (entryId: string) => {
    Alert.alert('Eliminar gratificado', 'Queres remover este gratificado deste dia?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteGratifiedEntry(entryId),
      },
    ]);
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
    shift_type: string; 
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
    setIsOptionsExpanded(false);
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

  // Check if date is in cycle range
  const isInCycleRange = (dateStr: string) => {
    if (!cycleStartDate || editMode !== 'cycle_end') return false;
    return dateStr >= cycleStartDate;
  };

  const getShiftDisplayName = (shiftType: string) => {
    const configuredShift = shiftTypesMap.get(shiftType);
    return configuredShift?.name || shiftType;
  };

  const getShiftDisplayColor = (shiftType: string) => {
    const configuredShift = shiftTypesMap.get(shiftType);
    return configuredShift?.color || '#6B7280';
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
      {/* Custom Header with Options Toggle */}
      <View style={styles.customHeader}>
        <Text style={styles.customHeaderTitle}>Turnos</Text>
        <TouchableOpacity
          style={styles.toggleOptionsBtn}
          onPress={() => setIsOptionsExpanded((prev) => !prev)}
        >
          <Ionicons
            name={isOptionsExpanded ? 'close' : 'add'}
            size={28}
            color="#3B82F6"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {editMode !== 'none' && (
          <View style={styles.topActionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelEditMode}>
              <Text style={styles.cancelBtnText}>Cancelar modo de edição</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Month Summary */}
        <View style={styles.summaryContainer}>
          <ShiftsSummary shifts={shifts} shiftTypes={shiftTypes} month={currentMonth} />
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
              const isToday = dateStr === today;
              const holiday = holidaysMap.get(dateStr);
              const dayGratifiedEntries = gratifiedByDateMap.get(dateStr) || [];
              const hasGratification = dayGratifiedEntries.length > 0;
              const gratifiedCount = dayGratifiedEntries.length;
              const isCycleStart = cycleStartDate === dateStr;
              const inCycleRange = isInCycleRange(dateStr);

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.dayCell,
                    shift && {
                      backgroundColor: getShiftDisplayColor(shift.shift_type),
                      opacity: 0.8,
                    },
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
                    shift && styles.shiftDayText,
                  ]}>
                    {format(day, 'd')}
                  </Text>

                  {hasGratification && (
                    <View style={styles.gratifiedDotWrap}>
                      <View style={styles.gratifiedDot} />
                      {gratifiedCount > 1 && (
                        <Text style={styles.gratifiedCountText}>{gratifiedCount}</Text>
                      )}
                    </View>
                  )}

                  {shift ? (
                    <View style={styles.shiftNameBadge}>
                      <Text style={styles.shiftNameText} numberOfLines={1}>
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
      </ScrollView>

      <Modal
        visible={isOptionsExpanded}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOptionsExpanded(false)}
      >
        <Pressable style={styles.optionsOverlay} onPress={() => setIsOptionsExpanded(false)}>
          <Pressable style={styles.optionsPanelFloating} onPress={() => {}}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.optionsPanelContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.optionsPanelSection}>
                <Text style={styles.optionsSectionTitle}>Seleção rápida de turnos</Text>
                <Text style={styles.quickBarTitle}>Escolhe um turno e toca nos dias do calendário</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.quickButtons}>
                    {shiftTypes.map((shift: any) => (
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
                    ✓ Toca nos dias para aplicar &quot;{getShiftDisplayName(selectedShiftType)}&quot;
                  </Text>
                )}
              </View>

              <View style={styles.optionsDivider} />

              <View style={styles.optionsPanelSection}>
                <Text style={styles.optionsSectionTitle}>Ciclos</Text>
                <Text style={styles.quickBarTitle}>Seleciona um ciclo, depois toca no dia inicial e no final</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.cycleButtons}>
                    <TouchableOpacity
                      style={[styles.cycleBtn, { backgroundColor: '#10B981' }]}
                      onPress={() => {
                        setShowCycleModal(true);
                        setIsOptionsExpanded(false);
                        cancelEditMode();
                      }}
                    >
                      <Text style={[styles.cycleBtnText, { color: '#FFFFFF' }]}>+ Novo</Text>
                    </TouchableOpacity>

                    {cycles.map((cycle: any) => (
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
                          setIsOptionsExpanded(false);
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
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
                    {gratifiedForSelectedDate.map((g: any) => (
                      <View key={g.id} style={styles.gratDetailCard}>
                        <View style={styles.gratHeader}>
                          <View style={[styles.gratBadge, { backgroundColor: '#10B981' }]}>
                            <Text style={styles.gratBadgeText}>{g.name}</Text>
                          </View>
                          <Text style={styles.gratValue}>{Number(g.value || 0).toFixed(2)}€</Text>
                        </View>
                        <Text style={styles.hintText}>
                          {g.start_time} - {g.end_time} (já com desconto)
                        </Text>
                        <TouchableOpacity
                          style={styles.removeGratifiedBtn}
                          onPress={() => handleDeleteGratifiedEntry(g.id)}
                        >
                          <Ionicons name="trash-outline" size={14} color="#FCA5A5" />
                          <Text style={styles.removeGratifiedBtnText}>Remover gratificado</Text>
                        </TouchableOpacity>
                      </View>
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
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  customHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toggleOptionsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.08)',
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
  topActionsRow: {
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  cancelBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 110,
  },
  summaryContainer: {
    marginHorizontal: 12,
    marginBottom: 16,
  },
  quickBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1F2937',
    marginHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  sectionHeaderBtn: {
    paddingVertical: 2,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  quickBarTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 8,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    minHeight: 42,
    justifyContent: 'center',
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1F2937',
    marginHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  cycleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cycleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#374151',
    minHeight: 42,
    justifyContent: 'center',
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
    padding: 10,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    justifyContent: 'flex-start',
    paddingTop: 66,
    paddingHorizontal: 12,
    zIndex: 40,
  },
  optionsPanelFloating: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 12,
    width: '100%',
    maxHeight: '60%',
    borderWidth: 1,
    borderColor: '#374151',
    zIndex: 50,
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  optionsPanelContent: {
    paddingBottom: 8,
  },
  optionsPanelSection: {
    marginBottom: 12,
  },
  optionsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E5E7EB',
    marginBottom: 8,
  },
  optionsDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 12,
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
    paddingVertical: 3,
    minHeight: 56,
    borderRadius: 8,
    position: 'relative',
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
  gratifiedDotWrap: {
    position: 'absolute',
    top: 3,
    right: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  gratifiedDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#10B981',
  },
  gratifiedCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    lineHeight: 10,
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
  shiftDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  shiftNameBadge: {
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 2,
    maxWidth: '95%',
    marginTop: 2,
  },
  shiftNameText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
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
  removeGratifiedBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  removeGratifiedBtnText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
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
