import React, { useEffect, useReducer, useState, useMemo, useCallback } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDataStore, Cycle, GratifiedEntry } from '../../src/store/dataStore';
import { Shift, CalendarEvent, ShiftTypeConfig } from '../../src/types';
import {
  formatMonth,
  getCalendarDays,
  dateToString,
  resolveShiftColor,
} from '../../src/utils/helpers';
import { getHolidaysMap } from '../../src/utils/holidays';
import { ShiftModal } from '../../src/components/ShiftModal';
import { CycleModal } from '../../src/components/CycleModal';
import { GratifiedModal } from '../../src/components/GratifiedModal';
import { ShiftsSummary } from '../../src/components/ShiftsSummary';
import { GridSummary } from '../../src/components/calendar/GridSummary';
import { SkeletonCalendarRow } from '../../src/components/ui/Skeleton';
import { toast } from '../../src/utils/toast';
import { search } from '../../src/utils/search';
import { DayPopover, DayItem } from '../../src/components/calendar/DayPopover';
import { DetailSheet } from '../../src/components/calendar/DetailSheet';
import { EventFormModal } from '../../src/components/calendar/EventFormModal';
import { ShiftTypePicker } from '../../src/components/calendar/ShiftTypePicker';
import { DayShiftEditor } from '../../src/components/calendar/DayShiftEditor';
import { CalendarHeader } from '../../src/components/calendar/CalendarHeader';
import { MultiSelectBar } from '../../src/components/calendar/MultiSelectBar';
import { usePaintStore } from '../../src/store/paintStore';
import { usePreferencesStore } from '../../src/store/preferencesStore';
import { getThemeColors } from '../../src/theme/themes';
import { CalendarGrid } from '../../src/components/calendar/CalendarGrid';
import { OptionsPanel } from '../../src/components/calendar/OptionsPanel';

type EditMode = 'none' | 'quick' | 'cycle_start' | 'cycle_end' | 'multi_select';

interface EditState {
  mode: EditMode;
  shiftType: string | null;
  cycle: { id: string; name: string; pattern: string[] } | null;
  cycleStartDate: string | null;
  selectedDates: Set<string>;
  multiShiftPicker: boolean;
}
type EditAction =
  | { type: 'RESET' }
  | { type: 'PAINT_ON'; shiftType: string | null }
  | { type: 'PAINT_SHIFT'; shiftType: string }
  | { type: 'QUICK_ON'; shiftType: string }
  | { type: 'QUICK_OFF' }
  | { type: 'MULTI_START'; date: string }
  | { type: 'MULTI_TOGGLE'; date: string }
  | { type: 'MULTI_DONE' }
  | { type: 'MULTI_PICKER'; open: boolean }
  | { type: 'CYCLE_START'; cycle: { id: string; name: string; pattern: string[] } }
  | { type: 'CYCLE_SET_START'; date: string }
  | { type: 'CYCLE_DONE' };

const EDIT_INIT: EditState = {
  mode: 'none',
  shiftType: null,
  cycle: null,
  cycleStartDate: null,
  selectedDates: new Set(),
  multiShiftPicker: false,
};

