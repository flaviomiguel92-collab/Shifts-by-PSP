import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface DetailRow {
  label: string;
  value: string;
}

interface DetailSheetProps {
  visible: boolean;
  accentColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
  kindLabel: string; // "Detalhe do turno" | "Detalhe do evento" | "Detalhe do gratificado"
  title: string;
  subtitle?: string;
  rows: DetailRow[];
  note?: string;
  removeLabel: string; // "Retirar turno deste dia" | "Eliminar evento" | "Eliminar gratificado"
  confirmMessage: string;
  onClose: () => void;
  onEdit?: () => void;
  onRemove: () => void;
}

export function DetailSheet({
  visible,
  accentColor,
  iconName,
  kindLabel,
  title,
  subtitle,
  rows,
  note,
  removeLabel,
  confirmMessage,
  onClose,
  onEdit,
  onRemove,
}: DetailSheetProps) {
  const handleRemove = () => {
    // RN Web's Alert.alert does not invoke button onPress callbacks.
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(confirmMessage)) onRemove();
      return;
    }
    // On native, the parent passes an onRemove that already confirms, or we
    // confirm here via the imported Alert. Keep it simple: delegate to parent.
    onRemove();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={[styles.header, { backgroundColor: accentColor }]}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name={iconName} size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.kindLabel}>{kindLabel}</Text>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {rows.map((r, i) => (
              <View key={i} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{r.label}</Text>
                <Text style={styles.infoValue}>{r.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.8}>
                <Text style={styles.editText}>Editar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.removeBtn, !onEdit && { flex: 1 }]}
              onPress={handleRemove}
              activeOpacity={0.85}
            >
              <Text style={styles.removeText}>{removeLabel}</Text>
            </TouchableOpacity>
          </View>

          {!!note && <Text style={styles.note}>{note}</Text>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    paddingBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 1 },
  body: { padding: 18, gap: 10 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  infoLabel: { color: '#9CA3AF' },
  infoValue: { color: '#F1F5F9', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 18 },
  editBtn: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  editText: { color: '#F1F5F9', fontWeight: '700' },
  removeBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  removeText: { color: '#FFFFFF', fontWeight: '800' },
  note: { color: '#64748B', fontSize: 12, textAlign: 'center', paddingHorizontal: 24, paddingTop: 14 },
});
