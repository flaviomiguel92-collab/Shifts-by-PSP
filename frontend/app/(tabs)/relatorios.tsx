import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { reportTemplatesCatalog, makeDemaisEfetivoItem, makeExpedienteItem } from '../../src/reports/reportSchemas';
import { ServicoRemuneradoFormData } from '../../src/reports/reportTypes';
import { validateServicoRemunerado } from '../../src/reports/reportValidation';
import { buildServicoRemuneradoFileName } from '../../src/reports/reportFileNaming';
import { generateReportPdf } from '../../src/services/reportsApi';

const template = reportTemplatesCatalog[0];

const downloadOnWeb = (base64Pdf: string, fileName: string) => {
  const binary = atob(base64Pdf);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const updateListItem = <T extends { id: string }>(
  list: T[],
  id: string,
  patch: Partial<T>
): T[] => list.map((item) => (item.id === id ? { ...item, ...patch } : item));

export default function ReportsScreen() {
  const [selectedTemplateId] = useState(template.id);
  const [formData, setFormData] = useState<ServicoRemuneradoFormData>(template.createInitialData());
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedTemplate = useMemo(
    () => reportTemplatesCatalog.find((item) => item.id === selectedTemplateId),
    [selectedTemplateId]
  );

  const handleGenerate = async () => {
    const validation = validateServicoRemunerado(formData);
    if (!validation.isValid) {
      Alert.alert('Dados incompletos', validation.errors.join('\n'));
      return;
    }

    const suggestedFileName = buildServicoRemuneradoFileName({
      reportDate: formData.reportDate,
      reportHour: formData.reportHour,
      remuneratedName: formData.remuneratedName,
      graduadoMatricula: formData.graduadoMatricula,
    });

    setIsGenerating(true);
    try {
      const response = await generateReportPdf({
        template_id: 'servico_remunerado',
        data: {
          ...formData,
          desired_file_name: suggestedFileName,
        },
      });

      if (Platform.OS === 'web') {
        downloadOnWeb(response.pdf_base64, response.file_name);
        Alert.alert('Sucesso', `PDF gerado: ${response.file_name}`);
      } else {
        const outputPath = `${FileSystem.cacheDirectory}${response.file_name}`;
        await FileSystem.writeAsStringAsync(outputPath, response.pdf_base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(outputPath, {
            mimeType: 'application/pdf',
            dialogTitle: 'Partilhar relatório',
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert('Sucesso', `PDF guardado em: ${outputPath}`);
        }
      }
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao gerar relatório.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Relatórios</Text>
        <Text style={styles.pageSubtitle}>Escolhe o modelo e preenche os campos para gerar PDF.</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Modelos disponíveis</Text>
          {selectedTemplate && (
            <View style={styles.templateCard}>
              <View style={styles.templateBadge}>
                <Ionicons name="document-text-outline" size={18} color="#93C5FD" />
              </View>
              <View style={styles.templateInfo}>
                <Text style={styles.templateTitle}>{selectedTemplate.title}</Text>
                <Text style={styles.templateDescription}>{selectedTemplate.description}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dados gerais</Text>
          <View style={styles.row}>
            <TextInput
              value={formData.reportDate}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, reportDate: value }))}
              placeholder="Data (AAAA-MM-DD)"
              placeholderTextColor="#6B7280"
              style={[styles.input, styles.halfInput]}
            />
            <TextInput
              value={formData.reportHour}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, reportHour: value }))}
              placeholder="Hora (HH:MM)"
              placeholderTextColor="#6B7280"
              style={[styles.input, styles.halfInput]}
            />
          </View>
          <TextInput
            value={formData.remuneratedName}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, remuneratedName: value }))}
            placeholder="Nome do remunerado (usado no nome do ficheiro)"
            placeholderTextColor="#6B7280"
            style={styles.input}
          />
          <TextInput
            value={formData.serviceType}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, serviceType: value }))}
            placeholder="Tipo de serviço"
            placeholderTextColor="#6B7280"
            style={styles.input}
          />
          <TextInput
            value={formData.serviceLocation}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, serviceLocation: value }))}
            placeholder="Local"
            placeholderTextColor="#6B7280"
            style={styles.input}
          />
          <TextInput
            value={formData.serviceReference}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, serviceReference: value }))}
            placeholder="Referência / evento"
            placeholderTextColor="#6B7280"
            style={styles.input}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Efetivo e cabeçalho</Text>
          <View style={styles.row}>
            <TextInput
              value={formData.efetivoTotal}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, efetivoTotal: value }))}
              placeholder="Efetivo total"
              placeholderTextColor="#6B7280"
              style={[styles.input, styles.thirdInput]}
            />
            <TextInput
              value={formData.chefesCount}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, chefesCount: value }))}
              placeholder="Chefes"
              placeholderTextColor="#6B7280"
              style={[styles.input, styles.thirdInput]}
            />
            <TextInput
              value={formData.agentesCount}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, agentesCount: value }))}
              placeholder="Agentes"
              placeholderTextColor="#6B7280"
              style={[styles.input, styles.thirdInput]}
            />
          </View>
          <TextInput
            value={formData.graduadoPosto}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, graduadoPosto: value }))}
            placeholder="Posto do polícia mais graduado/antigo"
            placeholderTextColor="#6B7280"
            style={styles.input}
          />
          <TextInput
            value={formData.graduadoNome}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, graduadoNome: value }))}
            placeholder="Nome do polícia mais graduado/antigo"
            placeholderTextColor="#6B7280"
            style={styles.input}
          />
          <TextInput
            value={formData.graduadoMatricula}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, graduadoMatricula: value }))}
            placeholder="Matrícula do polícia mais graduado/antigo"
            placeholderTextColor="#6B7280"
            style={styles.input}
          />
          <TextInput
            value={formData.graduadoComando}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, graduadoComando: value }))}
            placeholder="Comando/Unidade do graduado"
            placeholderTextColor="#6B7280"
            style={styles.input}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Demais efetivo policial</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() =>
                setFormData((prev) => ({ ...prev, demaisEfetivo: [...prev.demaisEfetivo, makeDemaisEfetivoItem()] }))
              }
            >
              <Text style={styles.addBtnText}>+ Adicionar</Text>
            </TouchableOpacity>
          </View>
          {formData.demaisEfetivo.map((item, index) => (
            <View key={item.id} style={styles.dynamicBlock}>
              <View style={styles.dynamicHeader}>
                <Text style={styles.dynamicTitle}>Elemento {index + 1}</Text>
                {index > 0 && (
                  <TouchableOpacity
                    onPress={() =>
                      setFormData((prev) => ({
                        ...prev,
                        demaisEfetivo: prev.demaisEfetivo.filter((entry) => entry.id !== item.id),
                      }))
                    }
                  >
                    <Text style={styles.removeText}>Remover</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                value={item.posto}
                onChangeText={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    demaisEfetivo: updateListItem(prev.demaisEfetivo, item.id, { posto: value }),
                  }))
                }
                placeholder="Posto"
                placeholderTextColor="#6B7280"
                style={styles.input}
              />
              <TextInput
                value={item.nome}
                onChangeText={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    demaisEfetivo: updateListItem(prev.demaisEfetivo, item.id, { nome: value }),
                  }))
                }
                placeholder="Nome"
                placeholderTextColor="#6B7280"
                style={styles.input}
              />
              <TextInput
                value={item.matricula}
                onChangeText={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    demaisEfetivo: updateListItem(prev.demaisEfetivo, item.id, { matricula: value }),
                  }))
                }
                placeholder="Matrícula"
                placeholderTextColor="#6B7280"
                style={styles.input}
              />
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Expediente efetuado</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() =>
                setFormData((prev) => ({
                  ...prev,
                  expedienteEfetuado: [...prev.expedienteEfetuado, makeExpedienteItem()],
                }))
              }
            >
              <Text style={styles.addBtnText}>+ Adicionar</Text>
            </TouchableOpacity>
          </View>
          {formData.expedienteEfetuado.length === 0 && (
            <Text style={styles.emptyText}>Sem entradas (opcional).</Text>
          )}
          {formData.expedienteEfetuado.map((item, index) => (
            <View key={item.id} style={styles.dynamicBlock}>
              <View style={styles.dynamicHeader}>
                <Text style={styles.dynamicTitle}>Entrada {index + 1}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      expedienteEfetuado: prev.expedienteEfetuado.filter((entry) => entry.id !== item.id),
                    }))
                  }
                >
                  <Text style={styles.removeText}>Remover</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={item.descricao}
                onChangeText={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    expedienteEfetuado: updateListItem(prev.expedienteEfetuado, item.id, { descricao: value }),
                  }))
                }
                placeholder="Descrição"
                placeholderTextColor="#6B7280"
                style={styles.input}
              />
              <TextInput
                value={item.referencia}
                onChangeText={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    expedienteEfetuado: updateListItem(prev.expedienteEfetuado, item.id, { referencia: value }),
                  }))
                }
                placeholder="Referência"
                placeholderTextColor="#6B7280"
                style={styles.input}
              />
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Observações e justificações</Text>
          <TextInput
            value={formData.observacoes}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, observacoes: value }))}
            placeholder="Observações"
            placeholderTextColor="#6B7280"
            style={[styles.input, styles.textArea]}
            multiline
          />
          <TextInput
            value={formData.justificacoes}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, justificacoes: value }))}
            placeholder="Justificações"
            placeholderTextColor="#6B7280"
            style={[styles.input, styles.textArea]}
            multiline
          />
        </View>

        <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={isGenerating}>
          <Ionicons name={isGenerating ? 'sync' : 'document-attach-outline'} size={20} color="#FFFFFF" />
          <Text style={styles.generateBtnText}>{isGenerating ? 'A gerar PDF...' : 'Gerar PDF'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { padding: 14, paddingBottom: 120 },
  pageTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  pageSubtitle: { color: '#9CA3AF', marginTop: 6, marginBottom: 14, fontSize: 13 },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sectionTitle: { color: '#E5E7EB', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  templateCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  templateBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.16)',
  },
  templateInfo: { flex: 1 },
  templateTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  templateDescription: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    backgroundColor: '#111827',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    fontSize: 13,
  },
  halfInput: { flex: 1 },
  thirdInput: { flex: 1 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: '#6EE7B7', fontSize: 12, fontWeight: '700' },
  dynamicBlock: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 8,
  },
  dynamicHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dynamicTitle: { color: '#E5E7EB', fontSize: 12, fontWeight: '700' },
  removeText: { color: '#FCA5A5', fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#9CA3AF', fontSize: 12, marginBottom: 8 },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  generateBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  generateBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
