import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateReport, GenerateReportRequest, ReportExpedienteItem, ReportPersonItem } from '../services/api';
import { downloadDocx } from '../utils/exportUtils';
import { toast } from '../utils/toast';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type ScalarKey = keyof Omit<ReportForm, never>;

interface ReportForm {
  report_date: string;
  report_hour: string;
  graduado_nome: string;
  graduado_matricula: string;
  graduado_radio: string;
  efetivo_oficiais: string;
  efetivo_chefes: string;
  efetivo_agentes: string;
  servico_remunerado: string;
  justificacao: string;
  observacao: string;
}

const SCALAR_FIELDS: [string, ScalarKey, boolean?, boolean?][] = [
  ['Data (AAAA-MM-DD)', 'report_date'],
  ['Hora (HH:MM)', 'report_hour'],
  ['Nome do graduado', 'graduado_nome'],
  ['Matrícula', 'graduado_matricula'],
  ['Indicativo rádio', 'graduado_radio'],
  ['Nº oficiais', 'efetivo_oficiais', false, true],
  ['Nº chefes', 'efetivo_chefes', false, true],
  ['Nº agentes', 'efetivo_agentes', false, true],
  ['Serviço remunerado', 'servico_remunerado'],
  ['Justificação', 'justificacao', true],
  ['Observações', 'observacao', true],
];

const blank = (today: Date): ReportForm => ({
  report_date: today.toISOString().slice(0, 10),
  report_hour: today.toTimeString().slice(0, 5),
  graduado_nome: '',
  graduado_matricula: '',
  graduado_radio: '',
  efetivo_oficiais: '0',
  efetivo_chefes: '0',
  efetivo_agentes: '0',
  servico_remunerado: 'Não',
  justificacao: '',
  observacao: '',
});

// ─── Small list-item editors ───────────────────────────────────────────────

