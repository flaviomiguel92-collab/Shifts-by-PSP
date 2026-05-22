import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../theme/themes';

interface Props {
  visible: boolean;
  selectedCount: number;
  isLight: boolean;
  t: ThemeColors;
  onApply: () => void;
  onCancel: () => void;
}

export function MultiSelectBar({ visible, selectedCount, isLight, t, onApply, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={{ flex: 1 }} pointerEvents="box-none">
        <View
          style={[styles.bar, isLight && { backgroundColor: t.surfaceAlt, borderColor: t.borderStrong }]}
          pointerEvents="auto"
        >
          <View style={styles.info}>
            <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
            <Text style={[styles.count, isLight && { color: t.textPrimary }]}>
              {selectedCount} {selectedCount === 1 ? 'dia' : 'dias'} selecionado{selectedCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyBtn, selectedCount === 0 && { opacity: 0.4 }]}
              onPress={() => selectedCount > 0 && onApply()}
            >
              <Ionicons name="color-wand-outline" size={14} color="#fff" />
              <Text style={styles.applyText}>Aplicar Turno</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 86,
    left: 12,
    right: 12,
    backgroundColor: '#0B1120',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 50,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  count: {
    fontSize: 13,
    fontWeight: '500',
    color: '#F1F5F9',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(148,163,184,0.18)',
    borderWidth: 0.5,
    borderColor: 'rgba(148,163,184,0.26)',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
  },
  applyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
});
