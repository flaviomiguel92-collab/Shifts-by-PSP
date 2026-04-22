import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ScrollView, SafeAreaView, Platform } from 'react-native';
import { useDataStore } from '../../src/store/dataStore';
import { HeaderWithBack } from '../../src/components/HeaderWithBack';
import { storage } from '../../src/utils/storage';

type ResetScope = 'calendar' | 'gratified' | 'occurrences' | 'all';
const RAW_API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://shifts-by-psp.onrender.com';

const buildOccurrencesEndpoint = () => {
  const normalized = RAW_API_URL.endsWith('/api')
    ? RAW_API_URL.slice(0, -4)
    : RAW_API_URL;

  return `${normalized}/api/occurrences`;
};

export default function ProfileScreen() {
  const store = useDataStore() as any;
  const {
    shiftTypes,
    deleteShiftType,
    resetData,
    resetCalendarData,
    resetGratifiedData,
    resetOccurrencesData,
    gratifiedConfig,
    setGratifiedConfig,
    gratifiedTemplates,
    deleteGratifiedTemplate,
  } = store;

  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [isResetExpanded, setIsResetExpanded] = useState(false);
  const [activeReset, setActiveReset] = useState<ResetScope | null>(null);
  const [cfg, setCfg] = useState({
    baseSmall4h: String(gratifiedConfig?.baseSmall4h ?? ''),
    baseLarge4h: String(gratifiedConfig?.baseLarge4h ?? ''),
    fractionSmallPerHour: String(gratifiedConfig?.fractionSmallPerHour ?? ''),
    fractionLargePerHour: String(gratifiedConfig?.fractionLargePerHour ?? ''),
    discountPercent: String(gratifiedConfig?.discountPercent ?? ''),
    smallStart: String(gratifiedConfig?.smallStart ?? ''),
    smallEnd: String(gratifiedConfig?.smallEnd ?? ''),
    largeStart: String(gratifiedConfig?.largeStart ?? ''),
    largeEnd: String(gratifiedConfig?.largeEnd ?? ''),
  });

  const resetOptions = useMemo(
    () => [
      {
        key: 'calendar' as ResetScope,
        title: 'Calendário',
        description: 'Apaga turnos, tipos de turno, gratificações e ciclos.',
        buttonLabel: 'Resetar Calendário',
      },
      {
        key: 'gratified' as ResetScope,
        title: 'Gratificados',
        description: 'Apaga templates, entradas e configurações de gratificados.',
        buttonLabel: 'Resetar Gratificados',
      },
      {
        key: 'occurrences' as ResetScope,
        title: 'Ocorrências',
        description: 'Apaga as ocorrências do backend e do estado local.',
        buttonLabel: 'Resetar Ocorrências',
      },
      {
        key: 'all' as ResetScope,
        title: 'Tudo',
        description: 'Apaga todos os dados da aplicação neste perfil.',
        buttonLabel: 'Resetar Tudo',
      },
    ],
    []
  );

  const purgeOccurrencesFromApi = async () => {
    const token = await storage.getItem('session_token');
    const occurrencesEndpoint = buildOccurrencesEndpoint();

    const listResponse = await fetch(occurrencesEndpoint, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });

    if (!listResponse.ok) {
      throw new Error(`Falha ao listar ocorrências (HTTP ${listResponse.status})`);
    }

    const occurrences = await listResponse.json();
    if (!Array.isArray(occurrences) || occurrences.length === 0) return;

    await Promise.all(
      occurrences.map(async (occ: { id?: string }) => {
        if (!occ?.id) return;
        const deleteResponse = await fetch(`${occurrencesEndpoint}/${occ.id}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          throw new Error(`Falha ao apagar ocorrência ${occ.id} (HTTP ${deleteResponse.status})`);
        }
      })
    );
  };

  const executeReset = async (scope: ResetScope) => {
    setActiveReset(scope);
    try {
      let remoteWarning: string | null = null;

      if (scope === 'calendar') {
        await resetCalendarData();
      }

      if (scope === 'gratified') {
        await resetGratifiedData();
      }

      if (scope === 'occurrences') {
        try {
          await purgeOccurrencesFromApi();
        } catch (error) {
          console.error('Remote occurrences purge error:', error);
          remoteWarning = 'Ocorrências locais limpas, mas não foi possível limpar todas no servidor.';
        }
        await resetOccurrencesData();
      }

      if (scope === 'all') {
        try {
          await purgeOccurrencesFromApi();
        } catch (error) {
          console.error('Remote occurrences purge error:', error);
          remoteWarning = 'Dados locais limpos, mas não foi possível limpar todas as ocorrências no servidor.';
        }
        await resetData();
      }

      if (remoteWarning) {
        Alert.alert('Concluído com aviso', remoteWarning);
      } else {
        Alert.alert('Sucesso', 'Dados apagados com sucesso.');
      }
    } catch (error) {
      console.error('Reset error:', error);
      Alert.alert('Erro', 'Não foi possível concluir o reset.');
    } finally {
      setActiveReset(null);
    }
  };

  const confirmReset = (scope: ResetScope) => {
    const labels: Record<ResetScope, string> = {
      calendar: 'Calendário',
      gratified: 'Gratificados',
      occurrences: 'Ocorrências',
      all: 'Tudo',
    };

    // Em Web, Alert.alert pode não executar callbacks de botões de forma consistente
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined'
        ? window.confirm(`Tens a certeza que queres apagar os dados de ${labels[scope]}? Esta ação não pode ser desfeita.`)
        : false;

      if (confirmed) {
        executeReset(scope);
      }
      return;
    }

    Alert.alert(
      `Resetar ${labels[scope]}`,
      `Tens a certeza que queres apagar os dados de ${labels[scope]}? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar reset',
          style: 'destructive',
          onPress: () => executeReset(scope),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
      <HeaderWithBack title="Perfil" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>

      <Text style={{ color: 'white', fontSize: 20, marginBottom: 10, marginTop: 10 }}>
        Limpar Dados / Reset
      </Text>

      <TouchableOpacity
        onPress={() => setIsResetExpanded((prev) => !prev)}
        style={{
          backgroundColor: '#1F2937',
          padding: 12,
          borderRadius: 12,
          marginBottom: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(239, 68, 68, 0.35)',
        }}
      >
        <Text style={{ color: '#FCA5A5', fontWeight: '700' }}>
          {isResetExpanded ? '▼' : '▶'} Opções de Reset
        </Text>
      </TouchableOpacity>

      {isResetExpanded && (
        <View
          style={{
            backgroundColor: '#1F2937',
            borderRadius: 12,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.35)',
            padding: 12,
            gap: 10,
          }}
        >
          {resetOptions.map((option) => {
            const isLoading = activeReset === option.key;
            return (
              <View
                key={option.key}
                style={{
                  backgroundColor: '#111827',
                  borderRadius: 10,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#374151',
                }}
              >
                <Text style={{ color: '#F9FAFB', fontWeight: '700', marginBottom: 6 }}>{option.title}</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 10 }}>{option.description}</Text>

                <TouchableOpacity
                  onPress={() => confirmReset(option.key)}
                  disabled={!!activeReset}
                  style={{
                    backgroundColor: isLoading ? '#7F1D1D' : '#DC2626',
                    padding: 10,
                    borderRadius: 8,
                    opacity: activeReset && !isLoading ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
                    {isLoading ? 'A processar...' : option.buttonLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      <Text style={{ color: 'white', fontSize: 20, marginBottom: 10, marginTop: 10 }}>
        Configurações de Gratificados
      </Text>

      <TouchableOpacity
        onPress={() => setIsConfigExpanded(!isConfigExpanded)}
        style={{
          backgroundColor: '#1F2937',
          padding: 12,
          borderRadius: 12,
          marginBottom: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {isConfigExpanded ? '▼' : '▶'} Mostrar Configurações
        </Text>
      </TouchableOpacity>

      {isConfigExpanded && (
        <View style={{ backgroundColor: '#1F2937', padding: 12, borderRadius: 12, marginBottom: 20 }}>
          {[
            { key: 'baseSmall4h', label: 'Gratificado Pequeno (base 4h) €' },
            { key: 'baseLarge4h', label: 'Gratificado Grande (base 4h) €' },
            { key: 'fractionSmallPerHour', label: 'Fração Pequena (por hora) €' },
            { key: 'fractionLargePerHour', label: 'Fração Grande (por hora) €' },
            { key: 'discountPercent', label: 'Desconto aplicado %' },
            { key: 'smallStart', label: 'Horário Pequeno início (HH:MM)' },
            { key: 'smallEnd', label: 'Horário Pequeno fim (HH:MM)' },
            { key: 'largeStart', label: 'Horário Grande início (HH:MM)' },
            { key: 'largeEnd', label: 'Horário Grande fim (HH:MM)' },
          ].map((f) => (
            <View key={f.key} style={{ marginBottom: 10 }}>
              <Text style={{ color: '#9CA3AF', marginBottom: 6, fontSize: 12, fontWeight: '600' }}>
                {f.label}
              </Text>
              <TextInput
                placeholderTextColor="#6B7280"
                value={(cfg as any)[f.key]}
                onChangeText={(v) => setCfg((prev) => ({ ...prev, [f.key]: v }))}
                style={{
                  backgroundColor: '#111827',
                  color: 'white',
                  padding: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#374151',
                }}
                keyboardType={f.key.includes('Start') || f.key.includes('End') ? 'default' : 'numeric'}
              />
            </View>
          ))}

          <TouchableOpacity
            onPress={() => {
              setGratifiedConfig({
                baseSmall4h: Number(cfg.baseSmall4h),
                baseLarge4h: Number(cfg.baseLarge4h),
                fractionSmallPerHour: Number(cfg.fractionSmallPerHour),
                fractionLargePerHour: Number(cfg.fractionLargePerHour),
                discountPercent: Number(cfg.discountPercent),
                smallStart: cfg.smallStart,
                smallEnd: cfg.smallEnd,
                largeStart: cfg.largeStart,
                largeEnd: cfg.largeEnd,
              });
              Alert.alert('OK', 'Configurações guardadas.');
            }}
            style={{
              backgroundColor: '#10B981',
              padding: 12,
              borderRadius: 8,
              marginTop: 6,
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '800' }}>Guardar Configurações</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={{ color: 'white', fontSize: 20, marginBottom: 10 }}>
        Gratificados guardados (nomes)
      </Text>
      <View style={{ backgroundColor: '#1F2937', padding: 12, borderRadius: 12, marginBottom: 20 }}>
        {gratifiedTemplates?.length === 0 ? (
          <Text style={{ color: '#6B7280' }}>Ainda não tens gratificados guardados.</Text>
        ) : (
          gratifiedTemplates.map((t: any) => (
            <View
              key={t.name}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: '#374151',
              }}
            >
              <Text style={{ color: '#D1D5DB', fontWeight: '700' }}>{t.name}</Text>
              <TouchableOpacity onPress={() => deleteGratifiedTemplate(t.name)}>
                <Text style={{ color: '#EF4444', fontWeight: '700' }}>Apagar</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <FlatList
        data={shiftTypes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: '#1F2937',
              padding: 12,
              borderRadius: 8,
              marginBottom: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: 'white' }}>{item.name}</Text>

            <TouchableOpacity onPress={() => deleteShiftType(item.id)}>
              <Text style={{ color: 'red' }}>Apagar</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </ScrollView>
    </SafeAreaView>
  );
}