function PersonRow({
  item, onChange, onDelete,
}: {
  item: ReportPersonItem;
  onChange: (v: ReportPersonItem) => void;
  onDelete: () => void;
}) {
  return (
    <View style={s.listRow}>
      <View style={{ flex: 1 }}>
        <TextInput
          style={s.listInput}
          placeholder="Nome"
          placeholderTextColor="#94a3b8"
          value={item.nome}
          onChangeText={(v) => onChange({ ...item, nome: v })}
        />
        <TextInput
          style={[s.listInput, { marginTop: 4 }]}
          placeholder="Matrícula"
          placeholderTextColor="#94a3b8"
          value={item.matricula ?? ''}
          onChangeText={(v) => onChange({ ...item, matricula: v })}
        />
      </View>
      <TouchableOpacity onPress={onDelete} style={s.listDelete}>
        <Ionicons name="close-circle" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
}

function ExpedienteRow({
  item, onChange, onDelete,
}: {
  item: ReportExpedienteItem;
  onChange: (v: ReportExpedienteItem) => void;
  onDelete: () => void;
}) {
  const f = (key: keyof ReportExpedienteItem, placeholder: string) => (
    <TextInput
      style={[s.listInput, { marginTop: 4 }]}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      value={(item[key] as string) ?? ''}
      onChangeText={(v) => onChange({ ...item, [key]: v })}
    />
  );
  return (
    <View style={s.listRow}>
      <View style={{ flex: 1 }}>
        {f('tipificacao', 'Tipificação *')}
        {f('hora', 'Hora')}
        {f('local', 'Local')}
        {f('nuipc', 'NUIPC')}
        {f('npp', 'NPP')}
        {f('nome', 'Nome envolvido')}
        {f('matricula', 'Matrícula envolvido')}
      </View>
      <TouchableOpacity onPress={onDelete} style={s.listDelete}>
        <Ionicons name="close-circle" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main modal ────────────────────────────────────────────────────────────

export function ReportModal({ visible, onClose }: Props) {
  const today = new Date();
  const [form, setForm] = useState<ReportForm>(() => blank(today));
  const [expediente, setExpediente] = useState<ReportExpedienteItem[]>([]);
  const [contactados, setContactados] = useState<ReportPersonItem[]>([]);
  const [demais, setDemais] = useState<ReportPersonItem[]>([]);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setForm(blank(new Date()));
    setExpediente([]);
    setContactados([]);
    setDemais([]);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!form.graduado_nome.trim() || !form.graduado_matricula.trim()) {
      toast.error('Preenche o nome e matrícula do graduado');
      return;
    }
    setLoading(true);
    try {
      const payload: GenerateReportRequest = {
        ...form,
        efetivo_oficiais: parseInt(form.efetivo_oficiais) || 0,
        efetivo_chefes: parseInt(form.efetivo_chefes) || 0,
        efetivo_agentes: parseInt(form.efetivo_agentes) || 0,
        expediente_efetuado: expediente,
        contactados,
        demais_efetivo: demais,
        format: 'docx',
      };
      const blob = await generateReport(payload);
      await downloadDocx(blob, `relatorio_${form.report_date}.docx`);
      toast.success('Relatório gerado');
      handleClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const addExpediente = () =>
    setExpediente((prev) => [...prev, { tipificacao: '', hora: '', local: '', nuipc: '', npp: '', nome: '', matricula: '' }]);
  const addContactado = () => setContactados((prev) => [...prev, { nome: '', matricula: '' }]);
  const addDemais = () => setDemais((prev) => [...prev, { nome: '', matricula: '' }]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.header}>
              <Text style={s.title}>Relatório de Serviço</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── Scalar fields ── */}
              {SCALAR_FIELDS.map(([label, key, multiline, numeric]) => (
                <View key={key} style={s.field}>
                  <Text style={s.label}>{label}</Text>
                  <TextInput
                    style={s.input}
                    value={form[key]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    placeholderTextColor="#94a3b8"
                    multiline={!!multiline}
                    numberOfLines={multiline ? 3 : 1}
                    keyboardType={numeric ? 'numeric' : 'default'}
                  />
                </View>
              ))}

              {/* ── Expediente efetuado ── */}
              <View style={s.listSection}>
                <View style={s.listHeader}>
                  <Text style={s.listTitle}>Expediente efetuado</Text>
                  <TouchableOpacity onPress={addExpediente} style={s.addBtn}>
                    <Ionicons name="add" size={16} color="#6366F1" />
                    <Text style={s.addBtnText}>Adicionar</Text>
                  </TouchableOpacity>
                </View>
                {expediente.map((item, i) => (
                  <ExpedienteRow
                    key={i}
                    item={item}
                    onChange={(v) => setExpediente((prev) => prev.map((x, j) => j === i ? v : x))}
                    onDelete={() => setExpediente((prev) => prev.filter((_, j) => j !== i))}
                  />
                ))}
                {expediente.length === 0 && <Text style={s.emptyHint}>Sem registos</Text>}
              </View>

              {/* ── Contactados ── */}
              <View style={s.listSection}>
                <View style={s.listHeader}>
                  <Text style={s.listTitle}>Contactados</Text>
                  <TouchableOpacity onPress={addContactado} style={s.addBtn}>
                    <Ionicons name="add" size={16} color="#6366F1" />
                    <Text style={s.addBtnText}>Adicionar</Text>
                  </TouchableOpacity>
                </View>
                {contactados.map((item, i) => (
                  <PersonRow
                    key={i}
                    item={item}
                    onChange={(v) => setContactados((prev) => prev.map((x, j) => j === i ? v : x))}
                    onDelete={() => setContactados((prev) => prev.filter((_, j) => j !== i))}
                  />
                ))}
                {contactados.length === 0 && <Text style={s.emptyHint}>Sem registos</Text>}
              </View>

              {/* ── Demais efetivo ── */}
              <View style={s.listSection}>
                <View style={s.listHeader}>
                  <Text style={s.listTitle}>Demais efetivo</Text>
                  <TouchableOpacity onPress={addDemais} style={s.addBtn}>
                    <Ionicons name="add" size={16} color="#6366F1" />
                    <Text style={s.addBtnText}>Adicionar</Text>
                  </TouchableOpacity>
                </View>
                {demais.map((item, i) => (
                  <PersonRow
                    key={i}
                    item={item}
                    onChange={(v) => setDemais((prev) => prev.map((x, j) => j === i ? v : x))}
                    onDelete={() => setDemais((prev) => prev.filter((_, j) => j !== i))}
                  />
                ))}
                {demais.length === 0 && <Text style={s.emptyHint}>Sem registos</Text>}
              </View>

              <View style={{ height: 16 }} />
            </ScrollView>

            <TouchableOpacity
              style={[s.submit, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.submitText}>Gerar e descarregar (.docx)</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '92%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  field: { marginBottom: 10 },
  label: { fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc',
  },
  listSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listTitle: { fontSize: 13, fontWeight: '700', color: '#334155' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#eef2ff' },
  addBtnText: { fontSize: 13, color: '#6366F1', fontWeight: '600' },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10, backgroundColor: '#f8fafc', borderRadius: 10, padding: 10 },
  listInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: '#0f172a', backgroundColor: '#fff',
  },
  listDelete: { paddingTop: 4 },
  emptyHint: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  submit: { backgroundColor: '#6366F1', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
