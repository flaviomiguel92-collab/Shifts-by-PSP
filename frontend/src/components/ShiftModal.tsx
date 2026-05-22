import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../utils/helpers';
import { useDataStore } from '../store/dataStore';
import { useTheme } from '../theme/themes';

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
  const th = useTheme();
  const isLight = !th.isDark;
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

  // ── Theme tokens ────────────────────────────────────────────────────────────
  const sheetBg    = isLight ? '#FFFFFF'                      : '#0B1120';
  const sheetBd    = isLight ? '#E8EBF0'                      : 'rgba(59,130,246,0.15)';
  const sheetBdW   = isLight ? 0.5                            : 1;
  const headerBd   = isLight ? '#E8EBF0'                      : 'rgba(148,163,184,0.18)';
  const handleBg   = isLight ? '#CBD5E1'                      : 'rgba(255,255,255,0.1)';
  const titleC     = isLight ? '#1E293B'                      : '#F1F5F9';
  const dateC      = isLight ? '#64748B'                      : '#475569';
  const closeBg    = isLight ? 'rgba(15,23,42,0.06)'          : 'rgba(148,163,184,0.18)';
  const closeC     = isLight ? '#64748B'                      : '#94A3B8';
  const labelC     = isLight ? '#6B5BD9'                      : '#334155';
  const chipBg     = isLight ? '#F8FAFC'                      : 'rgba(148,163,184,0.10)';
  const chipBd     = isLight ? '#E8EBF0'                      : 'rgba(148,163,184,0.26)';
  const chipTextC  = isLight ? '#334155'                      : '#94A3B8';
  const inputBg    = isLight ? '#F8FAFC'                      : 'rgba(5,8,22,0.6)';
  const inputBd    = isLight ? '#E2E8F0'                      : 'rgba(148,163,184,0.22)';
  const inputFocBd = isLight ? '#6B5BD9'                      : 'rgba(59,130,246,0.4)';
  const inputC     = isLight ? '#1E293B'                      : '#F1F5F9';
  const phC        = isLight ? '#94A3B8'                      : '#334155';
  const iconC      = (focused: boolean) =>
    isLight ? (focused ? '#6B5BD9' : '#94A3B8') : (focused ? '#60A5FA' : '#475569');
  const sepC       = isLight ? '#94A3B8'                      : '#475569';
  const actionsBd  = isLight ? '#E8EBF0'                      : 'rgba(148,163,184,0.18)';
  const saveColors = isLight
    ? (['#4A3FA8', '#6B5BD9'] as const)
    : (['#3B82F6', '#1D4ED8'] as const);
  const saveShadow = isLight ? 'rgba(107,91,217,0.35)'        : '#3B82F6';

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: sheetBg, borderColor: sheetBd, borderTopWidth: sheetBdW, borderLeftWidth: sheetBdW, borderRightWidth: sheetBdW }]}>

          <View style={[styles.handle, { backgroundColor: handleBg }]} />

          <View style={[styles.header, { borderBottomColor: headerBd, borderBottomWidth: isLight ? 0.5 : 1 }]}>
            <View>
              <Text style={[styles.title, { color: titleC }]}>{existingShift ? 'Editar turno' : 'Novo turno'}</Text>
              {!!date && (
                <Text style={[styles.dateText, { color: dateC }]}>{formatDate(date, 'EEEE, d MMMM yyyy')}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: closeBg }]}>
              <Ionicons name="close" size={18} color={closeC} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

            {/* Existing types */}
            {shiftTypes.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: labelC }]}>TURNOS EXISTENTES</Text>
                <View style={styles.typeGrid}>
                  {shiftTypes.map((shift: any) => {
                    const isSelected = selectedType === shift.name;
                    return (
                      <TouchableOpacity
                        key={shift.id}
                        style={[
                          styles.typeChip,
                          { backgroundColor: chipBg, borderColor: chipBd },
                          isSelected && { backgroundColor: shift.color || '#6B5BD9', borderColor: 'transparent' },
                        ]}
                        onPress={() => {
                          setSelectedType(shift.name);
                          setStartTime(shift.start_time || shift.startTime || '');
                          setEndTime(shift.end_time || shift.endTime || '');
                          setNewShiftName('');
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={[
                          styles.typeChipDot,
                          { backgroundColor: shift.color || '#6B5BD9' },
                          isSelected && { backgroundColor: 'rgba(255,255,255,0.5)' },
                        ]} />
                        <Text style={[styles.typeChipText, { color: chipTextC }, isSelected && styles.typeChipTextSelected]}>
                          {shift.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Create new */}
            <Text style={[styles.sectionLabel, { color: labelC }]}>CRIAR NOVO TURNO</Text>
            <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: nameFocused ? inputFocBd : inputBd }]}>
              <Ionicons name="add-circle-outline" size={16} color={iconC(nameFocused)} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.input, { color: inputC }]}
                placeholder="Nome do turno"
                placeholderTextColor={phC}
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
                  style={[styles.colorSwatch, { backgroundColor: color }, newShiftColor === color && styles.colorSwatchSelected]}
                  activeOpacity={0.8}
                >
                  {newShiftColor === color && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Time */}
            <Text style={[styles.sectionLabel, { color: labelC }]}>HORÁRIO</Text>
            <View style={styles.timeRow}>
              <View style={[styles.inputWrap, { flex: 1, backgroundColor: inputBg, borderColor: startFocused ? inputFocBd : inputBd }]}>
                <Ionicons name="time-outline" size={15} color={iconC(startFocused)} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { color: inputC }]}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="08:00"
                  placeholderTextColor={phC}
                  onFocus={() => setStartFocused(true)}
                  onBlur={() => setStartFocused(false)}
                />
              </View>
              <View style={styles.timeSeparator}>
                <Text style={[styles.timeSepText, { color: sepC }]}>–</Text>
              </View>
              <View style={[styles.inputWrap, { flex: 1, backgroundColor: inputBg, borderColor: endFocused ? inputFocBd : inputBd }]}>
                <Ionicons name="time-outline" size={15} color={iconC(endFocused)} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { color: inputC }]}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="16:00"
                  placeholderTextColor={phC}
                  onFocus={() => setEndFocused(true)}
                  onBlur={() => setEndFocused(false)}
                />
              </View>
            </View>

            {/* Note */}
            <Text style={[styles.sectionLabel, { color: labelC }]}>NOTA</Text>
            <View style={[styles.inputWrap, { height: 80, alignItems: 'flex-start', paddingTop: 12, backgroundColor: inputBg, borderColor: inputBd }]}>
              <TextInput
                style={[styles.input, { color: inputC, flex: 1, textAlignVertical: 'top' }]}
                value={note}
                onChangeText={setNote}
                placeholder="Opcional..."
                placeholderTextColor={phC}
                multiline
              />
            </View>

          </ScrollView>

          {/* Actions */}
          <View style={[styles.actions, { borderTopColor: actionsBd, borderTopWidth: isLight ? 0.5 : 1 }]}>
            {onDelete && (
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.saveBtn, { shadowColor: saveShadow }]} onPress={handleSave} activeOpacity={0.85}>
              <LinearGradient
                colors={saveColors}
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
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    elevation: 24,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '500' },
  dateText: { fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  sectionLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 1.2, marginBottom: 10, marginTop: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1,
  },
  typeChipDot: { width: 8, height: 8, borderRadius: 4 },
  typeChipText: { fontSize: 13, fontWeight: '500' },
  typeChipTextSelected: { color: '#fff' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, height: 48,
  },
  input: { flex: 1, fontSize: 14, backgroundColor: 'transparent' },
  colorRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 4, flexWrap: 'wrap' },
  colorSwatch: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  colorSwatchSelected: { borderWidth: 2, borderColor: '#fff' },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeSeparator: { width: 32, alignItems: 'center' },
  timeSepText: { fontSize: 18, fontWeight: '400' },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 14 },
  deleteBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtn: {
    flex: 1, borderRadius: 14, overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  saveBtnGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 14,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});
