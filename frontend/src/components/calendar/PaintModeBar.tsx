import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Modal,
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

const BAR_HEIGHT = 88;
const BOTTOM = Platform.OS === 'ios' ? 100 : 86;

export function PaintModeBar({
  visible,
  shiftTypes,
  selectedType,
  onSelectType,
  onExit,
}: PaintModeBarProps) {
  const slideAnim = useRef(new Animated.Value(BAR_HEIGHT)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : BAR_HEIGHT,
      useNativeDriver: true,
      tension: 200,
      friction: 20,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, slideAnim]);

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onExit}>
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
          pointerEvents="auto"
        >
          <View style={styles.inner}>
            <View style={styles.topRow}>
              <View style={styles.paintLabel}>
                <Ionicons name="brush-outline" size={14} color="#60A5FA" />
                <Text style={styles.paintLabelText}>Modo pintura</Text>
              </View>
              <TouchableOpacity style={styles.exitBtn} onPress={onExit} activeOpacity={0.8}>
                <Ionicons name="close" size={14} color="#F1F5F9" />
                <Text style={styles.exitBtnText}>Sair</Text>
              </TouchableOpacity>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  container: {
    position: 'absolute',
    bottom: BOTTOM,
    left: 0,
    right: 0,
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
    elevation: 16,
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
