import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { config } from '@/src/config/env';
import { useWellness } from '@/src/state/WellnessContext';

interface DebugEntryProps {
  label: string;
  value: string;
  mono?: boolean;
  foreground: string;
  muted: string;
  border: string;
  cardBg: string;
}

function DebugEntry({ label, value, mono = false, foreground, muted, border, cardBg }: DebugEntryProps) {
  const isNone = value === 'none';
  return (
    <View style={[entryStyles.wrap, { borderBottomColor: border }]}>
      <Text style={[entryStyles.label, { color: muted, fontFamily: 'Inter_500Medium' }]}>
        {label}
      </Text>
      {mono && !isNone ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text style={[entryStyles.code, { color: foreground, backgroundColor: cardBg, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) }]}>
            {value}
          </Text>
        </ScrollView>
      ) : (
        <Text style={[entryStyles.value, { color: isNone ? muted : foreground, fontFamily: isNone ? 'Inter_400Regular' : 'Inter_500Medium' }]}>
          {value}
        </Text>
      )}
    </View>
  );
}

const entryStyles = StyleSheet.create({
  wrap: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 6 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.9 },
  value: { fontSize: 15 },
  code: { fontSize: 12, lineHeight: 18, padding: 10, borderRadius: 8 },
});

export default function DebugScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { latestCheckInPayload, latestAssistantResponse } = useWellness();

  const paddingTop = Platform.OS === 'web' ? 67 : insets.top + 8;
  const paddingBottom = Platform.OS === 'web' ? 34 : insets.bottom + 24;

  const fmt = (v: unknown) => (v == null ? 'none' : JSON.stringify(v, null, 2));

  const entries: { label: string; value: string; mono?: boolean }[] = [
    { label: 'app environment', value: config.appEnv },
    { label: 'Supabase status', value: 'not connected' },
    { label: 'BLE status', value: 'not implemented' },
    {
      label: 'latest check-in payload',
      value: fmt(latestCheckInPayload),
      mono: latestCheckInPayload != null,
    },
    {
      label: 'latest backend response',
      value: fmt(latestAssistantResponse),
      mono: latestAssistantResponse != null,
    },
    {
      label: 'latest device command',
      value: fmt(latestAssistantResponse?.deviceCommand ?? null),
      mono: latestAssistantResponse != null,
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.scroll, { paddingTop, paddingBottom }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.heading, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Developer Debug
        </Text>
        <View style={[styles.badge, { backgroundColor: colors.secondary, borderRadius: 6 }]}>
          <Text style={[styles.badgeText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
            DEV
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {entries.map((e, i) => (
          <DebugEntry
            key={e.label}
            label={e.label}
            value={e.value}
            mono={e.mono}
            foreground={colors.foreground}
            muted={colors.mutedForeground}
            border={i < entries.length - 1 ? colors.border : 'transparent'}
            cardBg={colors.muted}
          />
        ))}
      </View>

      <Pressable
        onPress={() => router.replace('/')}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: colors.secondary, borderRadius: 14, opacity: pressed ? 0.75 : 1 },
        ]}
        testID="btn-back-home"
      >
        <Text style={[styles.btnText, { color: colors.secondaryForeground, fontFamily: 'Inter_600SemiBold' }]}>
          Back Home
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heading: { fontSize: 26, letterSpacing: -0.4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, letterSpacing: 0.8 },
  card: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, overflow: 'hidden' },
  btn: { height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText: { fontSize: 17 },
});
