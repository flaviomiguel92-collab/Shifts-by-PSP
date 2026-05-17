import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Shift } from '../../types';
import { formatDate } from '../../utils/helpers';

interface DayContextPopupProps {
  visible: boolean;
  day: string;
  anchor: { x: number; y: number };
  shift: Shift | null;
  shiftColor: string;
  shiftName: string;
  gratifiedCount: number;
  onClose: () => void;
  onAddShift: () => void;
  onEditShift: () => void;
  onAddGratified: () => void;
  onAddEvent: () => void;
}

const POPUP_W = 224;
const POPUP_H = 152;
const POPUP_H_WITH_GRAT = 172;
const ARROW_W = 9;
const ARROW_H = 8;
const MARGIN = 10;
const CARD_BG = '#0B1120';
const GAP = 2;

export function DayContextPopup({
  visible,
  day,
  anchor,
  shift,
  shiftColor,
  shiftName,
  gratifiedCount,
  onClose,
  onAddShift,
  onEditShift,
  onAddGratified,
  onAddEvent,
}: DayContextPopupProps) {
  const { width: sw, height: sh } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 220,
        friction: 14,
      }).start();
    }
  }, [visible, anim]);

  if (!visible) return null;

  const popupH = gratifiedCount > 0 ? POPUP_H_WITH_GRAT : POPUP_H;
  const popupLeft = Math.min(
    Math.max(anchor.x - POPUP_W / 2, MARGIN),
    sw - POPUP_W - MARGIN,
  );
  const isAbove = anchor.y > sh * 0.42;
  const popupTop = isAbove
    ? anchor.y - popupH - ARROW_H - GAP
    : anchor.y + ARROW_H + GAP;
  const arrowTop = isAbove ? popupTop + popupH : popupTop - ARROW_H;
  const arrowLeft = Math.min(
    Math.max(anchor.x - ARROW_W, MARGIN + 4),
    sw - ARROW_W * 2 - MARGIN,
  );
  const dateLabel = day ? formatDate(day, 'EEEE, d MMM') : '';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
        {/* Arrow — decorative, no pointer events */}
        <View
          pointerEvents="none"
          style={[
            isAbove ? styles.arrowDown : styles.arrowUp,
            { position: 'absolute', top: arrowTop, left: arrowLeft },
          ]}
        />

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            {
              left: popupLeft,
              top: popupTop,
              opacity: anim,
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.88, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable onPress={() => {}}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.dateLabel}>{dateLabel}</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={15} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Shift row — tapping edits existing or opens picker for new */}
            <TouchableOpacity
              style={styles.shiftRow}
              onPress={shift ? onEditShift : onAddShift}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.shiftDot,
                  { backgroundColor: shift ? shiftColor : '#374151' },
                ]}
              />
              <View style={{ flex: 1 }}>
                {shift ? (
                  <>
                    <Text style={styles.shiftName}>{shiftName}</Text>
                    {(shift.start_time || shift.end_time) && (
                      <Text style={styles.shiftTime}>
                        {[shift.start_time, shift.end_time].filter(Boolean).join(' – ')}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.noShift}>Sem turno</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={13} color="#374151" />
            </TouchableOpacity>

            {gratifiedCount > 0 && (
              <View style={styles.gratRow}>
                <Ionicons name="star-sharp" size={11} color="#F59E0B" />
                <Text style={styles.gratText}>
                  {gratifiedCount} gratificado{gratifiedCount > 1 ? 's' : ''}
                </Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={onAddShift}
                activeOpacity={0.75}
              >
                <Ionicons name="calendar-outline" size={14} color="#60A5FA" />
                <Text style={styles.actionLabel}>Turno</Text>
              </TouchableOpacity>
              <View style={styles.sep} />
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={onAddGratified}
                activeOpacity={0.75}
              >
                <Ionicons name="cash-outline" size={14} color="#34D399" />
                <Text style={styles.actionLabel}>Grat.</Text>
              </TouchableOpacity>
              <View style={styles.sep} />
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={onAddEvent}
                activeOpacity={0.75}
              >
                <Ionicons name="shield-outline" size={14} color="#A78BFA" />
                <Text style={styles.actionLabel}>Ocorr.</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: POPUP_W,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 20,
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_W,
    borderRightWidth: ARROW_W,
    borderTopWidth: ARROW_H,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: CARD_BG,
  },
  arrowUp: {
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_W,
    borderRightWidth: ARROW_W,
    borderBottomWidth: ARROW_H,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: CARD_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
    textTransform: 'capitalize',
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  shiftDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  shiftName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  shiftTime: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  noShift: {
    fontSize: 13,
    color: '#475569',
  },
  gratRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 9,
  },
  gratText: {
    fontSize: 11,
    color: '#78350F',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 2,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 3,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  sep: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 8,
  },
});
