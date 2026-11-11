import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface TextQuestionProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  helperText?: string;
  optional?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
}

export function TextQuestion({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  helperText,
  optional,
  keyboardType = 'default',
}: TextQuestionProps) {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          {label}
        </Text>
        {optional && (
          <Text style={[styles.optional, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            optional
          </Text>
        )}
      </View>
      {!!helperText && (
        <Text style={[styles.helper, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {helperText}
        </Text>
      )}
      <TextInput
        style={[
          multiline ? styles.textarea : styles.input,
          {
            color: colors.foreground,
            borderColor: colors.border,
            backgroundColor: colors.card,
            fontFamily: 'Inter_400Regular',
            borderRadius: 12,
          },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 15 },
  optional: { fontSize: 12 },
  helper: { fontSize: 13, lineHeight: 19, marginTop: -4 },
  input: { height: 48, paddingHorizontal: 14, fontSize: 16, borderWidth: 1 },
  textarea: { minHeight: 100, padding: 14, fontSize: 15, borderWidth: 1, lineHeight: 22 },
});
