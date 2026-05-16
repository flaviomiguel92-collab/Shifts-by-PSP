import React, { useState } from 'react';
import {
  View, TextInput, Text, StyleSheet, TouchableOpacity,
  ViewStyle, TextStyle, KeyboardTypeOptions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  onIconRightPress?: () => void;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  hint?: string;
  error?: string;
}

export function Input({
  label, value, onChangeText, placeholder, icon, iconRight, onIconRightPress,
  secureTextEntry, multiline, numberOfLines = 1, keyboardType, autoCapitalize,
  editable = true, style, inputStyle, labelStyle, hint, error,
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>{label}</Text>
      )}
      <View style={[
        styles.container,
        focused && styles.containerFocused,
        !!error && styles.containerError,
        multiline && { height: 80, alignItems: 'flex-start', paddingTop: 12 },
      ]}>
        {icon && (
          <Ionicons
            name={icon}
            size={16}
            color={focused ? COLORS.primaryLight : COLORS.textMuted}
            style={styles.iconLeft}
          />
        )}
        <TextInput
          style={[styles.input, multiline && { textAlignVertical: 'top' }, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textInactive}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {iconRight && (
          <TouchableOpacity onPress={onIconRightPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={iconRight} size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {(hint || error) && (
        <Text style={[styles.hint, !!error && styles.hintError]}>{error || hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 8, 22, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 14,
    height: 48,
  },
  containerFocused: {
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  containerError: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  iconLeft: { marginRight: 8 },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  hint: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  hintError: {
    color: COLORS.error,
  },
});
