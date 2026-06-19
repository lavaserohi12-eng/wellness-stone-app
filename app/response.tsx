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
import { useWellness } from '../src/state/WellnessContext';

export default function ResponseScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { latestAssistantResponse } = useWellness();

  const paddingTop = Platform.OS === 'web' ? 67 : insets.top + 8;
  const paddingBottom = Platform.OS === 'web' ? 34 : insets.bottom + 24;

  if (!latestAssistantResponse) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background, paddingTop }]}>
        <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          No response yet
        </Text>
        <Text style={[styles.emptySub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Complete a check-in to see your Stone's response here.
        </Text>
        <Pressable
          onPress={() => router.replace('/')}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: colors.secondary, borderRadius: 14, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { color: colors.secondaryForeground, fontFamily: 'Inter_600SemiBold' }]}>
            Back Home
          </Text>
        </Pressable>
      </View>
    );
  }

  const { responseText, deviceCommand, schemaVersion } = latestAssistantResponse;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.scroll, { paddingTop, paddingBottom }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.heading, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
        Your Response
      </Text>

      {/* Response text */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardLabel, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
          Message
        </Text>
        <Text style={[styles.responseText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          {responseText}
        </Text>
      </View>

      {/* Device command */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardLabel, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
          Stone Command
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text
            style={[
              styles.code,
              {
                color: colors.foreground,
                backgroundColor: colors.muted,
                fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
                borderRadius: 10,
              },
            ]}
          >
            {JSON.stringify(deviceCommand, null, 2)}
          </Text>
        </ScrollView>
      </View>

      <Text style={[styles.badge, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        Schema v{schemaVersion}
      </Text>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push('/check-in')}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: colors.primary, borderRadius: 14, opacity: pressed ? 0.82 : 1 },
          ]}
          testID="btn-new-check-in"
        >
          <Text style={[styles.btnText, { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }]}>
            New Check-in
          </Text>
        </Pressable>

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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 16 },
  empty: { flex: 1, paddingHorizontal: 24, gap: 14 },
  emptyTitle: { fontSize: 22, letterSpacing: -0.3 },
  emptySub: { fontSize: 15, lineHeight: 22 },
  heading: { fontSize: 26, letterSpacing: -0.4 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  responseText: { fontSize: 18, lineHeight: 28 },
  code: { fontSize: 13, lineHeight: 20, padding: 12 },
  badge: { fontSize: 12, textAlign: 'center' },
  actions: { gap: 10, marginTop: 4 },
  btn: { height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 17 },
});
