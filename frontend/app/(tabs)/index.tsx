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
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useDataStore } from '../../src/store/dataStore';
import { 
  ShiftType, 
  Shift,
} from '../../src/types';
import {
  formatMonth,
  getCalendarDays,
  dateToString,
  WEEKDAYS,
  getNextMonth,
  getPrevMonth,
  formatDate,
  fallbackColorForShiftTypeName,
  resolveShiftColor,
} from '../../src/utils/helpers';
import { getHolidaysMap } from '../../src/utils/holidays';
import { ShiftModal } from '../../src/components/ShiftModal';
import { CycleModal } from '../../src/components/CycleModal';
import { GratifiedModal } from '../../src/components/GratifiedModal';
import { ShiftsSummary } from '../../src/components/ShiftsSummary';
import { SkeletonCalendarRow, Skeleton } from '../../src/components/ui/Skeleton';
import { toast } from '../../src/utils/toast';

type EditMode = 'none' | 'quick' | 'cycle_start' | 'cycle_end' | 'multi_select';

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
    bulkUpsertShifts,
    deleteShift,
    currentMonth,
    setCurrentMonth,
  } = store;

  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [selectedShiftType, setSelectedShiftType] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<{ id: string; name: string; pattern: string[] } | null>(null);
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteGratifiedId, setDeleteGratifiedId] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [multiSelectShiftPicker, setMultiSelectShiftPicker] = useState(false);
  const optionsPanelAnim = React.useRef(new Animated.Value(0)).current;

  const shiftTypesMap = useMemo(() => {
    const map = new Map<string, any>();
    (shiftTypes || []).forEach((shiftType: any) => {
      const name = String(shiftType?.name || '').trim();
      if (!name) return;
      map.set(name, shiftType);
    });
    // Tipos só existem no servidor (strings em shift.shift_type); se shiftTypes local falhou a hidratar,
    // ainda mostramos cores distintas por nome em vez de tudo cinzento.
    (shifts || []).forEach((s: any) => {
      const n = String(s?.shift_type || '').trim();
      if (!n || map.has(n)) return;
      map.set(n, {
        id: `fallback-${n}`,
        name: n,
        color: resolveShiftColor(n),
      });
    });
    return map;
  }, [shiftTypes, shifts]);

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
    setIsLoadingShifts(true);
    fetchShifts(currentMonth).finally(() => setIsLoadingShifts(false));
  }, [currentMonth]);

  useEffect(() => {
    if (isOptionsExpanded) {
      optionsPanelAnim.setValue(0);
      Animated.timing(optionsPanelAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isOptionsExpanded, optionsPanelAnim]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShifts(currentMonth);
    setRefreshing(false);
  };

  const getShiftForDay = useCallback((dateStr: string): Shift | undefined => {
    return shiftsMap.get(dateStr);
  }, [shiftsMap]);

  // Start multi-select mode on long press
  const handleDayLongPress = (dateStr: string) => {
    if (editMode === 'none') {
      setEditMode('multi_select');
      setSelectedDates(new Set([dateStr]));
      setSelectedShiftType(null);
      setSelectedCycle(null);
    }
  };

  // Apply a shift type to all selected dates
  const handleApplyToSelected = async (shiftType: string) => {
    if (selectedDates.size === 0) return;
    const bulkItems = Array.from(selectedDates).map((date) => ({ date, shift_type: shiftType }));
    await bulkUpsertShifts(bulkItems);
    await fetchShifts(currentMonth);
    setSelectedDates(new Set());
    setEditMode('none');
    setMultiSelectShiftPicker(false);
  };

  // Handle day press based on current mode
  const handleDayPress = async (dateStr: string) => {
    console.log('Day pressed:', dateStr, 'Mode:', editMode);

    if (editMode === 'multi_select') {
      setSelectedDates((prev) => {
        const next = new Set(prev);
        if (next.has(dateStr)) {
          next.delete(dateStr);
        } else {
          next.add(dateStr);
        }
        return next;
      });
      return;
    }

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
    setDeleteGratifiedId(entryId);
  };

  const confirmDeleteGratified = async () => {
    if (!deleteGratifiedId) return;
    try {
      await deleteGratifiedEntry(deleteGratifiedId);
      await fetchShifts(currentMonth);
      setShowDayDetailModal(false);
      setDeleteGratifiedId(null);
    } catch (error) {
      console.error('Error deleting gratified entry:', error);
      Alert.alert('Erro', 'Não foi possível remover o gratificado');
    }
  };

  // Apply cycle between two dates
  const applyCycleFromDates = async (startDate: string, endDate: string, cycle: string[]) => {
    setIsApplyingCycle(true);

    const formatLocalDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    try {
      const normalizedCycle = (Array.isArray(cycle) ? cycle : [])
        .map((entry) => String(entry ?? '').trim())
        .filter((entry) => entry.length > 0);

      if (normalizedCycle.length === 0) {
        Alert.alert('Erro', 'O ciclo selecionado não tem turnos válidos.');
        return;
      }

      const start = new Date(startDate + 'T12:00:00');
      const end = new Date(endDate + 'T12:00:00');

      if (start > end) {
        Alert.alert('Erro', 'A data de fim deve ser depois da data de início.');
        return;
      }

      let currentDate = new Date(start);
      let i = 0;

      const bulkItems: { date: string; shift_type: string }[] = [];
      while (currentDate <= end) {
        const shiftType = normalizedCycle[i % normalizedCycle.length];
        bulkItems.push({
          date: formatLocalDate(currentDate),
          shift_type: shiftType,
        });
        currentDate.setDate(currentDate.getDate() + 1);
        i++;
      }

      const result = await bulkUpsertShifts(bulkItems);
      const createdCount = result?.created ?? 0;
      const updatedCount = result?.updated ?? 0;

      await fetchShifts(currentMonth);

      setEditMode('none');
      setSelectedCycle(null);
      setCycleStartDate(null);

      Alert.alert(
        'Sucesso!',
        `Ciclo aplicado com sucesso!\nCriados: ${createdCount}\nAtualizados: ${updatedCount}`
      );
    } catch (error) {
      console.error('Cycle error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      Alert.alert('Erro ao aplicar ciclo', errorMsg);
    } finally {
      setIsApplyingCycle(false);
    }
  };

  // Handle shift save from modal
  const handleShiftSave = async (shiftData: {
    shift_type: string;
    start_time?: string;
    end_time?: string;
    note?: string
  }) => {
    try {
      if (selectedShift) {
        await updateShift(selectedShift.id, shiftData);
      } else {
        // Check if shift already exists in backend (handles desync cases)
        const existingShift = shiftsMap.get(selectedDate);
        if (existingShift) {
          await updateShift(existingShift.id, shiftData);
        } else {
          await createShift({ date: selectedDate, ...shiftData });
        }
      }
      await fetchShifts(currentMonth);
      setShowShiftModal(false);
      setShowDayDetailModal(false);
      toast.success('Turno guardado');
    } catch (error) {
      toast.error('Não foi possível guardar o turno');
    }
  };

  const handleShiftDelete = async () => {
    if (!selectedShift) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteShift = async () => {
    if (!selectedShift) return;
    try {
      await deleteShift(selectedShift.id);
      await fetchShifts(currentMonth);
      setShowShiftModal(false);
      setShowDayDetailModal(false);
      setShowDeleteConfirm(false);
      toast.success('Turno eliminado');
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast.error('Não foi possível eliminar o turno');
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

  const handleCycleSelect = (cycle: string[]) => {
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
    setSelectedDates(new Set());
    setMultiSelectShiftPicker(false);
  };

  // Duplicate current day's shift to the next calendar day
  const handleDuplicateShift = async () => {
    if (!selectedShift || !selectedDate) return;
    const next = new Date(selectedDate + 'T12:00:00');
    next.setDate(next.getDate() + 1);
    const nextDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    try {
      const existing = shiftsMap.get(nextDate);
      if (existing) {
        await updateShift(existing.id, {
          shift_type: selectedShift.shift_type,
          start_time: selectedShift.start_time,
          end_time: selectedShift.end_time,
          note: selectedShift.note,
        });
      } else {
        await createShift({
          date: nextDate,
          shift_type: selectedShift.shift_type,
          start_time: selectedShift.start_time,
          end_time: selectedShift.end_time,
          note: selectedShift.note,
        });
      }
      await fetchShifts(currentMonth);
      setShowDayDetailModal(false);
      toast.success(`Turno duplicado para ${nextDate.slice(8, 10)}/${nextDate.slice(5, 7)}`);
    } catch {
      toast.error('Não foi possível duplicar o turno');
    }
  };

  // Copy all shifts from current calendar week to the following week
  const handleCopyWeek = async () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Find Mon-Sun of the week containing today (or first day of visible month if today not in view)
    const refDate = new Date(currentMonth + '-01T12:00:00');
    const dayOfWeek = refDate.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() + mondayOffset);

    const weekShifts: { date: string; shift_type: string; start_time?: string; end_time?: string; note?: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const shift = shiftsMap.get(dateStr);
      if (shift) {
        weekShifts.push({
          date: dateStr,
          shift_type: shift.shift_type,
          start_time: shift.start_time,
          end_time: shift.end_time,
          note: shift.note,
        });
      }
    }

    if (weekShifts.length === 0) {
      toast.warning('Sem turnos nesta semana para copiar');
      return;
    }

    const nextWeekItems = weekShifts.map((s) => {
      const d = new Date(s.date + 'T12:00:00');
      d.setDate(d.getDate() + 7);
      return {
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        shift_type: s.shift_type,
      };
    });

    try {
      setIsOptionsExpanded(false);
      await bulkUpsertShifts(nextWeekItems);
      await fetchShifts(currentMonth);
      toast.success(`${nextWeekItems.length} turno(s) copiado(s) para a semana seguinte`);
    } catch {
      toast.error('Erro ao copiar semana');
    }
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
    return resolveShiftColor(shiftType, configuredShift?.color);
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
        <View>
          <Text style={styles.customHeaderTitle}>Turnos</Text>
          <Text style={styles.customHeaderSubtitle}>{formatMonth(currentMonth)}</Text>
        </View>
        <TouchableOpacity
          style={styles.toggleOptionsBtn}
          onPress={() => setIsOptionsExpanded((prev) => !prev)}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isOptionsExpanded ? 'close' : 'add'}
            size={24}
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
        {editMode !== 'none' && editMode !== 'multi_select' && (
          <View style={styles.topActionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelEditMode}>
              <Text style={styles.cancelBtnText}>Cancelar modo de edição</Text>
            </TouchableOpacity>
          </View>
        )}
        {editMode === 'multi_select' && (
          <View style={styles.topActionsRow}>
            <View style={styles.multiSelectHint}>
              <Ionicons name="hand-left-outline" size={12} color="#60A5FA" />
              <Text style={styles.multiSelectHintText}>Toca nos dias para selecionar · Segura para sair</Text>
            </View>
          </View>
        )}

        {/* Month Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionEyebrow}>Resumo mensal</Text>
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

          {isLoadingShifts && !refreshing ? (
            <View style={styles.skeletonGrid}>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCalendarRow key={i} />
              ))}
            </View>
          ) : null}
          <View style={[styles.daysGrid, isLoadingShifts && !refreshing && { opacity: 0 }]}>
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
              const isMultiSelected = editMode === 'multi_select' && selectedDates.has(dateStr);

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
                  onPress={() => handleDayPress(dateStr)}
                  onLongPress={() => handleDayLongPress(dateStr)}
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
                    <View style={styles.gratifiedDotWrap}>
                      <Ionicons name="star-sharp" size={12} color="#F59E0B" />
                      {gratifiedCount > 1 && (
                        <Text style={styles.gratifiedCountText}>{gratifiedCount}</Text>
                      )}
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
        </View>
      </ScrollView>

      <Modal
        visible={isOptionsExpanded}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOptionsExpanded(false)}
      >
        <Pressable style={styles.optionsOverlay} onPress={() => setIsOptionsExpanded(false)}>
          <Animated.View
            style={[
              styles.optionsPanelFloating,
              {
                opacity: optionsPanelAnim,
                transform: [
                  {
                    translateY: optionsPanelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    }),
                  },
                  {
                    scale: optionsPanelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Pressable onPress={() => {}}>
            <View style={styles.optionsHandle} />
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
                        activeOpacity={0.8}
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

              {/* Copy week */}
              <View style={styles.optionsPanelSection}>
                <Text style={styles.optionsSectionTitle}>Ações rápidas</Text>
                <TouchableOpacity style={styles.copyWeekBtn} onPress={handleCopyWeek} activeOpacity={0.8}>
                  <View style={styles.copyWeekIcon}>
                    <Ionicons name="copy-outline" size={16} color="#60A5FA" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.copyWeekLabel}>Copiar semana para próxima</Text>
                    <Text style={styles.copyWeekHint}>Copia todos os turnos desta semana para a semana seguinte</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#475569" />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsDivider} />

              <View style={styles.optionsPanelSection}>
                <Text style={styles.optionsSectionTitle}>Ciclos</Text>
                <Text style={styles.quickBarTitle}>Seleciona um ciclo, depois toca no dia inicial e no final</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.cycleButtons}>
                    <TouchableOpacity
                      style={[styles.cycleBtn, { backgroundColor: '#10B981' }]}
                      activeOpacity={0.8}
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
                        activeOpacity={0.8}
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
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Multi-select action bar */}
      {editMode === 'multi_select' && (
        <View style={styles.multiSelectBar}>
          <View style={styles.multiSelectInfo}>
            <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
            <Text style={styles.multiSelectCount}>
              {selectedDates.size} {selectedDates.size === 1 ? 'dia' : 'dias'} selecionado{selectedDates.size !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.multiSelectActions}>
            <TouchableOpacity style={styles.multiSelectClearBtn} onPress={cancelEditMode}>
              <Text style={styles.multiSelectClearText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.multiSelectApplyBtn, selectedDates.size === 0 && { opacity: 0.4 }]}
              onPress={() => selectedDates.size > 0 && setMultiSelectShiftPicker(true)}
            >
              <Ionicons name="color-wand-outline" size={14} color="#fff" />
              <Text style={styles.multiSelectApplyText}>Aplicar Turno</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Multi-select shift picker */}
      <Modal visible={multiSelectShiftPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.dayDetailModal}>
            <View style={styles.modalDragHandle} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Aplicar a {selectedDates.size} dias</Text>
                <Text style={styles.modalDateWeekday}>Escolhe o tipo de turno</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setMultiSelectShiftPicker(false)}>
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 8, paddingBottom: 20 }}>
                {(shiftTypes as any[]).map((shift: any) => (
                  <TouchableOpacity
                    key={shift.name}
                    style={[styles.multiPickerChip, { borderColor: shift.color || '#3B82F6' }]}
                    onPress={() => handleApplyToSelected(shift.name)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.multiPickerDot, { backgroundColor: shift.color || '#3B82F6' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.multiPickerName}>{shift.name}</Text>
                      {(shift.start_time || shift.startTime) && (
                        <Text style={styles.multiPickerTime}>
                          {shift.start_time || shift.startTime} – {shift.end_time || shift.endTime}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#475569" />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Day Detail Modal */}
      <Modal visible={showDayDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.dayDetailModal}>
            {/* Drag handle */}
            <View style={styles.modalDragHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalDateWeekday}>
                  {selectedDate ? formatDate(selectedDate, 'EEEE') : ''}
                </Text>
                <Text style={styles.modalTitle}>
                  {selectedDate ? formatDate(selectedDate, 'd MMMM yyyy') : ''}
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowDayDetailModal(false)}>
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Shift Section */}
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                  <Text style={styles.detailSectionTitle}>Turno</Text>
                </View>
                {selectedShift ? (
                  <View style={[
                    styles.shiftDetailCard,
                    { borderLeftColor: getShiftDisplayColor(selectedShift.shift_type) }
                  ]}>
                    <View style={styles.shiftDetailCardTop}>
                      <View style={[
                        styles.shiftDetailBadge,
                        { backgroundColor: getShiftDisplayColor(selectedShift.shift_type) + '22' }
                      ]}>
                        <Text style={[
                          styles.shiftDetailBadgeText,
                          { color: getShiftDisplayColor(selectedShift.shift_type) }
                        ]}>
                          {getShiftDisplayName(selectedShift.shift_type)}
                        </Text>
                      </View>
                    </View>
                    {selectedShift.start_time && selectedShift.end_time ? (
                      <View style={styles.shiftTimeRow}>
                        <Ionicons name="time-outline" size={14} color="#6B7280" />
                        <Text style={styles.shiftTime}>
                          {selectedShift.start_time} – {selectedShift.end_time}
                        </Text>
                      </View>
                    ) : selectedShift.start_time ? (
                      <View style={styles.shiftTimeRow}>
                        <Ionicons name="time-outline" size={14} color="#6B7280" />
                        <Text style={styles.shiftTime}>{selectedShift.start_time}</Text>
                      </View>
                    ) : null}
                    {selectedShift.note ? (
                      <View style={styles.shiftNoteRow}>
                        <Ionicons name="document-text-outline" size={14} color="#6B7280" />
                        <Text style={styles.noteText}>{selectedShift.note}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.emptyStateRow}>
                    <Ionicons name="calendar-outline" size={16} color="#4B5563" />
                    <Text style={styles.noDataText}>Sem turno registado</Text>
                  </View>
                )}

                {/* Action buttons */}
                <View style={styles.actionButtonRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnPrimary]}
                    onPress={() => {
                      setShowDayDetailModal(false);
                      setShowShiftModal(true);
                    }}
                  >
                    <Ionicons name={selectedShift ? 'pencil' : 'add'} size={16} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>
                      {selectedShift ? 'Editar' : 'Adicionar'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnGreen]}
                    onPress={() => {
                      setShowDayDetailModal(false);
                      setShowGratifiedModal(true);
                    }}
                  >
                    <Ionicons name="cash-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Gratificado</Text>
                  </TouchableOpacity>
                </View>

                {selectedShift && (
                  <TouchableOpacity
                    style={styles.duplicateBtn}
                    onPress={handleDuplicateShift}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="copy-outline" size={15} color="#60A5FA" />
                    <Text style={styles.duplicateBtnText}>Duplicar para amanhã</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Divider */}
              <View style={styles.sectionDivider} />

              {/* Gratified Section */}
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Ionicons name="star-outline" size={14} color="#6B7280" />
                  <Text style={styles.detailSectionTitle}>
                    Gratificados
                    {gratifiedForSelectedDate.length > 0 && (
                      <Text style={styles.sectionCount}> ({gratifiedForSelectedDate.length})</Text>
                    )}
                  </Text>
                </View>
                {gratifiedForSelectedDate.length === 0 ? (
                  <View style={styles.emptyStateRow}>
                    <Ionicons name="star-outline" size={16} color="#4B5563" />
                    <Text style={styles.noDataText}>Sem gratificados registados</Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {gratifiedForSelectedDate.map((g: any) => (
                      <View key={g.id} style={styles.gratDetailCard}>
                        <View style={styles.gratHeader}>
                          <Text style={styles.gratName}>{g.name}</Text>
                          <Text style={styles.gratValue}>{Number(g.value || 0).toFixed(2)}€</Text>
                        </View>
                        {g.start_time && g.end_time ? (
                          <View style={styles.shiftTimeRow}>
                            <Ionicons name="time-outline" size={13} color="#6B7280" />
                            <Text style={styles.hintText}>{g.start_time} – {g.end_time} · já com desconto</Text>
                          </View>
                        ) : null}
                        <TouchableOpacity
                          style={styles.removeGratifiedBtn}
                          onPress={() => handleDeleteGratifiedEntry(g.id)}
                        >
                          <Ionicons name="trash-outline" size={13} color="#FCA5A5" />
                          <Text style={styles.removeGratifiedBtnText}>Remover</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            {selectedShift && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleShiftDelete}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
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

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteConfirm} animationType="fade" transparent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: 'rgba(11, 17, 32, 0.85)', padding: 20, borderRadius: 12, width: '80%', maxWidth: 300 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Eliminar turno</Text>
            <Text style={{ color: '#9CA3AF', marginBottom: 20 }}>Tem a certeza que quer eliminar este turno?</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: 'rgba(30, 41, 59, 0.8)', padding: 10, borderRadius: 8, alignItems: 'center' }}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#EF4444', padding: 10, borderRadius: 8, alignItems: 'center' }}
                onPress={confirmDeleteShift}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Gratification Confirmation Modal */}
      <Modal visible={deleteGratifiedId !== null} animationType="fade" transparent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: 'rgba(11, 17, 32, 0.85)', padding: 20, borderRadius: 12, width: '80%', maxWidth: 300 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Eliminar gratificado</Text>
            <Text style={{ color: '#9CA3AF', marginBottom: 20 }}>Tem a certeza que quer eliminar este gratificado?</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: 'rgba(30, 41, 59, 0.8)', padding: 10, borderRadius: 8, alignItems: 'center' }}
                onPress={() => setDeleteGratifiedId(null)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#EF4444', padding: 10, borderRadius: 8, alignItems: 'center' }}
                onPress={confirmDeleteGratified}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#050816',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  customHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  customHeaderSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#93C5FD',
    textTransform: 'capitalize',
  },
  toggleOptionsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.35)',
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
    marginBottom: 8,
  },
  cancelBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  cancelBtnText: {
    color: '#FCA5A5',
    fontWeight: '600',
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 110,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  summaryContainer: {
    marginHorizontal: 12,
    marginBottom: 16,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  quickBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(11, 17, 32, 0.85)',
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
    backgroundColor: 'rgba(11, 17, 32, 0.85)',
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
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
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
    backgroundColor: 'rgba(11, 17, 32, 0.85)',
    borderRadius: 16,
    padding: 10,
    marginHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    justifyContent: 'flex-start',
    paddingTop: 66,
    paddingHorizontal: 12,
    zIndex: 40,
  },
  optionsPanelFloating: {
    backgroundColor: 'rgba(11, 17, 32, 0.85)',
    borderRadius: 16,
    padding: 12,
    width: '100%',
    maxHeight: '60%',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    zIndex: 50,
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  optionsHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#4B5563',
    alignSelf: 'center',
    marginBottom: 10,
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
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
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
    paddingVertical: 4,
    minHeight: 58,
    borderRadius: 10,
    position: 'relative',
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.9)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  gratifiedDotWrap: {
    position: 'absolute',
    top: 3,
    right: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
  shiftTimeText: {
    fontSize: 6,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 1,
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
    backgroundColor: 'rgba(11, 17, 32, 0.85)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#4B5563',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalDateWeekday: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginTop: 2,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '400',
    color: '#4B5563',
    textTransform: 'none',
    letterSpacing: 0,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    marginBottom: 16,
  },
  emptyStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    marginBottom: 12,
  },
  shiftDetailCard: {
    backgroundColor: '#050816',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  shiftDetailCardTop: {
    marginBottom: 8,
  },
  shiftDetailBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  shiftDetailBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  shiftTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  shiftNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  shiftTime: {
    fontSize: 13,
    color: '#9CA3AF',
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
    flex: 1,
    fontStyle: 'italic',
  },
  noDataText: {
    fontSize: 14,
    color: '#4B5563',
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnPrimary: {
    backgroundColor: '#3B82F6',
  },
  actionBtnGreen: {
    backgroundColor: '#059669',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
    backgroundColor: '#050816',
    borderRadius: 12,
    padding: 14,
  },
  gratHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gratName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
    flex: 1,
    marginRight: 8,
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
    fontSize: 20,
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
    gap: 5,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeGratifiedBtnText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600',
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

  skeletonGrid: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 56,
    gap: 4,
  },
  duplicateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.18)',
    alignSelf: 'flex-start',
  },
  duplicateBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#60A5FA',
  },
  copyWeekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.18)',
  },
  copyWeekIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyWeekLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 2,
  },
  copyWeekHint: {
    fontSize: 11,
    color: '#475569',
  },

  // Multi-select styles
  multiSelectedCell: {
    backgroundColor: 'rgba(59, 130, 246, 0.22)',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  multiSelectedDayText: {
    color: '#93C5FD',
    fontWeight: '700',
  },
  multiCheckWrap: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  multiSelectBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 94 : 82,
    left: 12,
    right: 12,
    backgroundColor: '#0B1120',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 50,
  },
  multiSelectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  multiSelectCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  multiSelectActions: {
    flexDirection: 'row',
    gap: 8,
  },
  multiSelectClearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  multiSelectClearText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  multiSelectApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
  },
  multiSelectApplyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  multiSelectHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  multiSelectHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#60A5FA',
  },
  multiPickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  multiPickerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  multiPickerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  multiPickerTime: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
});
