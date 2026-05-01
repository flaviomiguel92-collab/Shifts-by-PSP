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
import {
  reportTemplatesCatalog,
  makeDemaisEfetivoItem,
  makeEfetivoItem,
  makeExpedienteItem,
} from '../../src/reports/reportSchemas';
import { ServicoRemuneradoFormData, Categoria } from '../../src/reports/reportTypes';
import { validateServicoRemunerado } from '../../src/reports/reportValidation';
import { buildServicoRemuneradoFileName } from '../../src/reports/reportFileNaming';
import { generateReportPdf } from '../../src/services/reportsApi';

const template = reportTemplatesCatalog[0];
const CATEGORIAS: readonly Categoria[] = ['Agente', 'Chefe', 'Oficial'] as const;

const downloadOnWeb = (base64Pdf: string, fileName: string) => {
  const binary = atob(base64Pdf);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const showFeedback = (title: string, message: string) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
};

interface CategoryPickerProps {
  value: Categoria;
  onChange: (categoria: Categoria) => void;
}

const CategoryPicker: React.FC<CategoryPickerProps> = ({ value, onChange }) => (
  <View style={styles.categoryPicker}>
    {CATEGORIAS.map((categoria) => (
      <TouchableOpacity
        key={categoria}
        style={[styles.categoryButton, value === categoria && styles.categoryButtonSelected]}
        onPress={() => onChange(categoria)}
      >
        <Text
          style={[
            styles.categoryButtonText,
            value === categoria && styles.categoryButtonTextSelected,
          ]}
        >
          {categoria}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

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
      showFeedback('Dados incompletos', validation.errors.join('\n'));
      return;
    }

    const suggestedFileName = buildServicoRemuneradoFileName({
      reportDate: formData.reportDate,
      reportHour: formData.reportHour,
      remuneratedName: formData.graduadoNome,
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
        showFeedback('Sucesso', `PDF gerado: ${response.file_name}`);
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
          showFeedback('Sucesso', `PDF guardado em: ${outputPath}`);
        }
      }
    } catch (error) {
      showFeedback('Erro', error instanceof Error ? error.message : 'Falha ao gerar relatório.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Relatórios</Text>
        <Text style={styles.pageSubtitle}>Preenche os campos para gerar o Relatório de Serviço Remunerado.</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cabeçalho: Serviço Remunerado</Text>
          <TextInput
            value={formData.servicoRemunerado}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, servicoRemunerado: value }))}
            placeholder="Serviço Remunerado"
            placeholderTextColor="#6B7280"
            style={styles.input}
          />
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
        </View>

        <View style={styles.card}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Efetivo Policial</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() =>
                setFormData((prev) => ({ ...prev, efetivoPolicial: [...prev.efetivoPolicial, makeEfetivoItem()] }))
              }
            >
              <Text style={styles.addBtnText}>+ Adicionar</Text>
            </TouchableOpacity>
          </View>
          {formData.efetivoPolicial.length === 0 && (
            <Text style={styles.emptyText}>Sem elementos adicionados.</Text>
          )}
          {formData.efetivoPolicial.map((item, index) => (
            <View key={item.id} style={styles.dynamicBlock}>
              <View style={styles.dynamicHeader}>
                <Text style={styles.dynamicTitle}>Elemento {index + 1}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      efetivoPolicial: prev.efetivoPolicial.filter((entry) => entry.id !== item.id),
                    }))
                  }
                >
                  <Text style={styles.removeText}>Remover</Text>
                </TouchableOpacity>
              </View>
              <CategoryPicker
                value={item.categoria}
                onChange={(categoria) =>
                  setFormData((prev) => ({
                    ...prev,
                    efetivoPolicial: updateListItem(prev.efetivoPolicial, item.id, { categoria }),
                  }))
                }
              />
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Polícia Mais Graduado/Antigo</Text>
          <TextInput
            value={formData.graduadoMatricula}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, graduadoMatricula: value }))}
            placeholder="Matrícula"
            placeholderTextColor="#6B7280"
            style={styles.input}
          />
          <Text style={styles.fieldLabel}>Categoria</Text>
          <CategoryPicker
            value={formData.graduadoCategoria}
            onChange={(categoria) => setFormData((prev) => ({ ...prev, graduadoCategoria: categoria }))}
          />
          <TextInput
            value={formData.graduadoNome}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, graduadoNome: value }))}
            placeholder="Nome"
            placeholderTextColor="#6B7280"
            style={styles.input}
          />
          <TextInput
            value={formData.graduadoRadio}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, graduadoRadio: value }))}
            placeholder="Número do Rádio (E/R)"
            placeholderTextColor="#6B7280"
            style={styles.input}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Demais Efetivo Policial</Text>
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
              <Text style={styles.fieldLabel}>Categoria</Text>
              <CategoryPicker
                value={item.categoria}
                onChange={(categoria) =>
                  setFormData((prev) => ({
                    ...prev,
                    demaisEfetivo: updateListItem(prev.demaisEfetivo, item.id, { categoria }),
                  }))
                }
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
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Expediente Efetuado</Text>
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
                value={item.npp}
                onChangeText={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    expedienteEfetuado: updateListItem(prev.expedienteEfetuado, item.id, { npp: value }),
                  }))
                }
                placeholder="NPP"
                placeholderTextColor="#6B7280"
                style={styles.input}
              />
              <TextInput
                value={item.nuipc}
                onChangeText={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    expedienteEfetuado: updateListItem(prev.expedienteEfetuado, item.id, { nuipc: value }),
                  }))
                }
                placeholder="NUIPC"
                placeholderTextColor="#6B7280"
                style={styles.input}
              />
              <TextInput
                value={item.tipificacao}
                onChangeText={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    expedienteEfetuado: updateListItem(prev.expedienteEfetuado, item.id, { tipificacao: value }),
                  }))
                }
                placeholder="Tipificação"
                placeholderTextColor="#6B7280"
                style={styles.input}
              />
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ordem de Missão nº 8/DSTP/2024</Text>
          <Text style={styles.questionText}>
            Foi integralmente cumprida a Ordem de Missão nº 8/DSTP/2024, incluindo horários e locais estipulados?
          </Text>
          <View style={styles.toggleGroup}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                formData.ordemMissaoCumprida === true && styles.toggleButtonActive,
              ]}
              onPress={() => setFormData((prev) => ({ ...prev, ordemMissaoCumprida: true }))}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  formData.ordemMissaoCumprida === true && styles.toggleButtonTextActive,
                ]}
              >
                Sim
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                formData.ordemMissaoCumprida === false && styles.toggleButtonActive,
              ]}
              onPress={() => setFormData((prev) => ({ ...prev, ordemMissaoCumprida: false }))}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  formData.ordemMissaoCumprida === false && styles.toggleButtonTextActive,
                ]}
              >
                Não
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {formData.ordemMissaoCumprida === false && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Justificação</Text>
            <TextInput
              value={formData.justificacao}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, justificacao: value }))}
              placeholder="Justificação em caso de não cumprimento integral da ordem de missão"
              placeholderTextColor="#6B7280"
              style={[styles.input, styles.textArea]}
              multiline
            />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <TextInput
            value={formData.observacao}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, observacao: value }))}
            placeholder="Observações"
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
  fieldLabel: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  categoryPicker: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  categoryButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  categoryButtonSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  categoryButtonText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  categoryButtonTextSelected: { color: '#FFFFFF', fontWeight: '700' },
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
  questionText: { color: '#D1D5DB', fontSize: 13, marginBottom: 12, lineHeight: 18 },
  toggleGroup: { flexDirection: 'row', gap: 8 },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  toggleButtonActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  toggleButtonText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  toggleButtonTextActive: { color: '#FFFFFF', fontWeight: '700' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
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
