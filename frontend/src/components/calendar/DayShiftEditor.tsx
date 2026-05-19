import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShiftTypeConfig, Shift } from '../../types';
import { formatDate } from '../../utils/helpers';
import { useTheme } from '../../theme/themes';

interface DayShiftEditorProps {
  visible: boolean;
  onClose: () => void;
  date: string;
  shift: Shift | null;
  shiftTypes: ShiftTypeConfig[];
  onSave: (data: { shift_type: string; start_time?: string; end_time?: string; note?: string }) => void;
  onDelete?: () => void;
}

export function DayShiftEditor({
  visible,
  onClose,
  date,
  shift,
  shiftTypes,
  onSave,
  onDelete,
}: DayShiftEditorProps) {
  const [selectedType, setSelectedType] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [note, setNote] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (visible) {
      if (shift) {
        setSelectedType(shift.shift_type || '');
        const hasTime = !!(shift.start_time || shift.end_time);
        setAllDay(!hasTime);
        setStartTime(shift.start_time || '');
        setEndTime(shift.end_time || '');
        setNote(shift.note || '');
      } else if (shiftTypes.length > 0) {
        const first = shiftTypes[0];
        setSelectedType(first.name);
        const hasTime = !!(first.start_time || first.startTime);
        setAllDay(!hasTime);
        setStartTime(first.start_time || first.startTime || '');
        setEndTime(first.end_time || first.endTime || '');
        setNote('');
      }
      setLocation('');
    }
  }, [visible, shift, shiftTypes]);

  const handleTypeSelect = (st: ShiftTypeConfig) => {
    setSelectedType(st.name);
    const hasTime = !!(st.start_time || st.startTime);
    setAllDay(!hasTime);
    setStartTime(st.start_time || st.startTime || '');
    setEndTime(st.end_time || st.endTime || '');
  };

  const handleSave = () => {
    if (!selectedType) return;
    onSave({
      shift_type: selectedType,
      start_time: allDay ? undefined : (startTime || undefined),
      end_time: allDay ? undefined : (endTime || undefined),
      note: note || undefined,
    });
  };

  const handleDelete = () => {
    const doDelete = () => {
      onDelete?.();
      onClose();
    };
    // RN Web's Alert.alert does not invoke button onPress callbacks.
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Remover o turno deste dia?')) {
        doDelete();
      }
      return;
    }
    Alert.alert('Remover turno', 'Remover o turno deste dia?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: doDelete },
    ]);
  };

  const dateLabel = date ? formatDate(date, 'EEEE, d MMM yyyy') : '';
  const th = useTheme();
  const isLight = !th.isDark;
  const inputStyleLight = isLight ? { color: th.textPrimary, backgroundColor: th.bg, borderColor: th.borderStrong } : null;
  const placeholderLight = isLight ? th.textMuted : '#4B5563';

  const getTypeColor = (name: string) => {
    const st = shiftTypes.find((t) => t.name === name);
    return st?.color || '#3B82F6';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, isLight && { backgroundColor: th.surfaceAlt }]}>
          <View style={[styles.dragHandle, isLight && { backgroundColor: th.borderStrong }]} />

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerLabel, isLight && { color: th.textMuted }]}>Turno de</Text>
              <Text style={[styles.headerDate, isLight && { color: th.textPrimary }]} numberOfLines={1}>{dateLabel}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, isLight && { backgroundColor: 'rgba(15,23,42,0.06)' }]}>
              <Ionicons name="close" size={20} color={isLight ? th.textSecondary : '#9CA3AF'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {/* Type chip selector */}
            <Text style={[styles.fieldLabel, isLight && { color: th.textMuted }]}>Tipo de turno</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <View style={styles.chipRow}>
                {shiftTypes.map((st) => {
                  const active = selectedType === st.name;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      style={[
                        styles.chip,
                        isLight && { backgroundColor: 'rgba(15,23,42,0.04)', borderColor: th.borderStrong },
                        active && { backgroundColor: st.color, borderColor: st.color },
                      ]}
                      onPress={() => handleTypeSelect(st)}
                      activeOpacity={0.75}
                    >
                      {!active && (
                        <View style={[styles.chipDot, { backgroundColor: st.color }]} />
                      )}
                      <Text style={[styles.chipText, isLight && !active && { color: th.textSecondary }, active && { color: '#fff', fontWeight: '700' }]}>
                        {st.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {shiftTypes.length === 0 && (
                  <Text style={styles.noTypesHint}>Sem tipos configurados</Text>
                )}
              </View>
            </ScrollView>

            {selectedType ? (
              <View style={[styles.selectedBadge, { borderColor: getTypeColor(selectedType) + '44' }]}>
                <View style={[styles.selectedDot, { backgroundColor: getTypeColor(selectedType) }]} />
                <Text style={[styles.selectedName, isLight && { color: th.textPrimary }]}>{selectedType}</Text>
              </View>
            ) : null}

            {/* All-day toggle */}
            <View style={[styles.toggleRow, isLight && { borderColor: th.border }]}>
              <Ionicons name="time-outline" size={18} color={isLight ? th.textMuted : '#6B7280'} style={{ marginRight: 10 }} />
              <Text style={[styles.toggleLabel, isLight && { color: th.textPrimary }]}>Dia inteiro</Text>
              <Switch
                value={allDay}
                onValueChange={setAllDay}
                trackColor={{ false: '#374151', true: '#3B82F6' }}
                thumbColor="#fff"
              />
            </View>

            {/* Times */}
            {!allDay && (
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Início</Text>
                  <TextInput
                    style={[styles.input, inputStyleLight]}
                    placeholder="08:00"
                    placeholderTextColor={placeholderLight}
                    value={startTime}
                    onChangeText={setStartTime}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Fim</Text>
                  <TextInput
                    style={[styles.input, inputStyleLight]}
                    placeholder="16:00"
                    placeholderTextColor={placeholderLight}
                    value={endTime}
                    onChangeText={setEndTime}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
            )}

            {/* Note */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Nota</Text>
            <TextInput
              style={[styles.input, styles.noteInput, inputStyleLight]}
              placeholder="Adicionar nota..."
              placeholderTextColor={placeholderLight}
              value={note}
              onChangeText={setNote}
              multiline
            />

            {/* Location (UI only) */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Localização</Text>
            <TextInput
              style={[styles.input, inputStyleLight]}
              placeholder="Ex: Esquadra Norte..."
              placeholderTextColor={placeholderLight}
              value={location}
              onChangeText={setLocation}
            />

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveBtn, !selectedType && { opacity: 0.45 }]}
              onPress={handleSave}
              disabled={!selectedType}
            >
              <Text style={styles.saveBtnText}>Guardar</Text>
            </TouchableOpacity>

            {/* Delete */}
            {onDelete && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={15} color="#EF4444" />
                <Text style={styles.deleteBtnText}>Remover turno deste dia</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#0B1120',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(59,130,246,0.15)',
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#374151',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(30,41,59,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipScroll: {
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  noTypesHint: {
    fontSize: 12,
    color: '#4B5563',
    paddingVertical: 8,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 16,
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#050816',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#F1F5F9',
  },
  noteInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.18)',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
});
