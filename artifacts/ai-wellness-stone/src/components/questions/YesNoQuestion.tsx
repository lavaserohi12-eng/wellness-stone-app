import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface YesNoQuestionProps {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
  helperText?: string;
  yesLabel?: string;
  noLabel?: string;
  optional?: boolean;
}

export function YesNoQuestion({
  label,
  value,
  onChange,
  helperText,
  yesLabel = 'Yes',
  noLabel = 'No',
  optional,
}: YesNoQuestionProps) {
  const colors = useColors();

  const btn = (isYes: boolean) => {
    const active = value === isYes;
    return (
      <Pressable
        onPress={() => onChange(isYes)}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: active ? colors.primary : colors.secondary,
            borderRadius: 12,
            borderColor: active ? colors.primary : colors.border,
            opacity: pressed ? 0.75 : 1,
            flex: 1,
          },
        ]}
      >
        <Text
          style={[
            styles.btnText,
            {
              color: active ? colors.primaryForeground : colors.foreground,
              fontFamily: active ? 'Inter_700Bold' : 'Inter_400Regular',
            },
          ]}
        >
          {isYes ? yesLabel : noLabel}
        </Text>
      </Pressable>
    );
  };

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
      <View style={styles.row}>
        {btn(true)}
        {btn(false)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 15 },
  optional: { fontSize: 12 },
  helper: { fontSize: 13, lineHeight: 19, marginTop: -4 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  btnText: { fontSize: 16 },
});
