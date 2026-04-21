import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '../store/dataStore';

type CycleDraft = {
  name: string;
  pattern: string[];
};

interface CycleModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CycleModal: React.FC<CycleModalProps> = ({ visible, onClose }) => {
  const { shiftTypes, createCycle } = useDataStore();

  const [name, setName] = useState('');
  const [pattern, setPattern] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    setName('');
    setPattern([]);
  }, [visible]);

  const canSave = useMemo(() => name.trim().length > 0 && pattern.length > 0, [name, pattern]);

  const appendToPattern = (shiftName: string) => {
    setPattern((prev) => [...prev, shiftName]);
  };

  const removeLast = () => {
    setPattern((prev) => prev.slice(0, -1));
  };

  const clearAll = () => setPattern([]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Erro', 'Dá um nome ao ciclo.');
      return;
    }
    if (!pattern.length) {
      Alert.alert('Erro', 'Adiciona pelo menos 1 turno ao padrão.');
      return;
    }

    await createCycle({ name: trimmed, pattern });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Novo Ciclo</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Nome</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Ciclo 8 dias"
            placeholderTextColor="#6B7280"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.sectionTitle}>Padrão</Text>
          <View style={styles.patternRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.patternChips}>
                {pattern.length === 0 ? (
                  <Text style={styles.emptyHint}>Ainda sem turnos no padrão</Text>
                ) : (
                  pattern.map((p, idx) => (
                    <View key={`${p}-${idx}`} style={styles.chip}>
                      <Text style={styles.chipText}>{p}</Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>

          <View style={styles.patternActions}>
            <TouchableOpacity style={styles.smallBtn} onPress={removeLast} disabled={pattern.length === 0}>
              <Text style={[styles.smallBtnText, pattern.length === 0 && styles.disabledText]}>Remover último</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallBtn} onPress={clearAll} disabled={pattern.length === 0}>
              <Text style={[styles.smallBtnText, pattern.length === 0 && styles.disabledText]}>Limpar</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Adicionar turnos ao padrão</Text>
          <ScrollView style={{ maxHeight: 220 }}>
            <View style={styles.typeGrid}>
              {shiftTypes.map((shift) => (
                <TouchableOpacity
                  key={shift.id}
                  style={[styles.typeButton, { borderColor: shift.color || '#374151' }]}
                  onPress={() => appendToPattern(shift.name)}
                >
                  <Text style={[styles.typeButtonText, { color: shift.color || '#9CA3AF' }]}>{shift.name}</Text>
                </TouchableOpacity>
              ))}
              {shiftTypes.length === 0 && (
                <Text style={styles.emptyHint}>
                  Primeiro cria pelo menos 1 tipo de turno (no modal de criar/editar turno).
                </Text>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={styles.saveText}>Guardar Ciclo</Text>
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
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#9CA3AF',
    marginTop: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#111827',
    color: 'white',
    padding: 10,
    borderRadius: 8,
  },
  patternRow: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  patternChips: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#374151',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  patternActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  smallBtnText: {
    color: '#D1D5DB',
    fontWeight: '600',
    fontSize: 12,
  },
  disabledText: {
    color: '#6B7280',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#111827',
  },
  typeButtonText: {
    fontWeight: '700',
  },
  emptyHint: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 6,
  },
  saveBtn: {
    marginTop: 16,
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
