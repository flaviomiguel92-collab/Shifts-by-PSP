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
import { useRouter } from 'expo-router';
import { useDataStore } from '../../src/store/dataStore';
import { Shift, CalendarEvent } from '../../src/types';
import {
  formatMonth,
  getCalendarDays,
  dateToString,
  WEEKDAYS,
  getNextMonth,
  getPrevMonth,
  formatDate,
  resolveShiftColor,
} from '../../src/utils/helpers';
import { getHolidaysMap } from '../../src/utils/holidays';
import { ShiftModal } from '../../src/components/ShiftModal';
import { CycleModal } from '../../src/components/CycleModal';
import { GratifiedModal } from '../../src/components/GratifiedModal';
import { ShiftsSummary } from '../../src/components/ShiftsSummary';
import { SkeletonCalendarRow } from '../../src/components/ui/Skeleton';
import { toast } from '../../src/utils/toast';
import { search } from '../../src/utils/search';
import { DayPopover, DayItem } from '../../src/components/calendar/DayPopover';
import { DetailSheet } from '../../src/components/calendar/DetailSheet';
import { EventFormModal } from '../../src/components/calendar/EventFormModal';
import { ShiftTypePicker } from '../../src/components/calendar/ShiftTypePicker';
import { DayShiftEditor } from '../../src/components/calendar/DayShiftEditor';
import { usePaintStore } from '../../src/store/paintStore';

type EditMode = 'none' | 'quick' | 'cycle_start' | 'cycle_end' | 'multi_select';

