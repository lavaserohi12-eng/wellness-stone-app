import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface StepProgressProps {
  current: number;
  total: number;
  title: string;
}

export function StepProgress({ current, total, title }: StepProgressProps) {
  const colors = useColors();
  const pct = ((current) / total) * 100;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          {title}
        </Text>
        <Text style={[styles.count, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {current}/{total}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%` as unknown as number, backgroundColor: colors.primary },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, paddingBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15 },
  count: { fontSize: 13 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});