function editReducer(state: EditState, action: EditAction): EditState {
  switch (action.type) {
    case 'RESET':
      return EDIT_INIT;
    case 'PAINT_ON':
      return { ...EDIT_INIT, mode: 'quick', shiftType: action.shiftType };
    case 'PAINT_SHIFT':
      return { ...state, shiftType: action.shiftType };
    case 'QUICK_ON':
      return { ...EDIT_INIT, mode: 'quick', shiftType: action.shiftType };
    case 'QUICK_OFF':
      return EDIT_INIT;
    case 'MULTI_START':
      return { ...EDIT_INIT, mode: 'multi_select', selectedDates: new Set([action.date]) };
    case 'MULTI_TOGGLE': {
      const next = new Set(state.selectedDates);
      if (next.has(action.date)) next.delete(action.date);
      else next.add(action.date);
      return { ...state, selectedDates: next };
    }
    case 'MULTI_DONE':
      return { ...state, selectedDates: new Set(), mode: 'none', multiShiftPicker: false };
    case 'MULTI_PICKER':
      return { ...state, multiShiftPicker: action.open };
    case 'CYCLE_START':
      return { ...EDIT_INIT, mode: 'cycle_start', cycle: action.cycle };
    case 'CYCLE_SET_START':
      return { ...state, cycleStartDate: action.date, mode: 'cycle_end' };
    case 'CYCLE_DONE':
      return EDIT_INIT;
    default:
      return state;
  }
}

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
    fetchGratifiedEntries,
    createEvent,
    updateEvent,
    deleteEvent,
    deleteGratifiedEntry,
    currentMonth,
    setCurrentMonth,
  } = useDataStore();

  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [isApplyingCycle, setIsApplyingCycle] = useState(false);
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);

  const [edit, dispatchEdit] = useReducer(editReducer, EDIT_INIT);
  const {
    mode: editMode,
    shiftType: selectedShiftType,
    cycle: selectedCycle,
    cycleStartDate,
    selectedDates,
    multiShiftPicker: multiSelectShiftPicker,
  } = edit;

  // Modal states
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [showGratifiedModal, setShowGratifiedModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  // Context popup + shift type picker
  const [popupDay, setPopupDay] = useState<string | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showShiftPicker, setShowShiftPicker] = useState(false);
  const [showDayShiftEditor, setShowDayShiftEditor] = useState(false);

  // Day-centric flow: event form + generic detail sheet
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [detailItem, setDetailItem] = useState<DayItem | null>(null);

  const calendarTheme = usePreferencesStore((s) => s.calendarTheme);
  const isGridTheme = calendarTheme !== 'classic';
  const isLight = calendarTheme === 'light';
  const t = getThemeColors(isLight);

  // Paint mode (state lives in paintStore so PaintModeBar can be rendered above the tab bar in _layout)
  const paintMode = usePaintStore((s) => s.active);
  const setPaintMode = usePaintStore((s) => s.setActive);
  const storePaintShiftType = usePaintStore((s) => s.shiftType);
  const setStorePaintShiftType = usePaintStore((s) => s.setShiftType);

  // Sync paint mode activation/deactivation with local edit state.
  // Runs on mount too — Zustand store persists across tab navigations but local state resets.
  useEffect(() => {
    if (paintMode) {
      dispatchEdit({ type: 'PAINT_ON', shiftType: storePaintShiftType });
    } else {
      dispatchEdit({ type: 'RESET' });
      setStorePaintShiftType(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintMode]);

  // When user picks a shift type in the PaintModeBar (rendered in _layout), sync to local state
  useEffect(() => {
    if (paintMode && storePaintShiftType !== null) {
      dispatchEdit({ type: 'PAINT_SHIFT', shiftType: storePaintShiftType });
    }
  }, [storePaintShiftType, paintMode]);

  const optionsPanelAnim = React.useRef(new Animated.Value(0)).current;
  const paintFlushTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (paintFlushTimer.current) clearTimeout(paintFlushTimer.current);
    };
  }, []);

  const shiftTypesMap = useMemo(() => {
    const map = new Map<string, ShiftTypeConfig>();
    (shiftTypes || []).forEach((shiftType: ShiftTypeConfig) => {
      const name = String(shiftType?.name || '').trim();
      if (!name) return;
      map.set(name, shiftType);
    });
    (shifts || []).forEach((s: Shift) => {
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
    const map = new Map<string, GratifiedEntry[]>();
    (gratifiedEntries || []).forEach((entry: GratifiedEntry) => {
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
    shifts.forEach((s: Shift) => map.set(s.date, s));
    return map;
  }, [shifts]);

  useEffect(() => {
    setIsLoadingShifts(true);
    Promise.all([
      fetchShifts(currentMonth),
      fetchGratifiedEntries(currentMonth),
      fetchEvents(currentMonth),
    ]).finally(() => setIsLoadingShifts(false));
  }, [currentMonth, fetchShifts, fetchGratifiedEntries, fetchEvents]);

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
      dispatchEdit({ type: 'MULTI_START', date: dateStr });
    }
  };

  const handleApplyToSelected = async (shiftType: string) => {
    if (selectedDates.size === 0) return;
    const bulkItems = Array.from(selectedDates).map((date) => ({ date, shift_type: shiftType }));
    await bulkUpsertShifts(bulkItems);
    await fetchShifts(currentMonth);
    dispatchEdit({ type: 'MULTI_DONE' });
  };

  const handleDayPress = async (dateStr: string, pageX: number, pageY: number) => {
    if (editMode === 'multi_select') {
      dispatchEdit({ type: 'MULTI_TOGGLE', date: dateStr });
      return;
    }

    // Paint mode: apply selected shift directly, no popup.
    // Debounce the reconciliation fetch — each mutation already updates local state,
    // so we skip per-tap fetchShifts and fire one batch reconcile after 600ms idle.
    const schedulePaintFlush = () => {
      if (paintFlushTimer.current) clearTimeout(paintFlushTimer.current);
      paintFlushTimer.current = setTimeout(() => fetchShifts(currentMonth), 600);
    };

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
      schedulePaintFlush();
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
      schedulePaintFlush();
      return;
    }

    if (editMode === 'cycle_start' && selectedCycle) {
      dispatchEdit({ type: 'CYCLE_SET_START', date: dateStr });
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
      dispatchEdit({ type: 'CYCLE_DONE' });

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
      dispatchEdit({ type: 'QUICK_OFF' });
    } else {
      dispatchEdit({ type: 'QUICK_ON', shiftType: type });
    }
    setIsOptionsExpanded(false);
  };

  const cancelEditMode = () => {
    dispatchEdit({ type: 'RESET' });
    setPaintMode(false);
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
    (gratifiedByDateMap.get(popupDay) || []).forEach((g: GratifiedEntry) => {
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
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.customHeader, isLight && { backgroundColor: t.bgAlt, borderBottomColor: t.border }]}>
        <View>
          <Text style={[styles.customHeaderTitle, isLight && { color: t.textPrimary }]}>Turnos</Text>
          <Text style={styles.customHeaderSubtitle}>{formatMonth(currentMonth)}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.searchBtn, isLight && { backgroundColor: 'rgba(15,23,42,0.04)', borderColor: t.border }]}
            onPress={() => search.open()}
            activeOpacity={0.85}
          >
            <Ionicons name="search-outline" size={20} color={isLight ? t.textMuted : '#94A3B8'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.searchBtn, isLight && { backgroundColor: 'rgba(15,23,42,0.04)', borderColor: t.border }, paintMode && styles.paintBtnActive]}
            onPress={() => {
              if (paintMode) {
                cancelEditMode();
              } else {
                const firstType = shiftTypes[0]?.name || null;
                setPaintMode(true);
                dispatchEdit({ type: 'PAINT_ON', shiftType: firstType });
                setStorePaintShiftType(firstType);
                setPopupDay(null);
              }
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="brush-outline" size={20} color={paintMode ? '#3B82F6' : (isLight ? t.textMuted : '#94A3B8')} />
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
          <Text style={[styles.sectionEyebrow, isLight && { color: t.textMuted }]}>Resumo mensal</Text>
          {isGridTheme ? (
            <GridSummary shifts={shifts} shiftTypes={shiftTypes} month={currentMonth} />
          ) : (
            <ShiftsSummary shifts={shifts} shiftTypes={shiftTypes} month={currentMonth} />
          )}
        </View>

        <View style={[styles.calendarCard, isLight && { backgroundColor: t.surface, borderColor: t.border }]}>
          <CalendarHeader
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            isLight={isLight}
            t={t}
          />

          {isLoadingShifts && !refreshing ? (
            <View style={styles.skeletonGrid}>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCalendarRow key={i} />
              ))}
            </View>
          ) : null}

          <CalendarGrid
            weeks={weeks}
            isGridTheme={isGridTheme}
            isLight={isLight}
            t={t}
            today={today}
            holidaysMap={holidaysMap}
            gratifiedByDateMap={gratifiedByDateMap}
            eventsByDateMap={eventsByDateMap}
            editMode={editMode}
            selectedDates={selectedDates}
            cycleStartDate={cycleStartDate}
            loading={isLoadingShifts && !refreshing}
            getShiftForDay={getShiftForDay}
            getShiftDisplayColor={getShiftDisplayColor}
            getShiftDisplayName={getShiftDisplayName}
            isInCycleRange={isInCycleRange}
            onDayPress={handleDayPress}
            onDayLongPress={handleDayLongPress}
          />
        </View>
      </ScrollView>

      <OptionsPanel
        visible={isOptionsExpanded}
        isLight={isLight}
        t={t}
        editMode={editMode}
        cycles={cycles}
        selectedCycle={selectedCycle}
        cycleStartDate={cycleStartDate}
        optionsPanelAnim={optionsPanelAnim}
        onClose={() => setIsOptionsExpanded(false)}
        onNewCycle={() => {
          setShowCycleModal(true);
          setIsOptionsExpanded(false);
          cancelEditMode();
        }}
        onCyclePress={(cycle) => {
          if (selectedCycle?.id === cycle.id) {
            dispatchEdit({ type: 'RESET' });
          } else {
            dispatchEdit({ type: 'CYCLE_START', cycle: { id: cycle.id, name: cycle.name ?? '', pattern: cycle.pattern } });
          }
          setIsOptionsExpanded(false);
        }}
        onCycleLongPress={(cycle) => {
          setEditingCycle(cycle);
          setShowCycleModal(true);
          setIsOptionsExpanded(false);
        }}
      />

      <MultiSelectBar
        visible={editMode === 'multi_select'}
        selectedCount={selectedDates.size}
        isLight={isLight}
        t={t}
        onApply={() => dispatchEdit({ type: 'MULTI_PICKER', open: true })}
        onCancel={cancelEditMode}
      />

      {/* Multi-select shift picker */}
      <Modal visible={multiSelectShiftPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.dayDetailModal, isLight && { backgroundColor: t.surfaceAlt }]}>
            <View style={[styles.modalDragHandle, isLight && { backgroundColor: t.borderStrong }]} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, isLight && { color: t.textPrimary }]}>Aplicar a {selectedDates.size} dias</Text>
                <Text style={[styles.modalDateWeekday, isLight && { color: t.textMuted }]}>Escolhe o tipo de turno</Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, isLight && { backgroundColor: 'rgba(15,23,42,0.06)' }]}
                onPress={() => dispatchEdit({ type: 'MULTI_PICKER', open: false })}
              >
                <Ionicons name="close" size={20} color={isLight ? t.textSecondary : '#9CA3AF'} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 8, paddingBottom: 20 }}>
                {shiftTypes.map((shift) => (
                  <TouchableOpacity
                    key={shift.name}
                    style={[styles.multiPickerChip, isLight && { backgroundColor: t.bg }, { borderColor: shift.color || '#3B82F6' }]}
                    onPress={() => handleApplyToSelected(shift.name)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.multiPickerDot, { backgroundColor: shift.color || '#3B82F6' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.multiPickerName, isLight && { color: t.textPrimary }]}>{shift.name}</Text>
                      {(shift.start_time || shift.startTime) && (
                        <Text style={[styles.multiPickerTime, isLight && { color: t.textMuted }]}>
                          {shift.start_time || shift.startTime} – {shift.end_time || shift.endTime}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={isLight ? t.textMuted : '#475569'} />
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
        rows={[]}
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
    borderBottomColor: 'rgba(148,163,184,0.18)',
  },
  customHeaderTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  customHeaderSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
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
    backgroundColor: 'rgba(148,163,184,0.18)',
    borderWidth: 0.5,
    borderColor: 'rgba(148,163,184,0.26)',
  },
  toggleOptionsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(59,130,246,0.35)',
  },
  paintBtnActive: {
    backgroundColor: 'rgba(59,130,246,0.18)',
    borderColor: 'rgba(59,130,246,0.55)',
    borderWidth: 0.5,
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
    borderWidth: 0.5,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  cancelBtnText: {
    color: '#FCA5A5',
    fontWeight: '500',
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
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  calendarCard: {
    backgroundColor: 'rgba(11, 17, 32, 0.85)',
    borderRadius: 16,
    padding: 10,
    marginHorizontal: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(59, 130, 246, 0.1)',
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
    borderBottomColor: 'rgba(148,163,184,0.18)',
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
    fontWeight: '500',
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
    borderWidth: 0.5,
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
    fontWeight: '500',
    color: '#E2E8F0',
    marginBottom: 2,
  },
  copyWeekHint: {
    fontSize: 11,
    color: '#475569',
  },
  multiSelectHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  multiSelectHintText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#60A5FA',
  },
  multiPickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    backgroundColor: 'rgba(148,163,184,0.10)',
  },
  multiPickerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  multiPickerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F1F5F9',
  },
  multiPickerTime: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
});
