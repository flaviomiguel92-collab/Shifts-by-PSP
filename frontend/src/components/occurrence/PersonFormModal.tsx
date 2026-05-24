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
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { storage } from '../../utils/storage';
import {
  Occurrence,
  Person,
  DocumentType,
  PersonRole,
  DOCUMENT_TYPE_LABELS,
  PERSON_ROLE_LABELS,
} from '../../types/occurrence';
import { useTheme } from '../../theme/themes';

const MAX_IMAGE_WIDTH = 800;
const IMAGE_QUALITY = 0.6;

const DOC_TYPES: DocumentType[] = ['cartao_cidadao', 'passaporte', 'titulo_residencia', 'carta_conducao'];
const ROLES: PersonRole[] = ['suspeito', 'testemunha', 'lesado'];

interface Props {
  visible: boolean;
  occurrenceId: string;
  apiUrl: string;
  onClose: () => void;
  onPersonAdded: (updatedOccurrence: Occurrence) => void;
}

export function PersonFormModal({ visible, occurrenceId, apiUrl, onClose, onPersonAdded }: Props) {
  const th = useTheme();
  const isLight = !th.isDark;
  const inputLight = isLight ? { color: th.textPrimary, backgroundColor: th.bg, borderColor: th.borderStrong } : null;
  const placeholderLight = isLight ? th.textMuted : '#6B7280';
  const [role, setRole] = useState<PersonRole>('testemunha');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nif, setNif] = useState('');
  const [docType, setDocType] = useState<DocumentType>('cartao_cidadao');
  const [docNumber, setDocNumber] = useState('');
  const [docIssue, setDocIssue] = useState('');
  const [docExpiry, setDocExpiry] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setRole('testemunha');
    setName('');
    setAddress('');
    setPhone('');
    setEmail('');
    setNif('');
    setDocType('cartao_cidadao');
    setDocNumber('');
    setDocIssue('');
    setDocExpiry('');
    setNotes('');
    setPhotos([]);
  };

  const compressToBase64 = async (uri: string): Promise<string | null> => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: MAX_IMAGE_WIDTH } }],
        { compress: IMAGE_QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      return result.base64 ? `data:image/jpeg;base64,${result.base64}` : null;
    } catch {
      return null;
    }
  };

  const handleAddPhoto = async () => {
    try {
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        aspect: [3, 4],
      });
      if (!result.canceled && result.assets[0].uri) {
        const compressed = await compressToBase64(result.assets[0].uri);
        if (compressed) {
          setPhotos((prev) => [...prev, compressed]);
        } else {
          Alert.alert('Erro', 'Não foi possível processar a imagem');
        }
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível adicionar a foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return;
    }
    try {
      const token = await storage.getItem('session_token');
      const person: Partial<Person> = {
        role,
        full_name: name,
        address: address || undefined,
        phone: phone || undefined,
        email: email || undefined,
        tax_id: nif || undefined,
        document_type: docType,
        document_number: docNumber || undefined,
        document_issue_date: docIssue || undefined,
        document_expiry_date: docExpiry || undefined,
        notes: notes || undefined,
        photos: photos.length > 0 ? photos : undefined,
      };
      const response = await fetch(`${apiUrl}/api/occurrences/${occurrenceId}/persons`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(person),
      });
      if (response.ok) {
        const updated: Occurrence = await response.json();
        reset();
        onPersonAdded(updated);
        onClose();
      } else {
        Alert.alert('Erro', 'Não foi possível adicionar a pessoa');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível adicionar a pessoa');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.content, { maxHeight: '90%' }, isLight && { backgroundColor: th.surfaceAlt }]}>
          <View style={[styles.header, isLight && { borderBottomColor: th.border }]}>
            <Text style={[styles.title, isLight && { color: th.textPrimary }]}>Adicionar Pessoa</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={isLight ? th.textSecondary : '#9CA3AF'} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body}>
            <Text style={[styles.label, isLight && { color: th.textMuted }]}>Tipo *</Text>
            <View style={styles.roleButtons}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, isLight && role !== r && { backgroundColor: th.bg, borderColor: th.borderStrong }, role === r && styles.roleBtnActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleBtnText, isLight && role !== r && { color: th.textSecondary }, role === r && styles.roleBtnTextActive]}>
                    {PERSON_ROLE_LABELS[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, isLight && { color: th.textMuted }]}>Nome Completo *</Text>
            <TextInput
              style={[styles.input, inputLight]}
              value={name}
              onChangeText={setName}
              placeholder="Nome completo"
              placeholderTextColor={placeholderLight}
            />

            <Text style={[styles.label, isLight && { color: th.textMuted }]}>Documento de Identificação</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.docTypeButtons}>
                {DOC_TYPES.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.docTypeBtn, isLight && docType !== d && { backgroundColor: th.bg, borderColor: th.borderStrong }, docType === d && styles.docTypeBtnActive]}
                    onPress={() => setDocType(d)}
                  >
                    <Text style={[styles.docTypeBtnText, isLight && docType !== d && { color: th.textSecondary }, docType === d && styles.docTypeBtnTextActive]}>
                      {DOCUMENT_TYPE_LABELS[d]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.label, isLight && { color: th.textMuted }]}>Nº Documento</Text>
            <TextInput
              style={[styles.input, inputLight]}
              value={docNumber}
              onChangeText={setDocNumber}
              placeholder="Número do documento"
              placeholderTextColor={placeholderLight}
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={[styles.label, isLight && { color: th.textMuted }]}>Data Emissão</Text>
                <TextInput
                  style={[styles.input, inputLight]}
                  value={docIssue}
                  onChangeText={setDocIssue}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={placeholderLight}
                />
              </View>
              <View style={styles.half}>
                <Text style={[styles.label, isLight && { color: th.textMuted }]}>Data Validade</Text>
                <TextInput
                  style={[styles.input, inputLight]}
                  value={docExpiry}
                  onChangeText={setDocExpiry}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={placeholderLight}
                />
              </View>
            </View>

            <Text style={[styles.label, isLight && { color: th.textMuted }]}>NIF</Text>
            <TextInput
              style={[styles.input, inputLight]}
              value={nif}
              onChangeText={setNif}
              placeholder="Número de Identificação Fiscal"
              placeholderTextColor={placeholderLight}
              keyboardType="numeric"
            />

            <Text style={[styles.label, isLight && { color: th.textMuted }]}>Morada</Text>
            <TextInput
              style={[styles.input, inputLight]}
              value={address}
              onChangeText={setAddress}
              placeholder="Endereço completo"
              placeholderTextColor={placeholderLight}
            />

            <Text style={[styles.label, isLight && { color: th.textMuted }]}>Telemóvel</Text>
            <TextInput
              style={[styles.input, inputLight]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Contacto telefónico"
              placeholderTextColor={placeholderLight}
              keyboardType="phone-pad"
            />

            <Text style={[styles.label, isLight && { color: th.textMuted }]}>E-mail</Text>
            <TextInput
              style={[styles.input, inputLight]}
              value={email}
              onChangeText={setEmail}
              placeholder="Endereço de e-mail"
              placeholderTextColor={placeholderLight}
              keyboardType="email-address"
            />

            <Text style={[styles.label, isLight && { color: th.textMuted }]}>Notas</Text>
            <TextInput
              style={[styles.input, styles.textArea, inputLight]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Observações adicionais"
              placeholderTextColor={placeholderLight}
              multiline
            />

            <View style={styles.photoSection}>
              <View style={styles.sectionRow}>
                <Text style={[styles.label, isLight && { color: th.textMuted }]}>Fotos de Identificação</Text>
                <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPhoto} disabled={uploading}>
                  {uploading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
              {photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.photosRow}>
                    {photos.map((photo, i) => (
                      <Image key={i} source={{ uri: photo }} style={styles.photoThumb} />
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>Adicionar Pessoa</Text>
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
  textArea: { minHeight: 80 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  roleButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  roleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(148,163,184,0.18)',
  },
  roleBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  roleBtnText: { color: '#94A3B8', fontSize: 13, fontWeight: '500' },
  roleBtnTextActive: { color: '#FFFFFF' },
  docTypeButtons: { flexDirection: 'row', gap: 8 },
  docTypeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(148,163,184,0.18)',
  },
  docTypeBtnActive: { backgroundColor: '#1D4ED8', borderColor: '#3B82F6' },
  docTypeBtnText: { color: '#94A3B8', fontSize: 12 },
  docTypeBtnTextActive: { color: '#FFFFFF' },
  photoSection: { marginTop: 16 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addPhotoBtn: {
    backgroundColor: 'rgba(59,130,246,0.3)',
    borderRadius: 8,
    padding: 8,
  },
  photosRow: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
  photoThumb: { width: 60, height: 60, borderRadius: 8 },
  submitBtn: {
    backgroundColor: '#3B82F6',
    margin: 16,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
});