export default function CalendarScreen() {
  const router = useRouter();
  const {
    shifts,
    shiftTypes,
    cycles,
    gratifiedEntries,
    events,
    fetchShifts,
    createShift,
    updateShift,
    bulkUpsertShifts,
    deleteShift,
    createShiftType,
    fetchShiftTypes,
    updateShiftType,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    deleteGratifiedEntry,
    currentMonth,
    setCurrentMonth,
  } = useDataStore();

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
  const [editingCycle, setEditingCycle] = useState<import('../../src/store/dataStore').Cycle | null>(null);
  const [showGratifiedModal, setShowGratifiedModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [multiSelectShiftPicker, setMultiSelectShiftPicker] = useState(false);

  // Context popup + shift type picker
  const [popupDay, setPopupDay] = useState<string | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showShiftPicker, setShowShiftPicker] = useState(false);
  const [showDayShiftEditor, setShowDayShiftEditor] = useState(false);

  // Day-centric flow: event form + generic detail sheet
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [detailItem, setDetailItem] = useState<DayItem | null>(null);

  // Paint mode (state lives in paintStore so PaintModeBar can be rendered above the tab bar in _layout)
  const paintMode = usePaintStore((s) => s.active);
  const setPaintMode = usePaintStore((s) => s.setActive);
  const storePaintShiftType = usePaintStore((s) => s.shiftType);
  const setStorePaintShiftType = usePaintStore((s) => s.setShiftType);

  // Sync paint mode activation/deactivation with local edit state.
  // Runs on mount too — Zustand store persists across tab navigations but local state resets.
  useEffect(() => {
    if (paintMode) {
      setEditMode('quick');
      if (storePaintShiftType !== null) setSelectedShiftType(storePaintShiftType);
    } else {
      setEditMode('none');
      setSelectedShiftType(null);
      setStorePaintShiftType(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintMode]);

  // When user picks a shift type in the PaintModeBar (rendered in _layout), sync to local state
  useEffect(() => {
    if (paintMode && storePaintShiftType !== null) {
      setSelectedShiftType(storePaintShiftType);
    }
  }, [storePaintShiftType, paintMode]);

  const optionsPanelAnim = React.useRef(new Animated.Value(0)).current;

  const shiftTypesMap = useMemo(() => {
    const map = new Map<string, any>();
    (shiftTypes || []).forEach((shiftType: any) => {
      const name = String(shiftType?.name || '').trim();
      if (!name) return;
      map.set(name, shiftType);
    });
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

  const weeks = useMemo(() => {
    const result: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  const gratifiedByDateMap = useMemo(() => {
    const map = new Map<string, any[]>();
    (gratifiedEntries || []).forEach((entry: any) => {
      const date = String(entry?.date || '');
      if (!date) return;
      if (!map.has(date)) map.set(date, []);
      map.get(date)?.push(entry);
    });
    return map;
  }, [gratifiedEntries]);

  const eventsByDateMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    (events || []).forEach((ev) => {
      const date = String(ev?.date || '');
      if (!date) return;
      if (!map.has(date)) map.set(date, []);
      map.get(date)?.push(ev);
    });
    return map;
  }, [events]);

  const shiftsMap = useMemo(() => {
    const map = new Map<string, Shift>();
    shifts.forEach((s: any) => map.set(s.date, s));
    return map;
  }, [shifts]);

  useEffect(() => {
    setIsLoadingShifts(true);
    fetchShifts(currentMonth).finally(() => setIsLoadingShifts(false));
  }, [currentMonth, fetchShifts]);

  // Close popup when navigating months
  useEffect(() => {
    setPopupDay(null);
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

  const handleDayLongPress = (dateStr: string) => {
    if (editMode === 'none') {
      setEditMode('multi_select');
      setSelectedDates(new Set([dateStr]));
      setSelectedShiftType(null);
      setSelectedCycle(null);
    }
  };

  const handleApplyToSelected = async (shiftType: string) => {
    if (selectedDates.size === 0) return;
    const bulkItems = Array.from(selectedDates).map((date) => ({ date, shift_type: shiftType }));
    await bulkUpsertShifts(bulkItems);
    await fetchShifts(currentMonth);
    setSelectedDates(new Set());
    setEditMode('none');
    setMultiSelectShiftPicker(false);
  };

  const handleDayPress = async (dateStr: string, pageX: number, pageY: number) => {
    if (editMode === 'multi_select') {
      setSelectedDates((prev) => {
        const next = new Set(prev);
        if (next.has(dateStr)) next.delete(dateStr);
        else next.add(dateStr);
        return next;
      });
      return;
    }

    // Paint mode: apply selected shift directly, no popup
    if (paintMode && selectedShiftType) {
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
      return;
    }

    if (editMode === 'quick' && selectedShiftType) {
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
      return;
    }

    if (editMode === 'cycle_start' && selectedCycle) {
      setCycleStartDate(dateStr);
      setEditMode('cycle_end');
      return;
    }

    if (editMode === 'cycle_end' && selectedCycle && cycleStartDate) {
      await applyCycleFromDates(cycleStartDate, dateStr, selectedCycle.pattern);
      return;
    }

    // Normal mode: show contextual popup
    const shift = getShiftForDay(dateStr);
    setSelectedDate(dateStr);
    setSelectedShift(shift || null);
    setPopupDay(dateStr);
    setPopupAnchor({ x: pageX, y: pageY });
  };

  const applyCycleFromDates = async (startDate: string, endDate: string, cycle: string[]) => {
    setIsApplyingCycle(true);

    const fmt = (date: Date) => {
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
        bulkItems.push({ date: fmt(currentDate), shift_type: normalizedCycle[i % normalizedCycle.length] });
        currentDate.setDate(currentDate.getDate() + 1);
        i++;
      }

      const result = await bulkUpsertShifts(bulkItems);
      await fetchShifts(currentMonth);
      setEditMode('none');
      setSelectedCycle(null);
      setCycleStartDate(null);

      Alert.alert(
        'Sucesso!',
        `Ciclo aplicado com sucesso!\nCriados: ${result?.created ?? 0}\nAtualizados: ${result?.updated ?? 0}`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      Alert.alert('Erro ao aplicar ciclo', errorMsg);
    } finally {
      setIsApplyingCycle(false);
    }
  };

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
        const existingShift = shiftsMap.get(selectedDate);
        if (existingShift) {
          await updateShift(existingShift.id, shiftData);
        } else {
          await createShift({ date: selectedDate, ...shiftData });
        }
      }
      await fetchShifts(currentMonth);
      setShowShiftModal(false);
      setPopupDay(null);
      toast.success('Turno guardado');
    } catch {
      toast.error('Não foi possível guardar o turno');
    }
  };

  const handleShiftDelete = () => {
    if (!selectedShift) return;
    const doDelete = async () => {
      try {
        await deleteShift(selectedShift.id);
        await fetchShifts(currentMonth);
        setShowShiftModal(false);
        setPopupDay(null);
        toast.success('Turno eliminado');
      } catch {
        toast.error('Não foi possível eliminar o turno');
      }
    };
    // RN Web's Alert.alert does not invoke button onPress callbacks.
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Tem a certeza que quer eliminar este turno?')) {
        doDelete();
      }
      return;
    }
    Alert.alert(
      'Eliminar turno',
      'Tem a certeza que quer eliminar este turno?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]
    );
  };

  const handleApplyShiftFromPicker = async (typeName: string) => {
    if (!selectedDate) return;
    try {
      const existing = getShiftForDay(selectedDate);
      if (existing) {
        await updateShift(existing.id, { shift_type: typeName });
      } else {
        await createShift({ date: selectedDate, shift_type: typeName });
      }
      await fetchShifts(currentMonth);
      setShowShiftPicker(false);
      setPopupDay(null);
      toast.success('Turno aplicado');
    } catch {
      toast.error('Não foi possível aplicar o turno');
    }
  };

  const handleDeleteShiftFromPicker = async () => {
    if (!selectedShift) return;
    try {
      await deleteShift(selectedShift.id);
      await fetchShifts(currentMonth);
      setShowShiftPicker(false);
      setPopupDay(null);
      toast.success('Turno removido');
    } catch {
      toast.error('Não foi possível remover o turno');
    }
  };

  const handleCreateShiftType = async (data: {
    name: string; color: string; start_time?: string; end_time?: string; is_working: boolean;
  }) => {
    try {
      await createShiftType(data);
      await fetchShiftTypes();
    } catch {
      toast.error('Não foi possível criar o tipo de turno');
    }
  };

  const handleCreateAndApplyShiftType = async (data: {
    name: string; color: string; start_time?: string; end_time?: string; is_working: boolean;
  }) => {
    try {
      await createShiftType(data);
      await fetchShiftTypes();
      await handleApplyShiftFromPicker(data.name);
    } catch {
      toast.error('Não foi possível criar e aplicar o tipo de turno');
    }
  };

  const handleUpdateShiftType = async (
    id: string,
    data: { name: string; color: string; start_time?: string | null; end_time?: string | null; is_working: boolean }
  ) => {
    try {
      await updateShiftType(id, {
        ...data,
        start_time: data.start_time ?? undefined,
        end_time: data.end_time ?? undefined,
      });
      toast.success('Tipo de turno atualizado');
    } catch {
      toast.error('Não foi possível atualizar o tipo de turno');
    }
  };

  const handleDayShiftSave = async (data: {
    shift_type: string; start_time?: string; end_time?: string; note?: string;
  }) => {
    if (!selectedDate) return;
    try {
      const existing = shiftsMap.get(selectedDate);
      if (existing) {
        await updateShift(existing.id, data);
      } else {
        await createShift({ date: selectedDate, ...data });
      }
      await fetchShifts(currentMonth);
      setShowDayShiftEditor(false);
      toast.success('Turno guardado');
    } catch {
      toast.error('Não foi possível guardar o turno');
    }
  };

  const handleDayShiftDelete = async () => {
    const existing = selectedDate ? shiftsMap.get(selectedDate) : null;
    if (!existing) return;
    try {
      await deleteShift(existing.id);
      await fetchShifts(currentMonth);
      setShowDayShiftEditor(false);
      toast.success('Turno removido');
    } catch {
      toast.error('Não foi possível remover o turno');
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

  const cancelEditMode = () => {
    setEditMode('none');
    setSelectedShiftType(null);
    setSelectedCycle(null);
    setCycleStartDate(null);
    setSelectedDates(new Set());
    setMultiSelectShiftPicker(false);
    setPaintMode(false);
  };

  const handleCopyWeek = async () => {
    const refDate = new Date(currentMonth + '-01T12:00:00');
    const dayOfWeek = refDate.getDay();
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

  const popupShift = popupDay ? getShiftForDay(popupDay) || null : null;

  const popupItems: DayItem[] = (() => {
    if (!popupDay) return [];
    const out: DayItem[] = [];
    if (popupShift) {
      out.push({
        id: popupShift.id,
        kind: 'shift',
        iconName: 'calendar',
        color: getShiftDisplayColor(popupShift.shift_type),
        title: getShiftDisplayName(popupShift.shift_type),
        time: [popupShift.start_time, popupShift.end_time].filter(Boolean).join(' – ') || undefined,
      });
    }
    (eventsByDateMap.get(popupDay) || []).forEach((ev) => {
      out.push({
        id: ev.id,
        kind: 'event',
        iconName: 'reader',
        color: '#3B82F6',
        title: ev.title,
        time: [ev.start_time, ev.end_time].filter(Boolean).join(' – ') || undefined,
      });
    });
    (gratifiedByDateMap.get(popupDay) || []).forEach((g: any) => {
      out.push({
        id: g.id,
        kind: 'grat',
        iconName: 'cash',
        color: '#10B981',
        title: g.name || 'Gratificado',
        time: [g.start_time, g.end_time].filter(Boolean).join(' – ') || undefined,
        trailing: g.value != null ? `${Number(g.value).toFixed(2)} €` : undefined,
      });
    });
    return out;
  })();

  const handleOpenItem = (item: DayItem) => {
    setPopupDay(null);
    setDetailItem(item);
  };

  const handleDetailEdit = () => {
    if (!detailItem) return;
    if (detailItem.kind === 'shift') {
      setDetailItem(null);
      setShowDayShiftEditor(true);
    } else if (detailItem.kind === 'event') {
      const ev = (events || []).find((e) => e.id === detailItem.id) || null;
      setEditingEvent(ev);
      setDetailItem(null);
      setShowEventForm(true);
    }
  };

  const handleDetailRemove = async () => {
    if (!detailItem) return;
    const { kind, id } = detailItem;
    setDetailItem(null);
    try {
      if (kind === 'shift') {
        await deleteShift(id);
        await fetchShifts(currentMonth);
        toast.success('Turno removido deste dia');
      } else if (kind === 'event') {
        await deleteEvent(id);
        toast.success('Evento eliminado');
      } else {
        await deleteGratifiedEntry(id);
        toast.success('Gratificado eliminado');
      }
    } catch {
      toast.error('Não foi possível remover');
    }
  };

  const handleSaveEvent = async (data: {
    title: string; start_time?: string; end_time?: string; location?: string; note?: string;
  }) => {
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, data);
        toast.success('Evento atualizado');
      } else {
        await createEvent({ date: selectedDate, ...data });
        toast.success('Evento criado');
      }
      await fetchEvents(currentMonth);
      setShowEventForm(false);
      setEditingEvent(null);
    } catch {
      toast.error('Não foi possível guardar o evento');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.customHeader}>
        <View>
          <Text style={styles.customHeaderTitle}>Turnos</Text>
          <Text style={styles.customHeaderSubtitle}>{formatMonth(currentMonth)}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => search.open()}
            activeOpacity={0.85}
          >
            <Ionicons name="search-outline" size={20} color="#94A3B8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.searchBtn, paintMode && styles.paintBtnActive]}
            onPress={() => {
              if (paintMode) {
                cancelEditMode();
              } else {
                const firstType = shiftTypes[0]?.name || null;
                setPaintMode(true);
                setEditMode('quick');
                setSelectedShiftType(firstType);
                setStorePaintShiftType(firstType);
                setPopupDay(null);
              }
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="brush-outline" size={20} color={paintMode ? '#3B82F6' : '#94A3B8'} />
          </TouchableOpacity>
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

        <View style={styles.summaryContainer}>
          <Text style={styles.sectionEyebrow}>Resumo mensal</Text>
          <ShiftsSummary shifts={shifts} shiftTypes={shiftTypes} month={currentMonth} />
        </View>

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
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((day, di) => {
                  if (!day) {
                    return <View key={`empty-${wi}-${di}`} style={styles.dayCell} />;
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
                        handleDayPress(dateStr, pageX, pageY);
                      }}
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
        </View>
      </ScrollView>

      {/* Options panel */}
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
                        onLongPress={() => {
                          setEditingCycle(cycle);
                          setShowCycleModal(true);
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
      <Modal visible={editMode === 'multi_select'} transparent animationType="none" onRequestClose={cancelEditMode}>
        <View style={{ flex: 1 }} pointerEvents="box-none">
          <View style={styles.multiSelectBar} pointerEvents="auto">
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
        </View>
      </Modal>

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
                {shiftTypes.map((shift) => (
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

      {/* Day-centric contextual popover */}
      <DayPopover
        visible={!!popupDay}
        day={popupDay || ''}
        items={popupItems}
        onClose={() => setPopupDay(null)}
        onAddShift={() => {
          setPopupDay(null);
          setShowShiftPicker(true);
        }}
        onAddEvent={() => {
          setPopupDay(null);
          setEditingEvent(null);
          setShowEventForm(true);
        }}
        onAddGrat={() => {
          setPopupDay(null);
          setShowGratifiedModal(true);
        }}
        onOpenItem={handleOpenItem}
      />

      {/* Generic detail sheet (shift / event / grat) */}
      <DetailSheet
        visible={!!detailItem}
        accentColor={detailItem?.color || '#374151'}
        iconName={detailItem?.iconName || 'ellipse-outline'}
        kindLabel={
          detailItem?.kind === 'shift'
            ? 'Detalhe do turno'
            : detailItem?.kind === 'event'
            ? 'Detalhe do evento'
            : 'Detalhe do gratificado'
        }
        title={detailItem?.title || ''}
        subtitle={detailItem?.time}
        rows={(() => {
          if (!detailItem) return [];
          const [start = '—', end = '—'] = (detailItem.time || '').split(' – ');
          if (detailItem.kind === 'grat') {
            return [
              { label: 'Início', value: start },
              { label: 'Fim', value: end },
              { label: 'Valor', value: 'Calculado automaticamente' },
            ];
          }
          return [
            { label: 'Início', value: start },
            { label: 'Fim', value: end },
          ];
        })()}
        note={
          detailItem?.kind === 'shift'
            ? 'Remove apenas a aplicação deste dia. O turno continua na lista de turnos.'
            : detailItem?.kind === 'grat'
            ? 'Valor calculado automaticamente pela app com base nas horas.'
            : undefined
        }
        removeLabel={
          detailItem?.kind === 'shift'
            ? 'Retirar turno deste dia'
            : detailItem?.kind === 'event'
            ? 'Eliminar evento'
            : 'Eliminar gratificado'
        }
        confirmMessage={
          detailItem?.kind === 'shift'
            ? 'Retirar o turno deste dia?'
            : detailItem?.kind === 'event'
            ? 'Eliminar este evento?'
            : 'Eliminar este gratificado?'
        }
        onClose={() => setDetailItem(null)}
        onEdit={detailItem && detailItem.kind !== 'grat' ? handleDetailEdit : undefined}
        onRemove={handleDetailRemove}
      />

      {/* Event form (create / edit) */}
      <EventFormModal
        visible={showEventForm}
        date={selectedDate}
        event={editingEvent}
        onClose={() => { setShowEventForm(false); setEditingEvent(null); }}
        onSave={handleSaveEvent}
      />

      {/* Shift type picker (opened from popup) */}
      <ShiftTypePicker
        visible={showShiftPicker}
        onClose={() => setShowShiftPicker(false)}
        shiftTypes={shiftTypes}
        hasExistingShift={!!popupShift}
        onApply={handleApplyShiftFromPicker}
        onDeleteShift={popupShift ? handleDeleteShiftFromPicker : undefined}
        onCreateType={handleCreateShiftType}
        onCreateAndApply={handleCreateAndApplyShiftType}
        onUpdateType={handleUpdateShiftType}
      />

      {/* Day shift editor (tap shift row in popup) */}
      <DayShiftEditor
        visible={showDayShiftEditor}
        onClose={() => setShowDayShiftEditor(false)}
        date={selectedDate}
        shift={selectedShift}
        shiftTypes={shiftTypes}
        onSave={handleDayShiftSave}
        onDelete={selectedShift ? handleDayShiftDelete : undefined}
      />

      {/* Shift edit modal (FAB + legacy) */}
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
        editingCycle={editingCycle}
        onClose={() => { setShowCycleModal(false); setEditingCycle(null); }}
      />

      <GratifiedModal
        visible={showGratifiedModal}
        onClose={() => setShowGratifiedModal(false)}
        date={selectedDate}
        isHolidayOrWeekend={
          !!selectedDate &&
          (() => {
            const d = new Date(selectedDate + 'T12:00:00');
            const day = d.getDay();
            return day === 0 || day === 6 || holidaysMap.has(selectedDate);
          })()
        }
      />


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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
  paintBtnActive: {
    backgroundColor: 'rgba(59,130,246,0.18)',
    borderColor: 'rgba(59,130,246,0.55)',
    borderWidth: 1,
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
  eventBadge: {
    marginTop: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignSelf: 'center',
  },
  eventBadgeText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#60A5FA',
  },
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
  skeletonGrid: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 56,
    gap: 4,
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
    bottom: Platform.OS === 'ios' ? 100 : 86,
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
