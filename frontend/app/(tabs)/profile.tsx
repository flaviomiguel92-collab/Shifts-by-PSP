import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ScrollView, SafeAreaView } from 'react-native';
import { useDataStore } from '../../src/store/dataStore';
import { HeaderWithBack } from '../../src/components/HeaderWithBack';

export default function ProfileScreen() {
  const {
    shiftTypes,
    createShiftType,
    deleteShiftType,
    resetData,
    gratifiedConfig,
    setGratifiedConfig,
    gratifiedTemplates,
    deleteGratifiedTemplate,
  } = useDataStore();

  const [name, setName] = useState('');
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
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

  const handleAdd = () => {
    if (!name.trim()) return;

    createShiftType({
      name,
      color: '#3B82F6',
      startTime: '08:00',
      endTime: '16:00',
    });

    setName('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
      <HeaderWithBack title="Perfil" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      
      <Text style={{ color: 'white', fontSize: 20, marginBottom: 10 }}>
        Criar Turno
      </Text>

      <TextInput
        placeholder="Nome do turno"
        placeholderTextColor="#6B7280"
        value={name}
        onChangeText={setName}
        style={{
          backgroundColor: '#1F2937',
          color: 'white',
          padding: 10,
          borderRadius: 8,
          marginBottom: 10,
        }}
      />

      <TouchableOpacity
        onPress={handleAdd}
        style={{
          backgroundColor: '#3B82F6',
          padding: 12,
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          Adicionar Turno
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            'Limpar dados',
            'Isto vai remover turnos, tipos de turno, extras e ciclos guardados neste dispositivo. Queres continuar?',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Limpar',
                style: 'destructive',
                onPress: () => resetData(),
              },
            ]
          );
        }}
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          borderColor: 'rgba(239, 68, 68, 0.35)',
          borderWidth: 1,
          padding: 12,
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: '#EF4444', textAlign: 'center', fontWeight: '700' }}>
          Limpar dados (reset)
        </Text>
      </TouchableOpacity>

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