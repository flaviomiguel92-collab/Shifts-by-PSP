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
import { calcGratifiedValue } from '../utils/gratifiedCalc';

interface GratifiedModalProps {
  visible: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
  isHolidayOrWeekend: boolean;
}

export const GratifiedModal: React.FC<GratifiedModalProps> = ({
  visible,
  onClose,
  date,
  isHolidayOrWeekend,
}) => {
  const {
    gratifiedConfig,
    gratifiedTemplates,
    createGratifiedEntry,
    upsertGratifiedTemplate,
  } = useDataStore();

  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (!visible) return;
    setName('');
    setStartTime('');
    setEndTime('');
  }, [visible]);

  const calc = useMemo(() => {
    if (!startTime || !endTime) return null;
    return calcGratifiedValue({
      date,
      startTime,
      endTime,
      isHolidayOrWeekend,
      config: gratifiedConfig,
    });
  }, [date, startTime, endTime, isHolidayOrWeekend, gratifiedConfig]);

  const canSave = useMemo(() => {
    return (name || '').trim().length > 0 && !!calc;
  }, [name, calc]);

  const handleSave = async () => {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      Alert.alert('Erro', 'Escolhe ou escreve um nome para o gratificado.');
      return;
    }
    if (!startTime || !endTime || !calc) {
      Alert.alert('Erro', 'Preenche a hora de início e fim.');
      return;
    }

    await createGratifiedEntry({
      date,
      name: trimmed,
      start_time: startTime,
      end_time: endTime,
      value: calc.total,
      subtotal: calc.subtotal,
      discount_percent: calc.discountPercent,
      is_holiday_or_weekend: isHolidayOrWeekend,
      lines: calc.lines,
      created_at: new Date().toISOString(),
    });

    await upsertGratifiedTemplate({ name: trimmed });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Adicionar Gratificado</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <Text style={styles.sectionTitle}>Nome</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Gratificado Operação X"
              placeholderTextColor="#6B7280"
              value={name}
              onChangeText={setName}
            />

            {gratifiedTemplates?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Escolher da lista</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.templateRow}>
                    {gratifiedTemplates.map((t) => (
                      <TouchableOpacity
                        key={t.name}
                        style={[
                          styles.templateChip,
                          name === t.name && styles.templateChipActive,
                        ]}
                        onPress={() => setName(t.name)}
                      >
                        <Text
                          style={[
                            styles.templateChipText,
                            name === t.name && styles.templateChipTextActive,
                          ]}
                        >
                          {t.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <Text style={styles.sectionTitle}>Hora</Text>
            <View style={styles.row}>
              <TextInput
                style={styles.input}
                placeholder="Início (HH:MM)"
                placeholderTextColor="#6B7280"
                value={startTime}
                onChangeText={setStartTime}
              />
              <TextInput
                style={styles.input}
                placeholder="Fim (HH:MM)"
                placeholderTextColor="#6B7280"
                value={endTime}
                onChangeText={setEndTime}
              />
            </View>

            <Text style={styles.sectionTitle}>Valor</Text>
            <View style={styles.valueCard}>
              <Text style={styles.valueBig}>
                {calc ? `${calc.total.toFixed(2)} €` : '—'}
              </Text>
              {calc && (
                <>
                  <Text style={styles.valueMeta}>
                    Subtotal: {calc.subtotal.toFixed(2)} € | Desconto: {calc.discountPercent}%
                  </Text>
                  <View style={styles.breakdown}>
                    {calc.lines.map((l, idx) => (
                      <View key={idx} style={styles.breakLine}>
                        <Text style={styles.breakText}>
                          {l.kind === 'base' ? 'Gratificado' : 'Fração'} {l.gratifiedKind} ({l.start}–{l.end})
                        </Text>
                        <Text style={styles.breakValue}>{l.value.toFixed(2)} €</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
              {!calc && (
                <Text style={styles.valueHint}>Preenche início e fim para calcular automaticamente.</Text>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    padding: 12,
    borderRadius: 10,
    flex: 1,
    borderWidth: 1,
    borderColor: '#374151',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  templateRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  templateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
  },
  templateChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  templateChipText: {
    color: '#9CA3AF',
    fontWeight: '700',
    fontSize: 12,
  },
  templateChipTextActive: {
    color: '#FFFFFF',
  },
  valueCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  valueBig: {
    color: '#10B981',
    fontSize: 28,
    fontWeight: '800',
  },
  valueMeta: {
    color: '#9CA3AF',
    marginTop: 6,
    fontSize: 12,
  },
  valueHint: {
    color: '#6B7280',
    marginTop: 8,
    fontSize: 12,
  },
  breakdown: {
    marginTop: 10,
    gap: 8,
  },
  breakLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  breakText: {
    color: '#D1D5DB',
    fontSize: 12,
    flex: 1,
  },
  breakValue: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  saveBtn: {
    marginTop: 12,
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});

