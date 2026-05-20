import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Platform, Modal, Animated, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDataStore } from '../store/dataStore';
import { useSearchStore } from '../utils/search';
import { formatCurrency } from '../utils/helpers';
import { useTheme } from '../theme/themes';

type ResultType = 'shift' | 'gratificado' | 'ocorrencia';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  meta: string;
  tab: string;
}

const TYPE_CONFIG: Record<ResultType, { icon: string; color: string; label: string }> = {
  shift:       { icon: 'calendar-outline',      color: '#3B82F6', label: 'Turno' },
  gratificado: { icon: 'cash-outline',          color: '#10B981', label: 'Gratificado' },
  ocorrencia:  { icon: 'document-text-outline', color: '#F59E0B', label: 'Ocorrência' },
};


export function SearchModal() {
  const th = useTheme();
  const isLight = !th.isDark;
  const router = useRouter();
  const { isOpen, close } = useSearchStore();
  const store = useDataStore() as any;
  const { shifts, gratifiedEntries, occurrences, shiftTypes } = store;

  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start(() => inputRef.current?.focus());
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      slideAnim.setValue(40);
    }
  }, [isOpen, fadeAnim, slideAnim]);

  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: SearchResult[] = [];

    // Shifts
    (shifts || []).forEach((s: any) => {
      const type = String(s.shift_type || '').toLowerCase();
      const date = String(s.date || '');
      if (type.includes(q) || date.includes(q)) {
        const st = (shiftTypes || []).find((t: any) => t.name === s.shift_type);
        out.push({
          id: `shift_${s.id}`,
          type: 'shift',
          title: s.shift_type || 'Turno',
          subtitle: date,
          meta: st?.start_time && st?.end_time ? `${st.start_time}–${st.end_time}` : '',
          tab: '/(tabs)/',
        });
      }
    });

    // Gratificados
    (gratifiedEntries || []).forEach((g: any) => {
      const name = String(g.name || '').toLowerCase();
      const date = String(g.date || '');
      if (name.includes(q) || date.includes(q)) {
        out.push({
          id: `grat_${g.id || g.name}_${g.date}`,
          type: 'gratificado',
          title: g.name || 'Gratificado',
          subtitle: date,
          meta: formatCurrency(Number(g.value || 0)),
          tab: '/(tabs)/gratificados',
        });
      }
    });

    // Occurrences
    (occurrences || []).forEach((o: any) => {
      const loc = String(o.location || '').toLowerCase();
      const desc = String(o.description || '').toLowerCase();
      const cls = String(o.classification || '').toLowerCase();
      const date = String(o.date || '');
      if (loc.includes(q) || desc.includes(q) || cls.includes(q) || date.includes(q)) {
        out.push({
          id: `occ_${o.id}`,
          type: 'ocorrencia',
          title: o.classification || 'Ocorrência',
          subtitle: `${date}${o.location ? ' · ' + o.location : ''}`,
          meta: o.status || '',
          tab: '/(tabs)/ocorrencias',
        });
      }
    });

    return out.slice(0, 40);
  }, [query, shifts, gratifiedEntries, occurrences, shiftTypes]);

  const grouped = useMemo(() => {
    const map: Partial<Record<ResultType, SearchResult[]>> = {};
    results.forEach(r => {
      if (!map[r.type]) map[r.type] = [];
      map[r.type]!.push(r);
    });
    return (['shift', 'gratificado', 'ocorrencia'] as ResultType[])
      .filter(t => map[t]?.length)
      .map(t => ({ type: t, items: map[t]! }));
  }, [results]);

  const handleSelect = (result: SearchResult) => {
    close();
    router.push(result.tab as any);
  };

  if (!isOpen) return null;

  return (
    <Modal transparent animationType="none" visible={isOpen} onRequestClose={close}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }, isLight && { backgroundColor: th.surfaceAlt, borderColor: th.borderStrong }]}>

          {/* Search input */}
          <View style={[styles.inputRow, isLight && { borderBottomColor: th.border }]}>
            <Ionicons name="search-outline" size={18} color={isLight ? th.textMuted : '#475569'} />
            <TextInput
              ref={inputRef}
              style={[styles.input, isLight && { color: th.textPrimary }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Pesquisar turnos, gratificados, ocorrências…"
              placeholderTextColor={isLight ? th.textMuted : '#334155'}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color="#475569" />
              </TouchableOpacity>
            )}
            {Platform.OS === 'web' && (
              <View style={styles.kbdHint}>
                <Text style={styles.kbdText}>ESC</Text>
              </View>
            )}
            <TouchableOpacity onPress={close} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Results */}
          {query.length >= 2 && results.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={32} color="#1E293B" />
              <Text style={[styles.emptyText, isLight && { color: th.textMuted }]}>Sem resultados para &quot;{query}&quot;</Text>
            </View>
          )}

          {query.length < 2 && (
            <View style={styles.hint}>
              <Text style={[styles.hintText, isLight && { color: th.textMuted }]}>Digite pelo menos 2 caracteres para pesquisar</Text>
              {Platform.OS === 'web' && (
                <View style={styles.shortcutRow}>
                  <View style={styles.kbdHint}><Text style={styles.kbdText}>⌘K</Text></View>
                  <Text style={styles.hintText}> ou </Text>
                  <View style={styles.kbdHint}><Text style={styles.kbdText}>Ctrl+K</Text></View>
                  <Text style={styles.hintText}> para abrir</Text>
                </View>
              )}
            </View>
          )}

          <FlatList
            data={grouped}
            keyExtractor={g => g.type}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: group }) => {
              const cfg = TYPE_CONFIG[group.type];
              return (
                <View>
                  <View style={[styles.groupHeader, isLight && { borderBottomColor: th.border }]}>
                    <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                    <Text style={[styles.groupLabel, { color: cfg.color }]}>{cfg.label}s</Text>
                    <Text style={styles.groupCount}>{group.items.length}</Text>
                  </View>
                  {group.items.map((item, i) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.resultRow, isLight && { borderBottomColor: th.border }, i === group.items.length - 1 && { borderBottomWidth: 0, marginBottom: 4 }]}
                      onPress={() => handleSelect(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.resultIcon, { backgroundColor: `${cfg.color}15` }]}>
                        <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                      </View>
                      <View style={styles.resultText}>
                        <Text style={[styles.resultTitle, isLight && { color: th.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[styles.resultSub, isLight && { color: th.textMuted }]} numberOfLines={1}>{item.subtitle}</Text>
                      </View>
                      {!!item.meta && (
                        <Text style={[styles.resultMeta, { color: cfg.color }]}>{item.meta}</Text>
                      )}
                      <Ionicons name="chevron-forward" size={14} color="#1E293B" />
                    </TouchableOpacity>
                  ))}
                </View>
              );
            }}
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
  },
  panel: {
    width: '100%',
    maxWidth: 640,
    backgroundColor: '#0B1120',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
    maxHeight: 540,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.22)',
  },
  input: {
    flex: 1,
    color: '#F1F5F9',
    fontSize: 15,
    padding: 0,
  },
  closeBtn: { padding: 2 },
  kbdHint: {
    backgroundColor: 'rgba(148,163,184,0.22)',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  kbdText: { color: '#475569', fontSize: 10, fontWeight: '600' },
  list: { maxHeight: 420 },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: { color: '#334155', fontSize: 13 },
  hint: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  hintText: { color: '#334155', fontSize: 12 },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  groupCount: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '600',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.18)',
  },
  resultIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resultText: { flex: 1 },
  resultTitle: { color: '#E2E8F0', fontSize: 13, fontWeight: '600' },
  resultSub: { color: '#475569', fontSize: 11, marginTop: 1 },
  resultMeta: { fontSize: 12, fontWeight: '700', flexShrink: 0 },
});
