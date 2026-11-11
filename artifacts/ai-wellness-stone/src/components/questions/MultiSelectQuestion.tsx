import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectQuestionProps {
  label: string;
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
  helperText?: string;
  optional?: boolean;
}

const toLabel = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function MultiSelectQuestion({
  label,
  options,
  values,
  onChange,
  helperText,
  optional,
}: MultiSelectQuestionProps) {
  const colors = useColors();

  const toggle = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
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
      <View style={styles.options}>
        {options.map((opt) => {
          const active = values.includes(opt.value);
          return (
            <Pressable
              key={opt.value}
              onPress={() => toggle(opt.value)}
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
                  styles.check,
                  {
                    color: active ? colors.primaryForeground : colors.border,
                    fontFamily: 'Inter_700Bold',
                  },
                ]}
              >
                {active ? '✓' : '○'}
              </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    gap: 10,
  },
  check: { fontSize: 16, width: 20, textAlign: 'center' },
  pillText: { fontSize: 15, flex: 1 },
});
