import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface SliderQuestionProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  helperText?: string;
  minLabel?: string;
  maxLabel?: string;
}

export function SliderQuestion({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  helperText,
  minLabel,
  maxLabel,
}: SliderQuestionProps) {
  const colors = useColors();
  const fillPct = ((value - min) / (max - min)) * 100;

  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  const handleText = (t: string) => {
    const n = parseFloat(t);
    if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
        {label}
      </Text>
      {!!helperText && (
        <Text style={[styles.helper, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {helperText}
        </Text>
      )}
      <View style={styles.controls}>
        <Pressable
          onPress={dec}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: colors.secondary, borderRadius: 10, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>−</Text>
        </Pressable>
        <TextInput
          style={[
            styles.valueInput,
            {
              color: colors.foreground,
              borderColor: colors.border,
              backgroundColor: colors.card,
              fontFamily: 'Inter_700Bold',
              borderRadius: 10,
            },
          ]}
          value={String(value)}
          onChangeText={handleText}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          selectTextOnFocus
        />
        <Pressable
          onPress={inc}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: colors.secondary, borderRadius: 10, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>+</Text>
        </Pressable>
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${fillPct}%` as unknown as number,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>
      </View>
      {(minLabel || maxLabel) && (
        <View style={styles.endLabels}>
          <Text style={[styles.endLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {minLabel ?? String(min)}
          </Text>
          <Text style={[styles.endLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {maxLabel ?? String(max)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  label: { fontSize: 15 },
  helper: { fontSize: 13, lineHeight: 19, marginTop: -4 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 22, lineHeight: 28 },
  valueInput: { width: 62, height: 42, textAlign: 'center', fontSize: 17, borderWidth: 1 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  endLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  endLabel: { fontSize: 11 },
});
