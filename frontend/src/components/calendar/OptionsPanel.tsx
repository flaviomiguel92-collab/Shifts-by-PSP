import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable,
  ScrollView, Animated,
} from 'react-native';
import { format } from 'date-fns';
import { Cycle } from '../../store/dataStore';
import { getThemeColors } from '../../theme/themes';

interface OptionsPanelProps {
  visible: boolean;
  isLight: boolean;
  t: ReturnType<typeof getThemeColors>;
  editMode: string;
  cycles: Cycle[];
  selectedCycle: { id: string; name: string; pattern: string[] } | null;
  cycleStartDate: string | null;
  optionsPanelAnim: Animated.Value;
  onClose: () => void;
  onNewCycle: () => void;
  onCyclePress: (cycle: Cycle) => void;
  onCycleLongPress: (cycle: Cycle) => void;
}

export function OptionsPanel({
  visible, isLight, t, editMode, cycles, selectedCycle,
  cycleStartDate, optionsPanelAnim, onClose, onNewCycle,
  onCyclePress, onCycleLongPress,
}: OptionsPanelProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.optionsOverlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.optionsPanelFloating,
            isLight && { backgroundColor: t.surfaceAlt, borderColor: t.borderStrong },
            {
              opacity: optionsPanelAnim,
              transform: [
                {
                  translateY: optionsPanelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
                {
                  scale: optionsPanelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable onPress={() => {}}>
            <View style={styles.optionsHandle} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.optionsPanelContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.optionsPanelSection}>
                <Text style={[styles.optionsSectionTitle, isLight && { color: t.textPrimary }]}>Ciclos</Text>
                <Text style={[styles.quickBarTitle, isLight && { color: t.textMuted }]}>
                  Seleciona um ciclo, depois toca no dia inicial e no final
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.cycleButtons}>
                    <TouchableOpacity
                      style={[styles.cycleBtn, { backgroundColor: '#10B981' }]}
                      activeOpacity={0.8}
                      onPress={onNewCycle}
                    >
                      <Text style={[styles.cycleBtnText, { color: '#FFFFFF' }]}>+ Novo</Text>
                    </TouchableOpacity>

                    {cycles.map((cycle) => (
                      <TouchableOpacity
                        key={cycle.id}
                        activeOpacity={0.8}
                        style={[
                          styles.cycleBtn,
                          isLight && { backgroundColor: t.bg, borderWidth: 0.5, borderColor: t.border },
                          selectedCycle?.id === cycle.id && styles.cycleBtnActive,
                        ]}
                        onPress={() => onCyclePress(cycle)}
                        onLongPress={() => onCycleLongPress(cycle)}
                      >
                        <Text style={[
                          styles.cycleBtnText,
                          isLight && selectedCycle?.id !== cycle.id && { color: t.textSecondary },
                          selectedCycle?.id === cycle.id && styles.cycleBtnTextActive,
                        ]}>
                          {cycle.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                {editMode === 'cycle_start' && (
                  <Text style={styles.modeHint}>
                    ✓ Ciclo selecionado! Agora toca no DIA INICIAL
                  </Text>
                )}
                {editMode === 'cycle_end' && cycleStartDate && (
                  <Text style={styles.modeHintGreen}>
                    ✓ Início: {format(new Date(cycleStartDate + 'T12:00:00'), 'dd/MM')} - Agora toca no DIA FINAL
                  </Text>
                )}
              </View>
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    justifyContent: 'flex-start',
    paddingTop: 66,
    paddingHorizontal: 12,
    zIndex: 40,
  },
  optionsPanelFloating: {
    backgroundColor: 'rgba(11, 17, 32, 0.85)',
    borderRadius: 16,
    padding: 12,
    width: '100%',
    maxHeight: '60%',
    borderWidth: 0.5,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    zIndex: 50,
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  optionsHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#4B5563',
    alignSelf: 'center',
    marginBottom: 10,
  },
  optionsPanelContent: {
    paddingBottom: 8,
  },
  optionsPanelSection: {
    marginBottom: 12,
  },
  optionsSectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E5E7EB',
    marginBottom: 8,
  },
  quickBarTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 8,
  },
  cycleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cycleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    minHeight: 42,
    justifyContent: 'center',
  },
  cycleBtnActive: {
    backgroundColor: '#3B82F6',
  },
  cycleBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  cycleBtnTextActive: {
    color: '#FFFFFF',
  },
  modeHint: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 10,
    fontWeight: '500',
  },
  modeHintGreen: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 10,
    fontWeight: '500',
  },
});
