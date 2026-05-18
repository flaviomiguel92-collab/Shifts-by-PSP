import React, { useState } from 'react';
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
import { Occurrence, OCCURRENCE_CLASSIFICATIONS } from '../../types/occurrence';

interface Props {
  visible: boolean;
  apiUrl: string;
  onClose: () => void;
  onCreated: (occurrence: Occurrence) => void;
}

export function CreateOccurrenceModal({ visible, apiUrl, onClose, onCreated }: Props) {
  const today = new Date();
  const [date, setDate] = useState(today.toISOString().slice(0, 10));
  const [time, setTime] = useState(today.toTimeString().slice(0, 5));
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [classification, setClassification] = useState('');

  const reset = () => {
    const now = new Date();
    setDate(now.toISOString().slice(0, 10));
    setTime(now.toTimeString().slice(0, 5));
    setLocation('');
    setDescription('');
    setClassification('');
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
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Nova Ocorrência</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body}>
            <Text style={styles.label}>Data *</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#6B7280"
            />

            <Text style={styles.label}>Hora</Text>
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="HH:MM"
              placeholderTextColor="#6B7280"
            />

            <Text style={styles.label}>Local *</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Endereço ou descrição do local"
              placeholderTextColor="#6B7280"
            />

            <Text style={styles.label}>Tipificação *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.classificationGrid}>
                {OCCURRENCE_CLASSIFICATIONS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.classificationBtn, classification === c && styles.classificationBtnActive]}
                    onPress={() => setClassification(c)}
                  >
                    <Text style={[styles.classificationBtnText, classification === c && styles.classificationBtnTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.label}>Descrição *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Descreva a ocorrência..."
              placeholderTextColor="#6B7280"
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
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#F1F5F9' },
  body: { padding: 20, maxHeight: 400 },
  label: {
    fontSize: 10,
    fontWeight: '700',
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  textArea: { minHeight: 100 },
  classificationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  classificationBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  classificationBtnActive: { backgroundColor: '#1D4ED8', borderColor: '#3B82F6' },
  classificationBtnText: { color: '#94A3B8', fontSize: 13 },
  classificationBtnTextActive: { color: '#FFFFFF' },
  submitBtn: {
    backgroundColor: '#3B82F6',
    margin: 16,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
