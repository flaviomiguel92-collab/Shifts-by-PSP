import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../utils/helpers';
import { useDataStore } from '../store/dataStore';

interface ShiftModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (shift: { shift_type: string; start_time?: string; end_time?: string; excess_hours?: number; note?: string }) => void;
  onDelete?: () => void;
  date: string;
  existingShift?: {
    shift_type: string;
    start_time?: string;
    end_time?: string;
    excess_hours?: number;
    note?: string;
  } | null;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  date,
  existingShift,
}) => {
  const { shiftTypes, createShiftType } = useDataStore();

  const [selectedType, setSelectedType] = useState<string>('');
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftColor, setNewShiftColor] = useState('#3B82F6');

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [excessHours, setExcessHours] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (existingShift) {
      setSelectedType(existingShift.shift_type);
      setStartTime(existingShift.start_time || '');
      setEndTime(existingShift.end_time || '');
      setExcessHours(existingShift.excess_hours?.toString() || '');
      setNote(existingShift.note || '');
    } else {
      setSelectedType('');
      setStartTime('');
      setEndTime('');
      setExcessHours('');
      setNote('');
    }
  }, [existingShift, visible]);

  const handleSave = () => {
    let finalType = selectedType;

    // Se criou novo turno
    if (newShiftName) {
      createShiftType({
        name: newShiftName,
        color: newShiftColor,
        startTime,
        endTime,
      });

      finalType = newShiftName;
    }

    const excessHoursNum = excessHours ? parseFloat(excessHours) : undefined;

    onSave({
      shift_type: finalType,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      excess_hours: excessHoursNum,
      note: note || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {existingShift ? 'Editar Turno' : 'Novo Turno'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.dateText}>
            {date ? formatDate(date, 'EEEE, d MMMM yyyy') : ''}
          </Text>

          <ScrollView>
            {/* EXISTENTES */}
            <Text style={styles.sectionTitle}>Turnos existentes</Text>

            <View style={styles.typeGrid}>
              {shiftTypes.map((shift) => (
                <TouchableOpacity
                  key={shift.id}
                  style={[
                    styles.typeButton,
                    selectedType === shift.name && {
                      backgroundColor: shift.color || '#3B82F6',
                      borderColor: shift.color || '#3B82F6',
                    },
                  ]}
                  onPress={() => {
                    setSelectedType(shift.name);
                    setStartTime(shift.startTime || '');
                    setEndTime(shift.endTime || '');
                  }}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      selectedType === shift.name && styles.typeButtonTextSelected,
                    ]}
                  >
                    {shift.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* CRIAR NOVO */}
            <Text style={styles.sectionTitle}>Criar novo turno</Text>

            <TextInput
              style={styles.input}
              placeholder="Nome do turno"
              placeholderTextColor="#6B7280"
              value={newShiftName}
              onChangeText={setNewShiftName}
            />

            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'].map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setNewShiftColor(color)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: color,
                    marginRight: 10,
                    borderWidth: newShiftColor === color ? 3 : 0,
                    borderColor: 'white',
                  }}
                />
              ))}
            </View>

            {/* HORÁRIO */}
            <Text style={styles.sectionTitle}>Horário</Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={styles.input}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="08:00"
                placeholderTextColor="#6B7280"
              />
              <TextInput
                style={styles.input}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="16:00"
                placeholderTextColor="#6B7280"
              />
            </View>

            {/* NOTA */}
            <Text style={styles.sectionTitle}>Nota</Text>

            <TextInput
              style={[styles.input, { height: 80 }]}
              value={note}
              onChangeText={setNote}
              placeholder="Opcional"
              placeholderTextColor="#6B7280"
              multiline
            />
          </ScrollView>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  container: {
    backgroundColor: '#1F2937',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    color: 'white',
    fontSize: 18,
  },
  dateText: {
    color: '#9CA3AF',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#9CA3AF',
    marginTop: 10,
    marginBottom: 5,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  typeButtonText: {
    color: '#9CA3AF',
  },
  typeButtonTextSelected: {
    color: '#FFF',
  },
  input: {
    backgroundColor: '#111827',
    color: 'white',
    padding: 10,
    borderRadius: 8,
    flex: 1,
  },
  saveBtn: {
    marginTop: 15,
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveText: {
    color: 'white',
    fontWeight: 'bold',
  },
});