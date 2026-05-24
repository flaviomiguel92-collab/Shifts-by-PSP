import React, { useState } from 'react';
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
import { ShiftTypeConfig } from '../../types';
import { useTheme } from '../../theme/themes';

const PRESET_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#64748B',
];

type PickerView = 'list' | 'selected' | 'create' | 'edit';

interface FormData {
  name: string;
  color: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  isWorking: boolean;
}

const DEFAULT_FORM: FormData = {
  name: '',
  color: PRESET_COLORS[0],
  startTime: '',
  endTime: '',
  allDay: false,
  isWorking: true,
};

interface ShiftTypePickerProps {
  visible: boolean;
  onClose: () => void;
  shiftTypes: ShiftTypeConfig[];
  hasExistingShift: boolean;
  onApply: (name: string) => void;
  onDeleteShift?: () => void;
  onCreateType: (data: { name: string; color: string; start_time?: string; end_time?: string; is_working: boolean }) => void;
  onCreateAndApply: (data: { name: string; color: string; start_time?: string; end_time?: string; is_working: boolean }) => void;
  onUpdateType: (id: string, data: { name: string; color: string; start_time?: string | null; end_time?: string | null; is_working: boolean }) => void;
}

export function ShiftTypePicker({
  visible,
  onClose,
  shiftTypes,
  hasExistingShift,
  onApply,
  onDeleteShift,
  onCreateType,
  onCreateAndApply,
  onUpdateType,
}: ShiftTypePickerProps) {
  const th = useTheme();
  const isLight = !th.isDark;
  const inputLight = isLight ? { color: th.textPrimary, backgroundColor: th.bg, borderColor: th.borderStrong } : null;
  const placeholderLight = isLight ? th.textMuted : '#4B5563';
  const [pickerView, setPickerView] = useState<PickerView>('list');
  const [selectedType, setSelectedType] = useState<ShiftTypeConfig | null>(null);
  const [form, setForm] = useState<FormData>({ ...DEFAULT_FORM });

  const resetAll = () => {
    setPickerView('list');
    setSelectedType(null);
    setForm({ ...DEFAULT_FORM });
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    color: form.color,
    start_time: form.allDay ? null : (form.startTime || undefined),
    end_time: form.allDay ? null : (form.endTime || undefined),
    is_working: form.isWorking,
  });

  const handleSaveOnly = () => {
    if (!form.name.trim()) return;
    onCreateType(buildPayload() as { name: string; color: string; start_time?: string; end_time?: string; is_working: boolean });
    resetAll();
    onClose();
  };

  const handleSaveAndApply = () => {
    if (!form.name.trim()) return;
    onCreateAndApply(buildPayload() as { name: string; color: string; start_time?: string; end_time?: string; is_working: boolean });
    resetAll();
    onClose();
  };

  const handleSaveEdit = () => {
    if (!selectedType || !form.name.trim()) return;
    onUpdateType(selectedType.id, buildPayload());
    resetAll();
    onClose();
  };

  const openEdit = (st: ShiftTypeConfig) => {
    setForm({
      name: st.name,
      color: st.color,
      startTime: st.start_time || st.startTime || '',
      endTime: st.end_time || st.endTime || '',
      allDay: !st.start_time && !st.startTime,
      isWorking: st.is_working !== false,
    });
    setSelectedType(st);
    setPickerView('edit');
  };

  const handleDeleteFromDay = () => {
    const doDelete = () => {
      onDeleteShift?.();
      resetAll();
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

  const getTitle = () => {
    if (pickerView === 'create') return 'Novo tipo de turno';
    if (pickerView === 'edit') return 'Editar tipo de turno';
    if (pickerView === 'selected' && selectedType) return selectedType.name;
    return 'Escolher turno';
  };

  const goBack = () => {
    if (pickerView === 'edit') {
      setPickerView('selected');
      setForm({ ...DEFAULT_FORM });
    } else if (pickerView === 'selected') {
      setSelectedType(null);
      setPickerView('list');
    } else if (pickerView === 'create') {
      setPickerView('list');
      setForm({ ...DEFAULT_FORM });
    }
  };

  const showBack = pickerView !== 'list';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, isLight && { backgroundColor: th.surfaceAlt }]}>
          <View style={[styles.dragHandle, isLight && { backgroundColor: th.borderStrong }]} />

          <View style={[styles.sheetHeader, isLight && { borderBottomColor: th.border }]}>
            {showBack && (
              <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={18} color="#60A5FA" />
              </TouchableOpacity>
            )}
            {pickerView === 'selected' && selectedType && (
              <View style={[styles.typeColorDot, { backgroundColor: selectedType.color }]} />
            )}
            <Text style={[styles.sheetTitle, isLight && { color: th.textPrimary }]}>{getTitle()}</Text>
            <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, isLight && { backgroundColor: 'rgba(15,23,42,0.06)' }]}>
              <Ionicons name="close" size={20} color={isLight ? th.textSecondary : '#9CA3AF'} />
            </TouchableOpacity>
          </View>

          {/* ──────────── LIST ──────────── */}
          {pickerView === 'list' && (
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {shiftTypes.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={32} color={isLight ? th.textMuted : '#374151'} />
                  <Text style={[styles.emptyStateText, isLight && { color: th.textMuted }]}>Sem tipos de turno configurados</Text>
                </View>
              )}

              <View style={styles.typeList}>
                {shiftTypes.map((st) => (
                  <TouchableOpacity
                    key={st.id}
                    style={[styles.typeItem, isLight && { backgroundColor: th.bg, borderColor: th.borderStrong }]}
                    onPress={() => {
                      setSelectedType(st);
                      setPickerView('selected');
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.typeDot, { backgroundColor: st.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.typeName, isLight && { color: th.textPrimary }]}>{st.name}</Text>
                      {(st.start_time || st.startTime) ? (
                        <Text style={[styles.typeTime, isLight && { color: th.textMuted }]}>
                          {st.start_time || st.startTime}
                          {(st.end_time || st.endTime) ? ` – ${st.end_time || st.endTime}` : ''}
                        </Text>
                      ) : (
                        <Text style={[styles.typeTime, isLight && { color: th.textMuted }]}>Dia inteiro</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={isLight ? th.textMuted : '#374151'} />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.addTypeBtn} onPress={() => setPickerView('create')}>
                <Ionicons name="add-circle-outline" size={16} color="#60A5FA" />
                <Text style={styles.addTypeBtnText}>Novo tipo de turno</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ──────────── SELECTED ──────────── */}
          {pickerView === 'selected' && selectedType && (
            <View style={styles.actionGroup}>
              {(selectedType.start_time || selectedType.startTime) && (
                <Text style={[styles.selectedTimeHint, isLight && { color: th.textMuted }]}>
                  {selectedType.start_time || selectedType.startTime} – {selectedType.end_time || selectedType.endTime}
                </Text>
              )}

              <TouchableOpacity
                style={[styles.actionRow, isLight && { backgroundColor: th.bg, borderColor: th.borderStrong }]}
                onPress={() => {
                  onApply(selectedType.name);
                  resetAll();
                  onClose();
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#60A5FA" />
                </View>
                <Text style={[styles.actionText, isLight && { color: th.textPrimary }]}>Aplicar a este dia</Text>
                <Ionicons name="chevron-forward" size={16} color={isLight ? th.textMuted : '#374151'} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionRow, isLight && { backgroundColor: th.bg, borderColor: th.borderStrong }]}
                onPress={() => openEdit(selectedType)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                  <Ionicons name="pencil-outline" size={20} color="#A78BFA" />
                </View>
                <Text style={[styles.actionText, isLight && { color: th.textPrimary }]}>Editar tipo de turno</Text>
                <Ionicons name="chevron-forward" size={16} color={isLight ? th.textMuted : '#374151'} />
              </TouchableOpacity>

              {hasExistingShift && onDeleteShift && (
                <TouchableOpacity
                  style={[styles.actionRow, styles.actionRowDanger]}
                  onPress={handleDeleteFromDay}
                  activeOpacity={0.75}
                >
                  <View style={[styles.actionIcon, { backgroundColor: 'rgba(239,68,68,0.10)' }]}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </View>
                  <Text style={[styles.actionText, { color: '#EF4444' }]}>Remover turno deste dia</Text>
                  <Ionicons name="chevron-forward" size={16} color={isLight ? th.textMuted : '#374151'} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ──────────── CREATE / EDIT FORM ──────────── */}
          {(pickerView === 'create' || pickerView === 'edit') && (
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              <Text style={[styles.fieldLabel, isLight && { color: th.textMuted }]}>Nome</Text>
              <TextInput
                style={[styles.input, inputLight]}
                placeholder="Ex: Manhã, Tarde, Folga..."
                placeholderTextColor={placeholderLight}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                autoFocus={pickerView === 'create'}
              />

              <Text style={[styles.fieldLabel, isLight && { color: th.textMuted }, { marginTop: 16 }]}>Cor</Text>
              <View style={styles.colorRow}>
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c }, form.color === c && styles.colorDotSelected]}
                    onPress={() => setForm((f) => ({ ...f, color: c }))}
                    activeOpacity={0.8}
                  />
                ))}
              </View>

              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, isLight && { color: th.textPrimary }]}>Dia inteiro (sem horário)</Text>
                <Switch
                  value={form.allDay}
                  onValueChange={(v) => setForm((f) => ({ ...f, allDay: v }))}
                  trackColor={{ false: isLight ? th.borderStrong : '#374151', true: '#3B82F6' }}
                  thumbColor="#fff"
                />
              </View>

              {!form.allDay && (
                <View style={styles.timeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, isLight && { color: th.textMuted }]}>Início</Text>
                    <TextInput
                      style={[styles.input, inputLight]}
                      placeholder="08:00"
                      placeholderTextColor={placeholderLight}
                      value={form.startTime}
                      onChangeText={(v) => setForm((f) => ({ ...f, startTime: v }))}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, isLight && { color: th.textMuted }]}>Fim</Text>
                    <TextInput
                      style={[styles.input, inputLight]}
                      placeholder="16:00"
                      placeholderTextColor={placeholderLight}
                      value={form.endTime}
                      onChangeText={(v) => setForm((f) => ({ ...f, endTime: v }))}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              )}

              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, isLight && { color: th.textPrimary }]}>Conta como dia de trabalho</Text>
                <Switch
                  value={form.isWorking}
                  onValueChange={(v) => setForm((f) => ({ ...f, isWorking: v }))}
                  trackColor={{ false: isLight ? th.borderStrong : '#374151', true: '#3B82F6' }}
                  thumbColor="#fff"
                />
              </View>

              {pickerView === 'create' ? (
                <>
                  <TouchableOpacity
                    style={[styles.savePrimaryBtn, !form.name.trim() && { opacity: 0.45 }]}
                    onPress={handleSaveAndApply}
                    disabled={!form.name.trim()}
                  >
                    <Text style={styles.savePrimaryText}>Guardar e aplicar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveSecondaryBtn, !form.name.trim() && { opacity: 0.45 }]}
                    onPress={handleSaveOnly}
                    disabled={!form.name.trim()}
                  >
                    <Text style={[styles.saveSecondaryText, isLight && { color: th.textSecondary }]}>Guardar apenas</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.savePrimaryBtn, !form.name.trim() && { opacity: 0.45 }]}
                  onPress={handleSaveEdit}
                  disabled={!form.name.trim()}
                >
                  <Text style={styles.savePrimaryText}>Guardar alterações</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
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
    borderWidth: 0.5,
    borderBottomWidth: 0,
    borderColor: 'rgba(59,130,246,0.15)',
    maxHeight: '80%',
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
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.18)',
    gap: 6,
  },
  backBtn: {
    marginRight: 2,
  },
  typeColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#F1F5F9',
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
    paddingTop: 14,
  },
  typeList: {
    gap: 6,
    marginBottom: 12,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: 'rgba(148,163,184,0.18)',
    borderWidth: 0.5,
    borderColor: 'rgba(148,163,184,0.22)',
  },
  typeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  typeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F1F5F9',
  },
  typeTime: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#4B5563',
  },
  addTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(59,130,246,0.25)',
    backgroundColor: 'rgba(59,130,246,0.07)',
  },
  addTypeBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#60A5FA',
  },
  // Selected state
  actionGroup: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 8,
  },
  selectedTimeHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(148,163,184,0.18)',
    borderWidth: 0.5,
    borderColor: 'rgba(148,163,184,0.22)',
  },
  actionRowDanger: {
    borderColor: 'rgba(239,68,68,0.18)',
    backgroundColor: 'rgba(239,68,68,0.04)',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#E2E8F0',
  },
  // Form
  fieldLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#050816',
    borderWidth: 0.5,
    borderColor: 'rgba(148,163,184,0.26)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#F1F5F9',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: '#fff',
    shadowColor: '#fff',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  timeRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#D1D5DB',
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  savePrimaryBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  savePrimaryText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  saveSecondaryBtn: {
    backgroundColor: 'rgba(148,163,184,0.18)',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(148,163,184,0.26)',
  },
  saveSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
});
