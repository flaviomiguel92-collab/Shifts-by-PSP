import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShiftTypeConfig } from '../../types';

interface PaintModeBarProps {
  visible: boolean;
  shiftTypes: ShiftTypeConfig[];
  selectedType: string | null;
  onSelectType: (name: string) => void;
  onExit: () => void;
}

const BOTTOM = Platform.OS === 'ios' ? 100 : 86;
// Distância de entrada: altura aproximada da barra + o offset `bottom`,
// garantindo que o ponto de partida está totalmente fora do ecrã.
const ENTER_OFFSET = 180;

export function PaintModeBar({
  visible,
  shiftTypes,
  selectedType,
  onSelectType,
  onExit,
}: PaintModeBarProps) {
  // Mantém o componente montado durante a animação de saída e desmonta-o
  // por completo no fim — assim, quando inativo, não existe nada no ecrã
  // que se possa sobrepor à tab bar nem interceptar toques.
  const [mounted, setMounted] = useState(visible);
  const slideAnim = useRef(new Animated.Value(ENTER_OFFSET)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(slideAnim, {
        toValue: ENTER_OFFSET,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, mounted, slideAnim]);

  if (!mounted) return null;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.exitBtn} onPress={onExit} activeOpacity={0.8}>
            <Ionicons name="close" size={14} color="#F1F5F9" />
            <Text style={styles.exitBtnText}>Sair</Text>
          </TouchableOpacity>
          <View style={styles.paintLabel}>
            <Ionicons name="brush-outline" size={14} color="#60A5FA" />
            <Text style={styles.paintLabelText}>Modo pintura</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          {shiftTypes.map((st) => {
            const active = selectedType === st.name;
            return (
              <TouchableOpacity
                key={st.id}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: st.color, borderColor: st.color }
                    : { borderColor: st.color + '55' },
                ]}
                onPress={() => onSelectType(st.name)}
                activeOpacity={0.75}
              >
                {!active && <View style={[styles.chipDot, { backgroundColor: st.color }]} />}
                <Text style={[styles.chipText, active && { color: '#fff', fontWeight: '700' }]}>
                  {st.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          {shiftTypes.length === 0 && (
            <Text style={styles.emptyText}>Sem tipos de turno</Text>
          )}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: BOTTOM,
    left: 0,
    right: 0,
    zIndex: 200,
  },
  inner: {
    marginHorizontal: 10,
    backgroundColor: '#0B1120',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 40,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  paintLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paintLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60A5FA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  exitBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  emptyText: {
    fontSize: 12,
    color: '#4B5563',
    paddingVertical: 6,
  },
});
