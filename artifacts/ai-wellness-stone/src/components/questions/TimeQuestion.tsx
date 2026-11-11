import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface TimeQuestionProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helperText?: string;
  optional?: boolean;
}

export function TimeQuestion({
  label,
  value,
  onChange,
  helperText,
  optional,
}: TimeQuestionProps) {
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
          styles.input,
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
        placeholder="HH:MM"
        placeholderTextColor={colors.mutedForeground}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
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
  input: { height: 48, paddingHorizontal: 14, fontSize: 17, borderWidth: 1 },
});
