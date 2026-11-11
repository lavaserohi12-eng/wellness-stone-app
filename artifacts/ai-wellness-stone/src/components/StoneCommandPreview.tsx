import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { StoneCommand } from '../types/stoneCommand';

interface StoneCommandPreviewProps {
  stoneCommand: StoneCommand;
}

interface RowProps {
  label: string;
  value: string;
}

function PreviewRow({ label, value }: RowProps) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        {label}
      </Text>
      <Text style={[styles.value, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
        {value}
      </Text>
    </View>
  );
}

export function StoneCommandPreview({ stoneCommand: cmd }: StoneCommandPreviewProps) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(JSON.stringify(cmd, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.table, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <PreviewRow label="State"     value={cmd.state} />
        <PreviewRow label="cmd"       value={cmd.cmd} />
        <PreviewRow label="Haptic"    value={cmd.haptic} />
        <PreviewRow label="Light"     value={cmd.light} />
        <PreviewRow label="Duration"  value={`${cmd.duration_s}s`} />
        <View style={[styles.row, styles.lastRow, { borderBottomColor: 'transparent' }]}>
          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Intensity
          </Text>
          <View style={styles.intensityRight}>
            <Text style={[styles.value, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              {cmd.intensity.toFixed(2)}
            </Text>
            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [
                styles.copyBtn,
                { backgroundColor: copied ? colors.primary : colors.secondary, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Text style={[
                styles.copyLabel,
                { color: copied ? colors.primaryForeground : colors.secondaryForeground, fontFamily: 'Inter_600SemiBold' },
              ]}>
                {copied ? 'Copied!' : 'Copy JSON'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  table: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  lastRow: { borderBottomWidth: 0 },
  label: { fontSize: 13, flex: 1 },
  value: { fontSize: 13, textAlign: 'right' },
  intensityRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  copyBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  copyLabel: { fontSize: 12 },
});
