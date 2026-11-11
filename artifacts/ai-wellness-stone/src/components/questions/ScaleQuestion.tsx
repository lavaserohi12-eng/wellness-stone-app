import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface ScaleQuestionProps {
  label: string;
  value: number;
  min: number;
  max: number;
  labels?: string[];
  onChange: (v: number) => void;
  helperText?: string;
}

export function ScaleQuestion({
  label,
  value,
  min,
  max,
  labels,
  onChange,
  helperText,
}: ScaleQuestionProps) {
  const colors = useColors();
  const fillPct = ((value - min) / (max - min)) * 100;
  const currentLabel = labels ? labels[value - min] : String(value);
  const firstLabel = labels ? labels[0] : String(min);
  const lastLabel = labels ? labels[labels.length - 1] : String(max);

  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

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
        <View
          style={[
            styles.valueBox,
            { borderColor: colors.border, backgroundColor: colors.card, borderRadius: 10 },
          ]}
        >
          <Text
            style={[styles.valueText, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {currentLabel}
          </Text>
        </View>
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
      <View style={styles.endLabels}>
        <Text style={[styles.endLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {firstLabel}
        </Text>
        <Text style={[styles.endLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {lastLabel}
        </Text>
      </View>
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
  valueBox: {
    width: 114,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 6,
  },
  valueText: { fontSize: 12, textAlign: 'center' },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  endLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  endLabel: { fontSize: 11 },
});
