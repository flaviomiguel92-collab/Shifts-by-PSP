import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatMonth, WEEKDAYS, getPrevMonth, getNextMonth } from '../../utils/helpers';
import { ThemeColors } from '../../theme/themes';

interface Props {
  currentMonth: string;
  setCurrentMonth: (month: string) => void;
  isLight: boolean;
  t: ThemeColors;
}

export function CalendarHeader({ currentMonth, setCurrentMonth, isLight, t }: Props) {
  return (
    <>
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          style={[styles.navButton, isLight && { backgroundColor: 'rgba(15,23,42,0.04)' }]}
          onPress={() => setCurrentMonth(getPrevMonth(currentMonth))}
        >
          <Ionicons name="chevron-back" size={24} color={isLight ? t.textSecondary : '#FFFFFF'} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, isLight && { color: t.textPrimary }]}>{formatMonth(currentMonth)}</Text>
        <TouchableOpacity
          style={[styles.navButton, isLight && { backgroundColor: 'rgba(15,23,42,0.04)' }]}
          onPress={() => setCurrentMonth(getNextMonth(currentMonth))}
        >
          <Ionicons name="chevron-forward" size={24} color={isLight ? t.textSecondary : '#FFFFFF'} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, isLight && { color: t.textMuted }]}>{day}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
});
