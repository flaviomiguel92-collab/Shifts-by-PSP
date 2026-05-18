import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CalendarEvent } from '../../types';

interface EventFormModalProps {
  visible: boolean;
  date: string; // YYYY-MM-DD
  event?: CalendarEvent | null; // when set → edit mode
  onClose: () => void;
  onSave: (data: {
    title: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    note?: string;
  }) => Promise<void> | void;
}

export function EventFormModal({ visible, date, event, onClose, onSave }: EventFormModalProps) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(event?.title ?? '');
    setStartTime(event?.start_time ?? '');
    setEndTime(event?.end_time ?? '');
    setLocation(event?.location ?? '');
    setNote(event?.note ?? '');
    setSaving(false);
  }, [visible, event]);

  const canSave = title.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        start_time: startTime.trim() || undefined,
        end_time: endTime.trim() || undefined,
        location: location.trim() || undefined,
        note: note.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.cancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{event ? 'Editar evento' : 'Novo evento'}</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.save, !canSave && styles.saveDisabled]}>Guardar</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Aniversário, Tribunal, Consulta…</Text>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Field label="Título">
              <TextInput
                style={styles.input}
                placeholder="Ex: Tribunal"
                placeholderTextColor="#6B7280"
                value={title}
                onChangeText={setTitle}
              />
            </Field>
            <View style={styles.row}>
              <Field label="Início" flex>
                <TextInput
                  style={styles.input}
                  placeholder="14:00"
                  placeholderTextColor="#6B7280"
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </Field>
              <Field label="Fim" flex>
                <TextInput
                  style={styles.input}
                  placeholder="15:30"
                  placeholderTextColor="#6B7280"
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </Field>
            </View>
            <Field label="Local">
              <TextInput
                style={styles.input}
                placeholder="Opcional"
                placeholderTextColor="#6B7280"
                value={location}
                onChangeText={setLocation}
              />
            </Field>
            <Field label="Notas">
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Opcional"
                placeholderTextColor="#6B7280"
                value={note}
                onChangeText={setNote}
                multiline
              />
            </Field>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <View style={[styles.field, flex && { flex: 1 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  container: {
    backgroundColor: '#1F2937',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitle: { color: 'white', fontSize: 17, fontWeight: '700' },
  cancel: { color: '#94A3B8', fontSize: 15, fontWeight: '600' },
  save: { color: '#3B82F6', fontSize: 15, fontWeight: '800' },
  saveDisabled: { color: '#475569' },
  subtitle: { color: '#9CA3AF', fontSize: 13, marginBottom: 12 },
  field: { marginTop: 12 },
  fieldLabel: { color: '#9CA3AF', fontWeight: '600', marginBottom: 6, fontSize: 13 },
  input: {
    backgroundColor: 'transparent',
    color: 'white',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
});
