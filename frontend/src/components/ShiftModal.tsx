import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../utils/helpers';
import { useDataStore } from '../store/dataStore';

interface ShiftModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (shift: { shift_type: string; start_time?: string; end_time?: string; note?: string }) => void;
  onDelete?: () => void;
  date: string;
  existingShift?: {
    shift_type: string;
    start_time?: string;
    end_time?: string;
    note?: string;
  } | null;
}

const PRESET_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

export const ShiftModal: React.FC<ShiftModalProps> = ({
  visible, onClose, onSave, onDelete, date, existingShift,
}) => {
  const { shiftTypes, createShiftType } = useDataStore() as any;

  const [selectedType, setSelectedType] = useState('');
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftColor, setNewShiftColor] = useState('#3B82F6');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [note, setNote] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [startFocused, setStartFocused] = useState(false);
  const [endFocused, setEndFocused] = useState(false);

  useEffect(() => {
    if (existingShift) {
      setSelectedType(existingShift.shift_type);
      setStartTime(existingShift.start_time || '');
      setEndTime(existingShift.end_time || '');
      setNote(existingShift.note || '');
    } else {
      setSelectedType('');
      setStartTime('');
      setEndTime('');
      setNote('');
    }
    setNewShiftName('');
    setNewShiftColor('#3B82F6');
  }, [existingShift, visible]);

  const handleSave = async () => {
    let finalType = selectedType;
    if (newShiftName.trim()) {
      await createShiftType({ name: newShiftName.trim(), color: newShiftColor, startTime, endTime });
      finalType = newShiftName.trim();
    }
    if (!finalType) {
      Alert.alert('Aviso', 'Por favor, seleciona ou cria um tipo de turno');
      return;
    }
    onSave({
      shift_type: finalType,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      note: note || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{existingShift ? 'Editar Turno' : 'Novo Turno'}</Text>
              {!!date && (
                <Text style={styles.dateText}>{formatDate(date, 'EEEE, d MMMM yyyy')}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Existing types */}
            {shiftTypes.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>TURNOS EXISTENTES</Text>
                <View style={styles.typeGrid}>
                  {shiftTypes.map((shift: any) => {
                    const isSelected = selectedType === shift.name;
                    return (
                      <TouchableOpacity
                        key={shift.id}
                        style={[
                          styles.typeChip,
                          isSelected && { backgroundColor: shift.color || '#3B82F6', borderColor: 'transparent' },
                        ]}
                        onPress={() => {
                          setSelectedType(shift.name);
                          setStartTime(shift.start_time || shift.startTime || '');
                          setEndTime(shift.end_time || shift.endTime || '');
                          setNewShiftName('');
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.typeChipDot, { backgroundColor: shift.color || '#3B82F6' }, isSelected && { backgroundColor: 'rgba(255,255,255,0.5)' }]} />
                        <Text style={[styles.typeChipText, isSelected && styles.typeChipTextSelected]}>
                          {shift.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Create new */}
            <Text style={styles.sectionLabel}>CRIAR NOVO TURNO</Text>
            <View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
              <Ionicons name="add-circle-outline" size={16} color={nameFocused ? '#60A5FA' : '#475569'} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="Nome do turno"
                placeholderTextColor="#334155"
                value={newShiftName}
                onChangeText={(text) => { setNewShiftName(text); if (text) setSelectedType(''); }}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>

            {/* Color picker */}
            <View style={styles.colorRow}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setNewShiftColor(color)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    newShiftColor === color && styles.colorSwatchSelected,
                  ]}
                  activeOpacity={0.8}
                >
                  {newShiftColor === color && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Time */}
            <Text style={styles.sectionLabel}>HORÁRIO</Text>
            <View style={styles.timeRow}>
              <View style={[styles.inputWrap, { flex: 1 }, startFocused && styles.inputWrapFocused]}>
                <Ionicons name="time-outline" size={15} color={startFocused ? '#60A5FA' : '#475569'} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="08:00"
                  placeholderTextColor="#334155"
                  onFocus={() => setStartFocused(true)}
                  onBlur={() => setStartFocused(false)}
                />
              </View>
              <View style={styles.timeSeparator}>
                <Text style={styles.timeSepText}>–</Text>
              </View>
              <View style={[styles.inputWrap, { flex: 1 }, endFocused && styles.inputWrapFocused]}>
                <Ionicons name="time-outline" size={15} color={endFocused ? '#60A5FA' : '#475569'} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="16:00"
                  placeholderTextColor="#334155"
                  onFocus={() => setEndFocused(true)}
                  onBlur={() => setEndFocused(false)}
                />
              </View>
            </View>

            {/* Note */}
            <Text style={styles.sectionLabel}>NOTA</Text>
            <View style={[styles.inputWrap, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
              <TextInput
                style={[styles.input, { flex: 1, textAlignVertical: 'top' }]}
                value={note}
                onChangeText={setNote}
                placeholder="Opcional..."
                placeholderTextColor="#334155"
                multiline
              />
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            {onDelete && (
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtnGradient}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Guardar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  sheet: {
    backgroundColor: '#0B1120',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  title: { color: '#F1F5F9', fontSize: 18, fontWeight: '800' },
  dateText: { color: '#475569', fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 0,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  typeChipDot: { width: 8, height: 8, borderRadius: 4 },
  typeChipText: { color: '#94A3B8', fontSize: 13, fontWeight: '500' },
  typeChipTextSelected: { color: '#fff', fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 8, 22, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 0,
  },
  inputWrapFocused: {
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  input: {
    flex: 1,
    color: '#F1F5F9',
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  timeSeparator: {
    width: 32,
    alignItems: 'center',
  },
  timeSepText: { color: '#475569', fontSize: 18, fontWeight: '300' },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
