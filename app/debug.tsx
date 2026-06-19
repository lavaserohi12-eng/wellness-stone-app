import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { config } from '@/src/config/env';
import { useColors } from '@/hooks/useColors';

interface DebugRowProps {
  label: string;
  value: string;
  valueColor?: string;
  borderColor: string;
  foregroundColor: string;
  mutedColor: string;
}

function DebugRow({
  label,
  value,
  valueColor,
  borderColor,
  foregroundColor,
  mutedColor,
}: DebugRowProps) {
  return (
    <View style={[styles.row, { borderBottomColor: borderColor }]}>
      <Text
        style={[
          styles.rowLabel,
          { color: mutedColor, fontFamily: 'Inter_400Regular' },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.rowValue,
          {
            color: valueColor ?? foregroundColor,
            fontFamily: 'Inter_500Medium',
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function DebugScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const paddingTop =
    Platform.OS === 'web' ? 67 : insets.top + 8;
  const paddingBottom =
    Platform.OS === 'web' ? 34 : insets.bottom + 16;

  const rows: { label: string; value: string; valueColor?: string }[] = [
    {
      label: 'app environment',
      value: config.appEnv,
      valueColor: colors.primary,
    },
    {
      label: 'Supabase status',
      value: 'not connected',
      valueColor: colors.mutedForeground,
    },
    {
      label: 'latest check-in payload',
      value: 'none',
      valueColor: colors.mutedForeground,
    },
    {
      label: 'latest backend response',
      value: 'none',
      valueColor: colors.mutedForeground,
    },
    {
      label: 'latest device command',
      value: 'none',
      valueColor: colors.mutedForeground,
    },
    {
      label: 'BLE status',
      value: 'not implemented',
      valueColor: colors.mutedForeground,
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop, paddingBottom },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.title,
            { color: colors.foreground, fontFamily: 'Inter_700Bold' },
          ]}
        >
          Developer Debug
        </Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.secondary, borderRadius: 6 },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: colors.primary, fontFamily: 'Inter_600SemiBold' },
            ]}
          >
            DEV
          </Text>
        </View>
      </View>

      {/* Debug table */}
      <View
        style={[
          styles.table,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {rows.map((row, idx) => (
          <DebugRow
            key={row.label}
            label={row.label}
            value={row.value}
            valueColor={row.valueColor}
            borderColor={idx < rows.length - 1 ? colors.border : 'transparent'}
            foregroundColor={colors.foreground}
            mutedColor={colors.mutedForeground}
          />
        ))}
      </View>

      {/* Schema version info */}
      <View
        style={[
          styles.schemaBlock,
          { backgroundColor: colors.muted, borderRadius: 10 },
        ]}
      >
        <Text
          style={[
            styles.schemaLabel,
            { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
          ]}
        >
          Data Contract
        </Text>
        <Text
          style={[
            styles.schemaValue,
            { color: colors.foreground, fontFamily: 'Inter_600SemiBold' },
          ]}
        >
          Schema version 1
        </Text>
      </View>

      {/* Back */}
      <View style={styles.footer}>
        <PrimaryButton
          label="Back Home"
          onPress={() => router.replace('/')}
          variant="secondary"
          testID="btn-back-home"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  table: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowLabel: {
    fontSize: 13,
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    textAlign: 'right',
    flexShrink: 1,
  },
  schemaBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  schemaLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  schemaValue: {
    fontSize: 15,
  },
  footer: {
    marginTop: 8,
  },
});
