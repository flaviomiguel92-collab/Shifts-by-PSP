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
import { PersonFormModal } from '../../src/components/occurrence/PersonFormModal';
import { CreateOccurrenceModal } from '../../src/components/occurrence/CreateOccurrenceModal';
import { useTheme } from '../../src/theme/themes';
import {
  Occurrence,
  Person,
  OCCURRENCE_STATUS_LABELS,
  OCCURRENCE_STATUS_COLORS,
  DOCUMENT_TYPE_LABELS,
  DocumentType,
} from '../../src/types/occurrence';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_API_URL || '';
const MAX_IMAGE_WIDTH = 800;  // Max width for compressed images
const IMAGE_QUALITY = 0.6;    // Compression quality (0-1)

export default function OcorrenciasScreen() {
  const th = useTheme();
  const isLight = !th.isDark;
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fetchOccurrences = async () => {
    try {
      const token = await storage.getItem('session_token');
      const response = await fetch(`${API_URL}/api/occurrences`, {
        headers: { 'Authorization': `Bearer ${token}` },
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

  const handleOccurrenceCreated = async (newOcc: Occurrence) => {
    await fetchOccurrences();
    setSelectedOccurrence(newOcc);
    setLocalPhotos(newOcc.photos || []);
    setShowDetailModal(true);
  };

  const handlePersonAdded = async (updated: Occurrence) => {
    setSelectedOccurrence(updated);
    await fetchOccurrences();
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
      });

      if (response.ok) {
        const updated = await response.json();
        setSelectedOccurrence(updated);
        await fetchOccurrences();
      }
    } catch (error) {
      console.error('Update status error:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedOccurrence) return;

    const occurrenceId = selectedOccurrence.id;

    const executeDelete = async () => {
      try {
        const token = await storage.getItem('session_token');
        const response = await fetch(`${API_URL}/api/occurrences/${occurrenceId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          let detail = `Falha ao eliminar ocorrência (HTTP ${response.status})`;
          try {
            const errorBody = await response.json();
            if (errorBody?.detail) {
              detail = String(errorBody.detail);
            }
          } catch {
            // Ignora parse de erro e mantém mensagem padrão
          }
          throw new Error(detail);
        }

        // Atualiza imediatamente a lista local para refletir a remoção
        setOccurrences(prev => prev.filter(occ => occ.id !== occurrenceId));

        // Fecha o detalhe (retorna à lista de ocorrências)
        setShowDetailModal(false);
        setSelectedOccurrence(null);
        setLocalPhotos([]);

        // Revalida dados no backend
        await fetchOccurrences();
      } catch (error) {
        console.error('Delete occurrence error:', error);
        Alert.alert('Erro', 'Não foi possível eliminar a ocorrência');
      }
    };

    // No Web, Alert com múltiplos botões pode não executar callbacks como esperado
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined'
        ? window.confirm('Tem a certeza que deseja eliminar esta ocorrência?')
        : false;

      if (confirmed) {
        await executeDelete();
      }
      return;
    }

    Alert.alert(
      'Eliminar Ocorrência',
      'Tem a certeza que deseja eliminar esta ocorrência?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: executeDelete,
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

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: th.bg }]}>
      <HeaderWithBack title="Ocorrências" />
      <View style={[styles.header, isLight && { backgroundColor: th.bgAlt, borderBottomColor: th.border }]}>
        <Text style={[styles.headerTitle, isLight && { color: th.textPrimary }]}>Ocorrências</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
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
            <Text style={[styles.emptyText, isLight && { color: th.textSecondary }]}>Sem ocorrências registadas</Text>
            <Text style={[styles.emptySubtext, isLight && { color: th.textMuted }]}>Toca no + para criar uma nova</Text>
          </View>
        ) : (
          occurrences.map((occ) => (
            <TouchableOpacity
              key={occ.id}
              style={[styles.occCard, isLight && { backgroundColor: th.surface, borderColor: th.borderStrong }]}
              onPress={() => openOccurrence(occ)}
            >
              <View style={styles.occHeader}>
                <View style={[styles.statusBadge, { backgroundColor: OCCURRENCE_STATUS_COLORS[occ.status] }]}>
                  <Text style={styles.statusText}>{OCCURRENCE_STATUS_LABELS[occ.status]}</Text>
                </View>
                <Text style={[styles.occDate, isLight && { color: th.textMuted }]}>{formatDate(occ.date)}</Text>
              </View>
              <Text style={[styles.occClassification, isLight && { color: th.textPrimary }]}>{occ.classification}</Text>
              <Text style={[styles.occLocation, isLight && { color: th.textSecondary }]} numberOfLines={1}>
                <Ionicons name="location" size={12} color={isLight ? th.textMuted : '#6B7280'} /> {occ.location}
              </Text>
              <Text style={[styles.occDescription, isLight && { color: th.textSecondary }]} numberOfLines={2}>{occ.description}</Text>
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

      <CreateOccurrenceModal
        visible={showCreateModal}
        apiUrl={API_URL}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleOccurrenceCreated}
      />

      {/* Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide">
        <SafeAreaView style={[styles.detailContainer, isLight && { backgroundColor: th.bg }]}>
          <View style={[styles.detailHeader, isLight && { backgroundColor: th.bgAlt, borderBottomColor: th.border }]}>
            <TouchableOpacity onPress={() => {
              setShowDetailModal(false);
              setLocalPhotos([]);
            }}>
              <Ionicons name="arrow-back" size={24} color={isLight ? th.textPrimary : '#FFFFFF'} />
            </TouchableOpacity>
            <Text style={[styles.detailTitle, isLight && { color: th.textPrimary }]}>Boletim</Text>
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
              <View style={[styles.detailSection, isLight && { backgroundColor: th.surface, borderColor: th.borderStrong }]}>
                <Text style={[styles.detailSectionTitle, isLight && { color: th.textPrimary }]}>Estado</Text>
                <View style={styles.statusRow}>
                  {['rascunho', 'em_analise', 'concluido', 'arquivado'].map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusOption,
                        isLight && { backgroundColor: th.bg, borderColor: th.borderStrong, borderWidth: 1 },
                        selectedOccurrence.status === s && { backgroundColor: OCCURRENCE_STATUS_COLORS[s] },
                      ]}
                      onPress={() => handleUpdateStatus(s)}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        isLight && selectedOccurrence.status !== s && { color: th.textSecondary },
                        selectedOccurrence.status === s && { color: '#FFF' },
                      ]}>{OCCURRENCE_STATUS_LABELS[s]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Info */}
              <View style={[styles.detailSection, isLight && { backgroundColor: th.surface, borderColor: th.borderStrong }]}>
                <Text style={[styles.detailSectionTitle, isLight && { color: th.textPrimary }]}>Informação</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar" size={16} color="#9CA3AF" />
                  <Text style={[styles.infoText, isLight && { color: th.textPrimary }]}>{formatDate(selectedOccurrence.date)} {selectedOccurrence.time || ''}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={16} color="#9CA3AF" />
                  <Text style={[styles.infoText, isLight && { color: th.textPrimary }]}>{selectedOccurrence.location}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="pricetag" size={16} color="#9CA3AF" />
                  <Text style={[styles.infoText, isLight && { color: th.textPrimary }]}>{selectedOccurrence.classification}</Text>
                </View>
              </View>

              {/* Description */}
              <View style={[styles.detailSection, isLight && { backgroundColor: th.surface, borderColor: th.borderStrong }]}>
                <Text style={[styles.detailSectionTitle, isLight && { color: th.textPrimary }]}>Descrição</Text>
                <Text style={[styles.descriptionText, isLight && { color: th.textSecondary }]}>{selectedOccurrence.description}</Text>
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
                    onPress={() => setShowPersonModal(true)}
                  >
                    <Ionicons name="person-add" size={18} color="#FFFFFF" />
                    <Text style={styles.addSmallBtnText}>Adicionar</Text>
                  </TouchableOpacity>
                </View>
                {getAllPersons(selectedOccurrence).length > 0 ? (
                  getAllPersons(selectedOccurrence).map((person, i) => (
                    <View key={i} style={[styles.personCard, isLight && { backgroundColor: th.bg, borderColor: th.borderStrong }]}>
                      <View style={styles.personHeader}>
                        <View style={[styles.roleBadge, {
                          backgroundColor: person.role === 'suspeito' ? '#EF4444' :
                            person.role === 'testemunha' ? '#3B82F6' : '#F59E0B'
                        }]}>
                          <Text style={styles.roleBadgeText}>{person.roleLabel}</Text>
                        </View>
                        <Text style={[styles.personName, isLight && { color: th.textPrimary }]}>{person.full_name}</Text>
                      </View>
                      {person.document_number && (
                        <Text style={[styles.personDoc, isLight && { color: th.textSecondary }]}>
                          {DOCUMENT_TYPE_LABELS[person.document_type as DocumentType]}: {person.document_number}
                        </Text>
                      )}
                      {person.tax_id && (
                        <Text style={[styles.personContact, isLight && { color: th.textMuted }]}>NIF: {person.tax_id}</Text>
                      )}
                      {person.address && (
                        <Text style={[styles.personContact, isLight && { color: th.textMuted }]}>Morada: {person.address}</Text>
                      )}
                      {person.phone && (
                        <Text style={[styles.personContact, isLight && { color: th.textMuted }]}>Tel: {person.phone}</Text>
                      )}
                      {person.email && (
                        <Text style={[styles.personContact, isLight && { color: th.textMuted }]}>Email: {person.email}</Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={[styles.emptySubtext, isLight && { color: th.textMuted }]}>Nenhuma pessoa adicionada</Text>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <PersonFormModal
        visible={showPersonModal}
        occurrenceId={selectedOccurrence?.id ?? ''}
        apiUrl={API_URL}
        onClose={() => setShowPersonModal(false)}
        onPersonAdded={handlePersonAdded}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.18)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: -0.3,
  },
  addButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
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
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: 'rgba(11, 17, 32, 0.75)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#334155',
    marginTop: 4,
  },
  occCard: {
    backgroundColor: 'rgba(11, 17, 32, 0.75)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
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
    color: '#475569',
  },
  occClassification: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  occLocation: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
  },
  occDescription: {
    fontSize: 13,
    color: '#CBD5E1',
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
    color: '#475569',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#050816',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.18)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pdfBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 8,
    borderRadius: 10,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  detailBody: {
    flex: 1,
    padding: 16,
  },
  generatePdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    gap: 10,
  },
  generatePdfBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  detailSection: {
    backgroundColor: 'rgba(11, 17, 32, 0.75)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  descriptionText: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 22,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    minWidth: 100,
    justifyContent: 'center',
  },
  disabledBtn: {
    backgroundColor: 'rgba(71, 85, 105, 0.3)',
    borderColor: 'rgba(71, 85, 105, 0.2)',
    opacity: 0.7,
  },
  addSmallBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#60A5FA',
  },
  photosRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  personCard: {
    backgroundColor: 'rgba(5, 8, 22, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
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
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  personName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  personDoc: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  personContact: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
});
