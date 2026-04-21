import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { storage } from '../../src/utils/storage';
import { formatDate } from '../../src/utils/helpers';
import { HeaderWithBack } from '../../src/components/HeaderWithBack';
import {
  Occurrence,
  Person,
  OCCURRENCE_CLASSIFICATIONS,
  OCCURRENCE_STATUS_LABELS,
  OCCURRENCE_STATUS_COLORS,
  DOCUMENT_TYPE_LABELS,
  DocumentType,
  PERSON_ROLE_LABELS,
  PersonRole,
} from '../../src/types/occurrence';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const MAX_IMAGE_WIDTH = 800;  // Max width for compressed images
const IMAGE_QUALITY = 0.6;    // Compression quality (0-1)

export default function OcorrenciasScreen() {
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  
  // Form states
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formClassification, setFormClassification] = useState('');
  
  // Person form states
  const [personRole, setPersonRole] = useState<PersonRole>('testemunha');
  const [personName, setPersonName] = useState('');
  const [personAddress, setPersonAddress] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personEmail, setPersonEmail] = useState('');
  const [personNIF, setPersonNIF] = useState('');
  const [personDocType, setPersonDocType] = useState<DocumentType>('cartao_cidadao');
  const [personDocNumber, setPersonDocNumber] = useState('');
  const [personDocIssue, setPersonDocIssue] = useState('');
  const [personDocExpiry, setPersonDocExpiry] = useState('');
  const [personNotes, setPersonNotes] = useState('');
  const [personPhotos, setPersonPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fetchOccurrences = async () => {
    try {
      const token = await storage.getItem('session_token');
      const response = await fetch(`${API_URL}/api/occurrences`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setOccurrences(data);
      }
    } catch (error) {
      console.error('Fetch occurrences error:', error);
    }
  };

  useEffect(() => {
    fetchOccurrences();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOccurrences();
    setRefreshing(false);
  };

  const resetForm = () => {
    const today = new Date();
    setFormDate(today.toISOString().slice(0, 10));
    setFormTime(today.toTimeString().slice(0, 5));
    setFormLocation('');
    setFormDescription('');
    setFormClassification('');
  };

  const resetPersonForm = () => {
    setPersonRole('testemunha');
    setPersonName('');
    setPersonAddress('');
    setPersonPhone('');
    setPersonEmail('');
    setPersonNIF('');
    setPersonDocType('cartao_cidadao');
    setPersonDocNumber('');
    setPersonDocIssue('');
    setPersonDocExpiry('');
    setPersonNotes('');
    setPersonPhotos([]);
  };

  const handleCreate = async () => {
    if (!formLocation || !formDescription || !formClassification) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const token = await storage.getItem('session_token');
      const response = await fetch(`${API_URL}/api/occurrences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formDate,
          time: formTime,
          location: formLocation,
          description: formDescription,
          classification: formClassification,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        const newOcc = await response.json();
        setShowCreateModal(false);
        resetForm();
        fetchOccurrences();
        setSelectedOccurrence(newOcc);
        setLocalPhotos([]);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Create occurrence error:', error);
      Alert.alert('Erro', 'Não foi possível criar a ocorrência');
    }
  };

  const handleAddPerson = async () => {
    if (!personName || !selectedOccurrence) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return;
    }

    try {
      const token = await storage.getItem('session_token');
      const response = await fetch(`${API_URL}/api/occurrences/${selectedOccurrence.id}/persons`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: personRole,
          full_name: personName,
          address: personAddress || undefined,
          phone: personPhone || undefined,
          email: personEmail || undefined,
          tax_id: personNIF || undefined,
          document_type: personDocType,
          document_number: personDocNumber || undefined,
          document_issue_date: personDocIssue || undefined,
          document_expiry_date: personDocExpiry || undefined,
          notes: personNotes || undefined,
          photos: personPhotos.length > 0 ? personPhotos : undefined,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        const updated = await response.json();
        setSelectedOccurrence(updated);
        setShowPersonModal(false);
        resetPersonForm();
        fetchOccurrences();
      }
    } catch (error) {
      console.error('Add person error:', error);
      Alert.alert('Erro', 'Não foi possível adicionar a pessoa');
    }
  };

  // Compress image using ImageManipulator and convert to smaller base64
  const compressAndConvertToBase64 = async (uri: string): Promise<string | null> => {
    try {
      // Resize and compress the image
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: MAX_IMAGE_WIDTH } }],
        { 
          compress: IMAGE_QUALITY, 
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true 
        }
      );

      if (manipulatedImage.base64) {
        return `data:image/jpeg;base64,${manipulatedImage.base64}`;
      }
      return null;
    } catch (error) {
      console.error('Image compression error:', error);
      return null;
    }
  };

  const handleAddPhoto = async () => {
    try {
      setIsUploadingPhoto(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1, // Full quality - we'll compress it ourselves
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0].uri) {
        // Compress the image
        const compressedBase64 = await compressAndConvertToBase64(result.assets[0].uri);
        
        if (compressedBase64) {
          // Check size (base64 is ~33% larger than binary, so 1MB base64 ≈ 750KB binary)
          const sizeInKB = (compressedBase64.length * 0.75) / 1024;
          console.log(`Compressed image size: ${sizeInKB.toFixed(0)}KB`);
          
          if (sizeInKB > 500) {
            // Still too large, warn user
            Alert.alert(
              'Imagem Grande',
              `A imagem tem ${sizeInKB.toFixed(0)}KB. Pode demorar mais a processar.`
            );
          }
          
          setLocalPhotos(prev => [...prev, compressedBase64]);
          Alert.alert('Sucesso', 'Foto adicionada!');
        } else {
          Alert.alert('Erro', 'Não foi possível processar a imagem');
        }
      }
    } catch (error) {
      console.error('Add photo error:', error);
      Alert.alert('Erro', 'Não foi possível adicionar a foto');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleAddPersonPhoto = async () => {
    try {
      setIsUploadingPhoto(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets[0].uri) {
        // Compress the image
        const compressedBase64 = await compressAndConvertToBase64(result.assets[0].uri);
        
        if (compressedBase64) {
          setPersonPhotos(prev => [...prev, compressedBase64]);
        } else {
          Alert.alert('Erro', 'Não foi possível processar a imagem');
        }
      }
    } catch (error) {
      console.error('Add person photo error:', error);
      Alert.alert('Erro', 'Não foi possível adicionar a foto');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedOccurrence) return;

    try {
      const token = await storage.getItem('session_token');
      const response = await fetch(`${API_URL}/api/occurrences/${selectedOccurrence.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include',
      });

      if (response.ok) {
        const updated = await response.json();
        setSelectedOccurrence(updated);
        fetchOccurrences();
      }
    } catch (error) {
      console.error('Update status error:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedOccurrence) return;

    Alert.alert(
      'Eliminar Ocorrência',
      'Tem a certeza que deseja eliminar esta ocorrência?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await storage.getItem('session_token');
              await fetch(`${API_URL}/api/occurrences/${selectedOccurrence.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
                credentials: 'include',
              });
              setShowDetailModal(false);
              setSelectedOccurrence(null);
              setLocalPhotos([]);
              fetchOccurrences();
            } catch (error) {
              console.error('Delete error:', error);
            }
          },
        },
      ]
    );
  };

  // Generate PDF
  const generatePDF = async () => {
    if (!selectedOccurrence) return;

    const occ = selectedOccurrence;
    const allPersons = getAllPersons(occ);
    const allPhotos = [...(occ.photos || []), ...localPhotos];

    const personsHtml = allPersons.map(person => `
      <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
        <div style="background: ${person.role === 'suspeito' ? '#EF4444' : person.role === 'testemunha' ? '#3B82F6' : '#F59E0B'}; color: white; padding: 4px 10px; border-radius: 4px; display: inline-block; font-size: 12px; margin-bottom: 10px;">
          ${person.roleLabel}
        </div>
        <h4 style="margin: 5px 0;">${person.full_name}</h4>
        ${person.document_number ? `<p><strong>Documento:</strong> ${DOCUMENT_TYPE_LABELS[person.document_type as DocumentType]} - ${person.document_number}</p>` : ''}
        ${person.document_issue_date ? `<p><strong>Emissão:</strong> ${person.document_issue_date} | <strong>Validade:</strong> ${person.document_expiry_date || 'N/A'}</p>` : ''}
        ${person.tax_id ? `<p><strong>NIF:</strong> ${person.tax_id}</p>` : ''}
        ${person.address ? `<p><strong>Morada:</strong> ${person.address}</p>` : ''}
        ${person.phone ? `<p><strong>Telefone:</strong> ${person.phone}</p>` : ''}
        ${person.email ? `<p><strong>Email:</strong> ${person.email}</p>` : ''}
        ${person.notes ? `<p><strong>Notas:</strong> ${person.notes}</p>` : ''}
        ${person.photos && person.photos.length > 0 ? `
          <div style="margin-top: 10px;">
            <strong>Fotografias de Identificação:</strong><br/>
            ${person.photos.map(p => `<img src="${p}" style="width: 150px; margin: 5px; border: 1px solid #ccc;" />`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');

    const photosHtml = allPhotos.length > 0 ? `
      <h3>Fotografias da Ocorrência</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        ${allPhotos.map(p => `<img src="${p}" style="width: 200px; margin: 5px; border: 1px solid #ccc; border-radius: 8px;" />`).join('')}
      </div>
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; border-bottom: 3px solid #3B82F6; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { color: #3B82F6; margin: 0; }
          .header p { color: #666; margin: 5px 0; }
          .status { display: inline-block; padding: 6px 12px; border-radius: 4px; color: white; font-weight: bold; }
          .section { margin: 20px 0; }
          .section h3 { color: #3B82F6; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
          .info-row { display: flex; margin: 8px 0; }
          .info-label { font-weight: bold; min-width: 120px; }
          .description { background: #f5f5f5; padding: 15px; border-radius: 8px; white-space: pre-wrap; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BOLETIM DE OCORRÊNCIA</h1>
          <p>Documento gerado em ${new Date().toLocaleString('pt-PT')}</p>
          <div class="status" style="background: ${OCCURRENCE_STATUS_COLORS[occ.status]}">
            ${OCCURRENCE_STATUS_LABELS[occ.status]}
          </div>
        </div>

        <div class="section">
          <h3>Informação da Ocorrência</h3>
          <div class="info-row"><span class="info-label">Data:</span> ${formatDate(occ.date)} ${occ.time || ''}</div>
          <div class="info-row"><span class="info-label">Local:</span> ${occ.location}</div>
          <div class="info-row"><span class="info-label">Tipificação:</span> ${occ.classification}</div>
          <div class="info-row"><span class="info-label">ID:</span> ${occ.id}</div>
        </div>

        <div class="section">
          <h3>Descrição</h3>
          <div class="description">${occ.description}</div>
        </div>

        ${allPersons.length > 0 ? `
          <div class="section">
            <h3>Pessoas Envolvidas (${allPersons.length})</h3>
            ${personsHtml}
          </div>
        ` : ''}

        ${photosHtml}

        <div class="footer">
          <p>Este documento foi gerado pela aplicação ShiftExtra</p>
          <p>Para fins de registo e consulta</p>
        </div>
      </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      
      if (Platform.OS === 'web') {
        // On web, open in new tab
        const pdfWindow = window.open('');
        if (pdfWindow) {
          pdfWindow.document.write(`
            <html>
              <head><title>Boletim ${occ.classification}</title></head>
              <body style="margin:0;padding:0;">
                <iframe src="${uri}" style="width:100%;height:100vh;border:none;"></iframe>
              </body>
            </html>
          `);
        }
      } else {
        // On mobile, share
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert('PDF Gerado', `Ficheiro guardado em: ${uri}`);
        }
      }
    } catch (error) {
      console.error('Generate PDF error:', error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF');
    }
  };

  const openOccurrence = (occ: Occurrence) => {
    setSelectedOccurrence(occ);
    setLocalPhotos(occ.photos || []);
    setShowDetailModal(true);
  };

  const getAllPersons = (occ: Occurrence): (Person & { roleLabel: string })[] => {
    const persons: (Person & { roleLabel: string })[] = [];
    (occ.suspects || []).forEach(p => persons.push({ ...p, roleLabel: 'Suspeito' }));
    (occ.witnesses || []).forEach(p => persons.push({ ...p, roleLabel: 'Testemunha' }));
    (occ.victims || []).forEach(p => persons.push({ ...p, roleLabel: 'Lesado' }));
    return persons;
  };

  const docTypes: DocumentType[] = ['cartao_cidadao', 'passaporte', 'titulo_residencia', 'carta_conducao'];
  const roles: PersonRole[] = ['suspeito', 'testemunha', 'lesado'];

  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithBack title="Ocorrências" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ocorrências</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {occurrences.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={50} color="#374151" />
            <Text style={styles.emptyText}>Sem ocorrências registadas</Text>
            <Text style={styles.emptySubtext}>Toca no + para criar uma nova</Text>
          </View>
        ) : (
          occurrences.map((occ) => (
            <TouchableOpacity
              key={occ.id}
              style={styles.occCard}
              onPress={() => openOccurrence(occ)}
            >
              <View style={styles.occHeader}>
                <View style={[styles.statusBadge, { backgroundColor: OCCURRENCE_STATUS_COLORS[occ.status] }]}>
                  <Text style={styles.statusText}>{OCCURRENCE_STATUS_LABELS[occ.status]}</Text>
                </View>
                <Text style={styles.occDate}>{formatDate(occ.date)}</Text>
              </View>
              <Text style={styles.occClassification}>{occ.classification}</Text>
              <Text style={styles.occLocation} numberOfLines={1}>
                <Ionicons name="location" size={12} color="#6B7280" /> {occ.location}
              </Text>
              <Text style={styles.occDescription} numberOfLines={2}>{occ.description}</Text>
              <View style={styles.occFooter}>
                <View style={styles.occStat}>
                  <Ionicons name="people" size={14} color="#6B7280" />
                  <Text style={styles.occStatText}>
                    {(occ.suspects?.length || 0) + (occ.witnesses?.length || 0) + (occ.victims?.length || 0)} pessoas
                  </Text>
                </View>
                <View style={styles.occStat}>
                  <Ionicons name="camera" size={14} color="#6B7280" />
                  <Text style={styles.occStatText}>{occ.photos?.length || 0} fotos</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Ocorrência</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Data *</Text>
              <TextInput
                style={styles.input}
                value={formDate}
                onChangeText={setFormDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#6B7280"
              />
              <Text style={styles.inputLabel}>Hora</Text>
              <TextInput
                style={styles.input}
                value={formTime}
                onChangeText={setFormTime}
                placeholder="HH:MM"
                placeholderTextColor="#6B7280"
              />
              <Text style={styles.inputLabel}>Local *</Text>
              <TextInput
                style={styles.input}
                value={formLocation}
                onChangeText={setFormLocation}
                placeholder="Endereço ou descrição do local"
                placeholderTextColor="#6B7280"
              />
              <Text style={styles.inputLabel}>Tipificação *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.classificationGrid}>
                  {OCCURRENCE_CLASSIFICATIONS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.classificationBtn,
                        formClassification === c && styles.classificationBtnActive,
                      ]}
                      onPress={() => setFormClassification(c)}
                    >
                      <Text style={[
                        styles.classificationBtnText,
                        formClassification === c && styles.classificationBtnTextActive,
                      ]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.inputLabel}>Descrição *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Descreva a ocorrência..."
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={4}
              />
            </ScrollView>
            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
              <Text style={styles.submitBtnText}>Criar Ocorrência</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide">
        <SafeAreaView style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => {
              setShowDetailModal(false);
              setLocalPhotos([]);
            }}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.detailTitle}>Boletim</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={generatePDF} style={styles.pdfBtn}>
                <Ionicons name="document" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          {selectedOccurrence && (
            <ScrollView style={styles.detailBody}>
              {/* PDF Button */}
              <TouchableOpacity style={styles.generatePdfBtn} onPress={generatePDF}>
                <Ionicons name="document-text" size={20} color="#FFFFFF" />
                <Text style={styles.generatePdfBtnText}>Gerar PDF do Boletim</Text>
              </TouchableOpacity>

              {/* Status */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Estado</Text>
                <View style={styles.statusRow}>
                  {['rascunho', 'em_analise', 'concluido', 'arquivado'].map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusOption,
                        selectedOccurrence.status === s && { backgroundColor: OCCURRENCE_STATUS_COLORS[s] },
                      ]}
                      onPress={() => handleUpdateStatus(s)}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        selectedOccurrence.status === s && { color: '#FFF' },
                      ]}>{OCCURRENCE_STATUS_LABELS[s]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Informação</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar" size={16} color="#9CA3AF" />
                  <Text style={styles.infoText}>{formatDate(selectedOccurrence.date)} {selectedOccurrence.time || ''}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={16} color="#9CA3AF" />
                  <Text style={styles.infoText}>{selectedOccurrence.location}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="pricetag" size={16} color="#9CA3AF" />
                  <Text style={styles.infoText}>{selectedOccurrence.classification}</Text>
                </View>
              </View>

              {/* Description */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Descrição</Text>
                <Text style={styles.descriptionText}>{selectedOccurrence.description}</Text>
              </View>

              {/* Photos */}
              <View style={styles.detailSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.detailSectionTitle}>Fotografias</Text>
                  <TouchableOpacity 
                    style={[styles.addSmallBtn, isUploadingPhoto && styles.disabledBtn]} 
                    onPress={handleAddPhoto}
                    disabled={isUploadingPhoto}
                  >
                    {isUploadingPhoto ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="camera" size={18} color="#FFFFFF" />
                        <Text style={styles.addSmallBtnText}>Adicionar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                {localPhotos.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.photosRow}>
                      {localPhotos.map((photo, i) => (
                        <TouchableOpacity 
                          key={i} 
                          onLongPress={() => {
                            Alert.alert(
                              'Remover Foto',
                              'Deseja remover esta foto?',
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                { 
                                  text: 'Remover', 
                                  style: 'destructive',
                                  onPress: () => setLocalPhotos(prev => prev.filter((_, idx) => idx !== i))
                                }
                              ]
                            );
                          }}
                        >
                          <Image source={{ uri: photo }} style={styles.photoThumb} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                ) : (
                  <Text style={styles.emptySubtext}>Sem fotografias (pressione longo para remover)</Text>
                )}
              </View>

              {/* Persons */}
              <View style={styles.detailSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.detailSectionTitle}>Pessoas Envolvidas</Text>
                  <TouchableOpacity
                    style={styles.addSmallBtn}
                    onPress={() => {
                      resetPersonForm();
                      setShowPersonModal(true);
                    }}
                  >
                    <Ionicons name="person-add" size={18} color="#FFFFFF" />
                    <Text style={styles.addSmallBtnText}>Adicionar</Text>
                  </TouchableOpacity>
                </View>
                {getAllPersons(selectedOccurrence).length > 0 ? (
                  getAllPersons(selectedOccurrence).map((person, i) => (
                    <View key={i} style={styles.personCard}>
                      <View style={styles.personHeader}>
                        <View style={[styles.roleBadge, {
                          backgroundColor: person.role === 'suspeito' ? '#EF4444' :
                            person.role === 'testemunha' ? '#3B82F6' : '#F59E0B'
                        }]}>
                          <Text style={styles.roleBadgeText}>{person.roleLabel}</Text>
                        </View>
                        <Text style={styles.personName}>{person.full_name}</Text>
                      </View>
                      {person.document_number && (
                        <Text style={styles.personDoc}>
                          {DOCUMENT_TYPE_LABELS[person.document_type as DocumentType]}: {person.document_number}
                        </Text>
                      )}
                      {person.tax_id && (
                        <Text style={styles.personContact}>NIF: {person.tax_id}</Text>
                      )}
                      {person.address && (
                        <Text style={styles.personContact}>Morada: {person.address}</Text>
                      )}
                      {person.phone && (
                        <Text style={styles.personContact}>Tel: {person.phone}</Text>
                      )}
                      {person.email && (
                        <Text style={styles.personContact}>Email: {person.email}</Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptySubtext}>Nenhuma pessoa adicionada</Text>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Add Person Modal */}
      <Modal visible={showPersonModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Pessoa</Text>
              <TouchableOpacity onPress={() => setShowPersonModal(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Tipo *</Text>
              <View style={styles.roleButtons}>
                {roles.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleBtn,
                      personRole === r && styles.roleBtnActive,
                    ]}
                    onPress={() => setPersonRole(r)}
                  >
                    <Text style={[
                      styles.roleBtnText,
                      personRole === r && styles.roleBtnTextActive,
                    ]}>{PERSON_ROLE_LABELS[r]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Nome Completo *</Text>
              <TextInput
                style={styles.input}
                value={personName}
                onChangeText={setPersonName}
                placeholder="Nome completo"
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.inputLabel}>Documento de Identificação</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.docTypeButtons}>
                  {docTypes.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.docTypeBtn,
                        personDocType === d && styles.docTypeBtnActive,
                      ]}
                      onPress={() => setPersonDocType(d)}
                    >
                      <Text style={[
                        styles.docTypeBtnText,
                        personDocType === d && styles.docTypeBtnTextActive,
                      ]}>{DOCUMENT_TYPE_LABELS[d]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.inputLabel}>Nº Documento</Text>
              <TextInput
                style={styles.input}
                value={personDocNumber}
                onChangeText={setPersonDocNumber}
                placeholder="Número do documento"
                placeholderTextColor="#6B7280"
              />

              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Data Emissão</Text>
                  <TextInput
                    style={styles.input}
                    value={personDocIssue}
                    onChangeText={setPersonDocIssue}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#6B7280"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Data Validade</Text>
                  <TextInput
                    style={styles.input}
                    value={personDocExpiry}
                    onChangeText={setPersonDocExpiry}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#6B7280"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>NIF</Text>
              <TextInput
                style={styles.input}
                value={personNIF}
                onChangeText={setPersonNIF}
                placeholder="Número de Identificação Fiscal"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Morada</Text>
              <TextInput
                style={styles.input}
                value={personAddress}
                onChangeText={setPersonAddress}
                placeholder="Endereço completo"
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.inputLabel}>Telemóvel</Text>
              <TextInput
                style={styles.input}
                value={personPhone}
                onChangeText={setPersonPhone}
                placeholder="Contacto telefónico"
                placeholderTextColor="#6B7280"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>E-mail</Text>
              <TextInput
                style={styles.input}
                value={personEmail}
                onChangeText={setPersonEmail}
                placeholder="Endereço de e-mail"
                placeholderTextColor="#6B7280"
                keyboardType="email-address"
              />

              <Text style={styles.inputLabel}>Notas</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={personNotes}
                onChangeText={setPersonNotes}
                placeholder="Observações adicionais"
                placeholderTextColor="#6B7280"
                multiline
              />

              {/* Person Photos */}
              <View style={styles.personPhotoSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.inputLabel}>Fotos de Identificação</Text>
                  <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPersonPhoto}>
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                {personPhotos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.photosRow}>
                      {personPhotos.map((photo, i) => (
                        <Image key={i} source={{ uri: photo }} style={styles.smallPhotoThumb} />
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.submitBtn} onPress={handleAddPerson}>
              <Text style={styles.submitBtnText}>Adicionar Pessoa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 150,
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: '#1F2937',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
  },
  occCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  occHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  occDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  occClassification: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  occLocation: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  occDescription: {
    fontSize: 13,
    color: '#D1D5DB',
    marginBottom: 12,
  },
  occFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  occStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  occStatText: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#374151',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  classificationGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  classificationBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  classificationBtnActive: {
    backgroundColor: '#3B82F6',
  },
  classificationBtnText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  classificationBtnTextActive: {
    color: '#FFFFFF',
  },
  submitBtn: {
    backgroundColor: '#3B82F6',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pdfBtn: {
    backgroundColor: '#10B981',
    padding: 8,
    borderRadius: 8,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailBody: {
    flex: 1,
    padding: 16,
  },
  generatePdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  generatePdfBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailSection: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  descriptionText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    minWidth: 100,
    justifyContent: 'center',
  },
  disabledBtn: {
    backgroundColor: '#4B5563',
    opacity: 0.7,
  },
  addSmallBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  photosRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  smallPhotoThumb: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  personCard: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  personName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  personDoc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  personContact: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#374151',
    alignItems: 'center',
  },
  roleBtnActive: {
    backgroundColor: '#3B82F6',
  },
  roleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  roleBtnTextActive: {
    color: '#FFFFFF',
  },
  docTypeButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  docTypeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  docTypeBtnActive: {
    backgroundColor: '#8B5CF6',
  },
  docTypeBtnText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  docTypeBtnTextActive: {
    color: '#FFFFFF',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  personPhotoSection: {
    marginTop: 16,
  },
  addPhotoBtn: {
    backgroundColor: '#3B82F6',
    padding: 8,
    borderRadius: 6,
  },
});
