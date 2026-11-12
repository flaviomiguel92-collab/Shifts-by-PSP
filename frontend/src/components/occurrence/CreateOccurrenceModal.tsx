import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '../../utils/storage';
import {
  Occurrence,
  getOccurrenceClassifications,
  saveOccurrenceClassifications,
  sortOccurrenceClassifications,
} from '../../types/occurrence';
import { useTheme } from '../../theme/themes';

interface Props {
  visible: boolean;
  apiUrl: string;
  onClose: () => void;
  onCreated: (occurrence: Occurrence) => void;
}

export function CreateOccurrenceModal({ visible, apiUrl, onClose, onCreated }: Props) {
  const th = useTheme();
  const isLight = !th.isDark;
  const inputLight = isLight ? { color: th.textPrimary, backgroundColor: th.bg, borderColor: th.borderStrong } : null;
  const placeholderLight = isLight ? th.textMuted : '#6B7280';
  const today = new Date();
  const [date, setDate] = useState(today.toISOString().slice(0, 10));
  const [time, setTime] = useState(today.toTimeString().slice(0, 5));
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [classification, setClassification] = useState('');
  const [savedClassifications, setSavedClassifications] = useState<string[]>([]);
  const [newClassification, setNewClassification] = useState('');

  useEffect(() => {
    let active = true;

    const loadClassifications = async () => {
      const list = await getOccurrenceClassifications();
      if (!active) return;
      setSavedClassifications(list);
    };

    loadClassifications();
    return () => {
      active = false;
    };
  }, []);

  const syncClassifications = async (items: string[]) => {
    const normalized = sortOccurrenceClassifications([...new Set(items.map((item) => item.trim()).filter(Boolean))]);
    setSavedClassifications(normalized);
    await saveOccurrenceClassifications(normalized);
  };

  const handleRenameClassification = (oldValue: string) => {
    Alert.prompt(
      'Renomear tipificação',
      'Escolha o nome da tipificação',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Guardar',
          onPress: async (newValue: string | undefined) => {
            const cleanValue = (newValue || '').trim();
            if (!cleanValue) {
              Alert.alert('Erro', 'O nome não pode ficar vazio.');
              return;
            }
            if (oldValue === cleanValue) {
              return;
            }
            const next = savedClassifications.map((item) => (item === oldValue ? cleanValue : item));
            await syncClassifications(next);
            if (classification === oldValue) {
              setClassification(cleanValue);
            }
          },
        },
      ],
      'plain-text',
      oldValue,
    );
  };

  const handleAddClassification = async () => {
    const value = newClassification.trim();
    if (!value) {
      Alert.alert('Erro', 'Escreve uma tipificação antes de adicionar.');
      return;
    }

    const exists = savedClassifications.some((item) => item.toLowerCase() === value.toLowerCase());
    if (exists) {
      setClassification(value);
      setNewClassification('');
      return;
    }

    const next = [...savedClassifications, value];
    await syncClassifications(next);
    setClassification(value);
    setNewClassification('');
  };

  const handleRemoveClassification = async (value: string) => {
    const next = savedClassifications.filter((item) => item !== value);
    await syncClassifications(next);
    if (classification === value) {
      setClassification('');
    }
  };

  const reset = () => {
    const now = new Date();
    setDate(now.toISOString().slice(0, 10));
    setTime(now.toTimeString().slice(0, 5));
    setLocation('');
    setDescription('');
    setClassification('');
    setNewClassification('');
  };

  const handleSubmit = async () => {
    if (!location || !description || !classification) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }
    try {
      const token = await storage.getItem('session_token');
      const response = await fetch(`${apiUrl}/api/occurrences`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, time, location, description, classification }),
      });
      if (response.ok) {
        const newOcc: Occurrence = await response.json();
        reset();
        onCreated(newOcc);
        onClose();
      } else {
        Alert.alert('Erro', 'Não foi possível criar a ocorrência');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível criar a ocorrência');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.content, isLight && { backgroundColor: th.surfaceAlt }]}>
          <View style={styles.header}>
            <Text style={[styles.title, isLight && { color: th.textPrimary }]}>Nova Ocorrência</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body}>
            <Text style={[styles.label, isLight && { color: th.textMuted }]}>Data *</Text>
            <TextInput
              style={[styles.input, inputLight]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={placeholderLight}
            />

            <Text style={[styles.label, isLight && { color: th.textMuted }]}>Hora</Text>
            <TextInput
              style={[styles.input, inputLight]}
              value={time}
              onChangeText={setTime}
              placeholder="HH:MM"
              placeholderTextColor={placeholderLight}
            />

            <Text style={[styles.label, isLight && { color: th.textMuted }]}>Local *</Text>
            <TextInput
              style={[styles.input, inputLight]}
              value={location}
              onChangeText={setLocation}
              placeholder="Endereço ou descrição do local"
              placeholderTextColor={placeholderLight}
            />

            <Text style={[styles.label, isLight && { color: th.textMuted }]}>Tipificação *</Text>
            <View style={styles.classificationManager}>
              <TextInput
                style={[styles.input, styles.classificationInput, inputLight]}
                value={newClassification}
                onChangeText={setNewClassification}
                placeholder="Adicionar tipificação"
                placeholderTextColor={placeholderLight}
              />
              <TouchableOpacity style={styles.addClassificationBtn} onPress={handleAddClassification}>
                <Text style={styles.addClassificationBtnText}>Adicionar</Text>
              </TouchableOpacity>
            </View>

            {savedClassifications.length > 0 ? (
              <View style={styles.classificationGrid}>
                {savedClassifications.map((c) => (
                  <View key={c} style={[styles.classificationChip, classification === c && styles.classificationChipActive]}>
                    <TouchableOpacity onPress={() => setClassification(c)} style={styles.classificationChipLabel}>
                      <Text style={[styles.classificationChipText, classification === c && styles.classificationChipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRenameClassification(c)} style={styles.classificationAction} hitSlop={8}>
                      <Ionicons name="pencil" size={14} color={classification === c ? '#E2E8F0' : '#94A3B8'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRemoveClassification(c)} style={styles.classificationAction} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={classification === c ? '#E2E8F0' : '#94A3B8'} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, isLight && { color: th.textMuted }]}>Sem tipificações guardadas. Adicione a primeira e ela ficará disponível para reutilizar.</Text>
            )}

            <Text style={[styles.label, isLight && { color: th.textMuted }]}>Descrição *</Text>
            <TextInput
              style={[styles.input, styles.textArea, inputLight]}
              value={description}
              onChangeText={setDescription}
              placeholder="Descreva a ocorrência..."
              placeholderTextColor={placeholderLight}
              multiline
              numberOfLines={4}
            />
          </ScrollView>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>Criar Ocorrência</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  content: {
    backgroundColor: '#0B1120',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(59,130,246,0.15)',
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.18)',
  },
  title: { fontSize: 18, fontWeight: '500', color: '#F1F5F9' },
  body: { padding: 20, maxHeight: 400 },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: '#475569',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 14,
    color: '#F1F5F9',
    fontSize: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(148,163,184,0.22)',
  },
  textArea: { minHeight: 100 },
  classificationManager: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  classificationInput: { flex: 1 },
  addClassificationBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  addClassificationBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  classificationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  classificationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(148,163,184,0.18)',
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
  },
  classificationChipActive: { backgroundColor: '#1D4ED8', borderColor: '#3B82F6' },
  classificationChipLabel: { paddingRight: 6 },
  classificationChipText: { color: '#E2E8F0', fontSize: 12 },
  classificationChipTextActive: { color: '#FFFFFF' },
  classificationAction: { justifyContent: 'center', alignItems: 'center', marginLeft: 2 },
  emptyText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: '#3B82F6',
    margin: 16,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
});
