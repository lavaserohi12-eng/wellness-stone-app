import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface Option {
  value: string;
  label: string;
}

interface SingleSelectQuestionProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  helperText?: string;
  optional?: boolean;
}

const toLabel = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function SingleSelectQuestion({
  label,
  options,
  value,
  onChange,
  helperText,
  optional,
}: SingleSelectQuestionProps) {
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
      <View style={styles.options}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(active ? '' : opt.value)}
              style={({ pressed }) => [
                styles.pill,
                {
                  backgroundColor: active ? colors.primary : colors.secondary,
                  borderRadius: 12,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color: active ? colors.primaryForeground : colors.foreground,
                    fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  },
                ]}
              >
                {opt.label ?? toLabel(opt.value)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function makeOptions(values: readonly string[]): Option[] {
  return values.map((v) => ({ value: v, label: toLabel(v) }));
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 15 },
  optional: { fontSize: 12 },
  helper: { fontSize: 13, lineHeight: 19, marginTop: -4 },
  options: { gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
  },
  pillText: { fontSize: 15 },
});
