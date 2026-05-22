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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore, Cycle } from '../store/dataStore';
import { COLORS } from '../theme/colors';

interface CycleModalProps {
  visible: boolean;
  onClose: () => void;
  editingCycle?: Cycle | null;
}

export const CycleModal: React.FC<CycleModalProps> = ({ visible, onClose, editingCycle }) => {
  const { shiftTypes, createCycle, updateCycle, deleteCycle } = useDataStore();
  const isEditing = !!editingCycle;

  const [name, setName] = useState('');
  const [pattern, setPattern] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    if (editingCycle) {
      setName(editingCycle.name ?? '');
      setPattern(editingCycle.pattern ?? []);
    } else {
      setName('');
      setPattern([]);
    }
  }, [visible, editingCycle]);

  const canSave = useMemo(() => name.trim().length > 0 && pattern.length > 0, [name, pattern]);

  const appendToPattern = (shiftName: string) => setPattern((prev) => [...prev, shiftName]);
  const removeLast = () => setPattern((prev) => prev.slice(0, -1));
  const clearAll = () => setPattern([]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) { Alert.alert('Erro', 'Dá um nome ao ciclo.'); return; }
    if (!pattern.length) { Alert.alert('Erro', 'Adiciona pelo menos 1 turno ao padrão.'); return; }

    try {
      if (isEditing && editingCycle) {
        await updateCycle(editingCycle.id, { name: trimmed, pattern });
      } else {
        await createCycle({ name: trimmed, pattern });
      }
      onClose();
    } catch {
      Alert.alert('Erro', 'Não foi possível guardar o ciclo. Verifica a ligação e tenta de novo.');
    }
  };

  const handleDelete = () => {
    if (!editingCycle) return;
    const doDelete = async () => {
      await deleteCycle(editingCycle.id);
      onClose();
    };
    // RN Web's Alert.alert does not invoke button onPress callbacks.
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Tens a certeza que queres apagar "${editingCycle.name}"?`)) {
        doDelete();
      }
      return;
    }
    Alert.alert(
      'Apagar ciclo',
      `Tens a certeza que queres apagar "${editingCycle.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar', style: 'destructive', onPress: doDelete },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{isEditing ? 'Editar Ciclo' : 'Novo Ciclo'}</Text>
            <View style={styles.headerActions}>
              {isEditing && (
                <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
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
            <Text style={styles.saveText}>{isEditing ? 'Guardar alterações' : 'Guardar Ciclo'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  container: {
    backgroundColor: COLORS.backgroundSecondary,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteBtn: { padding: 4 },
  title: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '500' },
  sectionTitle: { color: COLORS.textTertiary, marginTop: 12, marginBottom: 6, fontWeight: '500' },
  input: { backgroundColor: COLORS.background, color: COLORS.textPrimary, padding: 10, borderRadius: 8 },
  patternRow: { backgroundColor: COLORS.background, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10 },
  patternChips: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.backgroundTertiary },
  chipText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '500' },
  patternActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: COLORS.background },
  smallBtnText: { color: COLORS.textSecondary, fontWeight: '500', fontSize: 12 },
  disabledText: { color: COLORS.textMuted },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeButton: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 0.5, backgroundColor: COLORS.background },
  typeButtonText: { fontWeight: '500' },
  emptyHint: { color: COLORS.textMuted, fontSize: 12, marginTop: 6 },
  saveBtn: { marginTop: 16, backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { color: COLORS.textPrimary, fontWeight: 'bold' },
});
