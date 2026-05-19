import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../../utils/helpers';
import { useTheme } from '../../theme/themes';

export type DayItemKind = 'shift' | 'event' | 'grat';

export interface DayItem {
  id: string;
  kind: DayItemKind;
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  time?: string;
  trailing?: string;
}

interface DayPopoverProps {
  visible: boolean;
  day: string; // YYYY-MM-DD
  items: DayItem[];
  onClose: () => void;
  onAddShift: () => void;
  onAddEvent: () => void;
  onAddGrat: () => void;
  onOpenItem: (item: DayItem) => void;
}

export function DayPopover({
  visible,
  day,
  items,
  onClose,
  onAddShift,
  onAddEvent,
  onAddGrat,
  onOpenItem,
}: DayPopoverProps) {
  const t = useTheme();
  const isLight = !t.isDark;
  if (!visible) return null;
  const weekday = day ? formatDate(day, 'EEEE') : '';
  const dayMain = day ? formatDate(day, "d 'de' MMMM") : '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            isLight && { backgroundColor: t.surfaceAlt, borderColor: t.borderStrong, shadowOpacity: 0.18 },
          ]}
          onPress={() => {}}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.weekday, isLight && { color: t.textMuted }]}>{weekday}</Text>
              <Text style={[styles.dayMain, isLight && { color: t.textPrimary }]}>{dayMain}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, isLight && { backgroundColor: 'rgba(15,23,42,0.06)' }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={isLight ? t.textSecondary : 'rgba(255,255,255,0.8)'} />
            </TouchableOpacity>
          </View>

          {items.length > 0 ? (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {items.map((item) => (
                <TouchableOpacity
                  key={`${item.kind}-${item.id}`}
                  style={[styles.itemRow, isLight && { borderBottomColor: t.border }]}
                  onPress={() => onOpenItem(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.itemIcon, { backgroundColor: item.color }]}>
                    <Ionicons name={item.iconName} size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, isLight && { color: t.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                    {!!item.time && <Text style={[styles.itemTime, isLight && { color: t.textMuted }]}>{item.time}</Text>}
                  </View>
                  <Text style={[styles.itemTrailing, isLight && { color: t.textMuted }]}>{item.trailing || '›'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={[styles.empty, isLight && { color: t.textMuted }]}>Sem registos neste dia</Text>
          )}

          <View style={[styles.actions, isLight && { borderTopColor: t.border }]}>
            <ActionBtn icon="calendar-outline" label="Turno" color="#60A5FA" onPress={onAddShift} labelColor={isLight ? t.textSecondary : '#94A3B8'} />
            <View style={[styles.sep, isLight && { backgroundColor: t.border }]} />
            <ActionBtn icon="reader-outline" label="Evento" color="#A78BFA" onPress={onAddEvent} labelColor={isLight ? t.textSecondary : '#94A3B8'} />
            <View style={[styles.sep, isLight && { backgroundColor: t.border }]} />
            <ActionBtn icon="cash-outline" label="Grat." color="#34D399" onPress={onAddGrat} labelColor={isLight ? t.textSecondary : '#94A3B8'} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ActionBtn({
  icon, label, color, onPress, labelColor,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; onPress: () => void; labelColor?: string }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.actionLabel, labelColor && { color: labelColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#0B1120',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.22)',
    paddingVertical: 16,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  weekday: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  dayMain: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: 12 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { color: '#F1F5F9', fontSize: 16, fontWeight: '600' },
  itemTime: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 1 },
  itemTrailing: { color: 'rgba(255,255,255,0.55)', fontSize: 14 },
  empty: {
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    paddingVertical: 22,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    marginTop: 8,
    paddingTop: 6,
    marginHorizontal: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  actionLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  sep: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 10 },
});
