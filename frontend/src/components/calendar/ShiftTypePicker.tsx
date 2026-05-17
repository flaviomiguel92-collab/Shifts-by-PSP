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

interface ShiftTypePickerProps {
  visible: boolean;
  onClose: () => void;
  shiftTypes: ShiftTypeConfig[];
  hasExistingShift: boolean;
  onSelectType: (name: string) => void;
  onDeleteShift?: () => void;
  onCreateType: (data: {
    name: string;
    color: string;
    start_time?: string;
    end_time?: string;
    is_working: boolean;
  }) => void;
  onCreateAndApply: (data: {
    name: string;
    color: string;
    start_time?: string;
    end_time?: string;
    is_working: boolean;
  }) => void;
}

export function ShiftTypePicker({
  visible,
  onClose,
  shiftTypes,
  hasExistingShift,
  onSelectType,
  onDeleteShift,
  onCreateType,
  onCreateAndApply,
}: ShiftTypePickerProps) {
  const [pickerView, setPickerView] = useState<'list' | 'create'>('list');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isWorking, setIsWorking] = useState(true);

  const resetForm = () => {
    setNewName('');
    setNewColor(PRESET_COLORS[0]);
    setStartTime('');
    setEndTime('');
    setIsWorking(true);
    setPickerView('list');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const buildFormData = () => ({
    name: newName.trim(),
    color: newColor,
    start_time: startTime || undefined,
    end_time: endTime || undefined,
    is_working: isWorking,
  });

  const handleSaveOnly = () => {
    if (!newName.trim()) return;
    onCreateType(buildFormData());
    resetForm();
    onClose();
  };

  const handleSaveAndApply = () => {
    if (!newName.trim()) return;
    onCreateAndApply(buildFormData());
    resetForm();
    onClose();
  };

  const handleDeletePress = () => {
    Alert.alert('Remover turno', 'Remover o turno deste dia?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: onDeleteShift },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          <View style={styles.sheetHeader}>
            {pickerView === 'create' && (
              <TouchableOpacity
                onPress={() => setPickerView('list')}
                style={styles.backBtn}
              >
                <Ionicons name="chevron-back" size={18} color="#60A5FA" />
              </TouchableOpacity>
            )}
            <Text style={styles.sheetTitle}>
              {pickerView === 'list' ? 'Escolher turno' : 'Novo tipo de turno'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {pickerView === 'list' ? (
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {shiftTypes.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={32} color="#374151" />
                  <Text style={styles.emptyStateText}>
                    Sem tipos de turno configurados
                  </Text>
                </View>
              )}

              <View style={styles.typeList}>
                {shiftTypes.map((st) => (
                  <TouchableOpacity
                    key={st.id}
                    style={styles.typeItem}
                    onPress={() => onSelectType(st.name)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[styles.typeDot, { backgroundColor: st.color }]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.typeName}>{st.name}</Text>
                      {(st.start_time || st.startTime) && (
                        <Text style={styles.typeTime}>
                          {st.start_time || st.startTime}
                          {(st.end_time || st.endTime)
                            ? ` – ${st.end_time || st.endTime}`
                            : ''}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={15} color="#374151" />
                  </TouchableOpacity>
                ))}
              </View>

              {hasExistingShift && onDeleteShift && (
                <TouchableOpacity
                  style={styles.deleteShiftBtn}
                  onPress={handleDeletePress}
                >
                  <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  <Text style={styles.deleteShiftText}>
                    Remover turno deste dia
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.addTypeBtn}
                onPress={() => setPickerView('create')}
              >
                <Ionicons name="add-circle-outline" size={16} color="#60A5FA" />
                <Text style={styles.addTypeBtnText}>Novo tipo de turno</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              <Text style={styles.fieldLabel}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Manhã, Tarde, Folga..."
                placeholderTextColor="#4B5563"
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Cor</Text>
              <View style={styles.colorRow}>
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      newColor === c && styles.colorDotSelected,
                    ]}
                    onPress={() => setNewColor(c)}
                    activeOpacity={0.8}
                  />
                ))}
              </View>

              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Início</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="08:00"
                    placeholderTextColor="#4B5563"
                    value={startTime}
                    onChangeText={setStartTime}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Fim</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="16:00"
                    placeholderTextColor="#4B5563"
                    value={endTime}
                    onChangeText={setEndTime}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Conta como dia de trabalho</Text>
                <Switch
                  value={isWorking}
                  onValueChange={setIsWorking}
                  trackColor={{ false: '#374151', true: '#3B82F6' }}
                  thumbColor="#fff"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.savePrimaryBtn,
                  !newName.trim() && { opacity: 0.45 },
                ]}
                onPress={handleSaveAndApply}
                disabled={!newName.trim()}
              >
                <Text style={styles.savePrimaryText}>Guardar e aplicar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveSecondaryBtn,
                  !newName.trim() && { opacity: 0.45 },
                ]}
                onPress={handleSaveOnly}
                disabled={!newName.trim()}
              >
                <Text style={styles.saveSecondaryText}>Guardar apenas</Text>
              </TouchableOpacity>
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
    borderWidth: 1,
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
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    marginRight: 6,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
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
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  typeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  typeName: {
    fontSize: 14,
    fontWeight: '600',
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
  deleteShiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.18)',
    marginBottom: 10,
  },
  deleteShiftText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  addTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    backgroundColor: 'rgba(59,130,246,0.07)',
  },
  addTypeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#60A5FA',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
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
    borderWidth: 2,
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
    marginTop: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 24,
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
    marginBottom: 10,
  },
  savePrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  saveSecondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  saveSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
