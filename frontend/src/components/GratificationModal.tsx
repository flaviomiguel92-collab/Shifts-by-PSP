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
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GratificationType, GRATIFICATION_LABELS, GRATIFICATION_COLORS, Gratification } from '../types';
import { formatDate, dateToString } from '../utils/helpers';

interface GratificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (grat: { date: string; gratification_type: GratificationType; value: number; note?: string }) => void;
  onDelete?: () => void;
  existingGratification?: Gratification | null;
  initialDate?: string;
}

export const GratificationModal: React.FC<GratificationModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  existingGratification,
  initialDate,
}) => {
  const [selectedType, setSelectedType] = useState<GratificationType>('hora_extra');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(initialDate || dateToString(new Date()));

  useEffect(() => {
    if (existingGratification) {
      setSelectedType(existingGratification.gratification_type as GratificationType);
      setValue(existingGratification.value.toString());
      setNote(existingGratification.note || '');
      setDate(existingGratification.date);
    } else {
      setSelectedType('hora_extra');
      setValue('');
      setNote('');
      setDate(initialDate || dateToString(new Date()));
    }
  }, [existingGratification, visible, initialDate]);

  const handleSave = () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      return;
    }
    onSave({
      date,
      gratification_type: selectedType,
      value: numValue,
      note: note || undefined,
    });
  };

  const gratTypes: GratificationType[] = ['hora_extra', 'gratificacao', 'premio'];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {existingGratification ? 'Editar Extra' : 'Novo Extra'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Data</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#6B7280"
            />

            <Text style={styles.sectionTitle}>Tipo</Text>
            <View style={styles.typeGrid}>
              {gratTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    selectedType === type && {
                      backgroundColor: GRATIFICATION_COLORS[type],
                      borderColor: GRATIFICATION_COLORS[type],
                    },
                  ]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      selectedType === type && styles.typeButtonTextSelected,
                    ]}
                  >
                    {GRATIFICATION_LABELS[type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Valor (EUR)</Text>
            <View style={styles.valueContainer}>
              <Text style={styles.currencySymbol}>€</Text>
              <TextInput
                style={[styles.input, styles.valueInput]}
                value={value}
                onChangeText={setValue}
                placeholder="0.00"
                placeholderTextColor="#6B7280"
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.sectionTitle}>Nota (opcional)</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              value={note}
              onChangeText={setNote}
              placeholder="Adicionar nota..."
              placeholderTextColor="#6B7280"
              multiline
            />
          </ScrollView>

          <View style={styles.actions}>
            {existingGratification && onDelete && (
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text style={styles.deleteText}>Eliminar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.saveBtn, (!value || parseFloat(value) <= 0) && styles.saveBtnDisabled]} 
              onPress={handleSave}
              disabled={!value || parseFloat(value) <= 0}
            >
              <Text style={styles.saveText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
    marginTop: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  typeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#374151',
    backgroundColor: '#111827',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  typeButtonTextSelected: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginRight: 12,
  },
  valueInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 8,
  },
  deleteText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#374151',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
