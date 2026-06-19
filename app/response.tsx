import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { AssistantResponse } from '@/src/types/wellness';
import { useColors } from '@/hooks/useColors';

export default function ResponseScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { responseData } = useLocalSearchParams<{ responseData: string }>();

  const paddingTop =
    Platform.OS === 'web' ? 67 : insets.top + 8;
  const paddingBottom =
    Platform.OS === 'web' ? 34 : insets.bottom + 16;

  let response: AssistantResponse | null = null;
  if (responseData) {
    try {
      response = JSON.parse(responseData) as AssistantResponse;
    } catch {
      // malformed data — show error state
    }
  }

  if (!response) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop },
        ]}
      >
        <Text
          style={[
            styles.errorText,
            { color: colors.destructive, fontFamily: 'Inter_400Regular' },
          ]}
        >
          No response data available.
        </Text>
        <PrimaryButton
          label="Back Home"
          onPress={() => router.replace('/')}
          variant="secondary"
        />
      </View>
    );
  }

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
      <Text
        style={[
          styles.title,
          { color: colors.foreground, fontFamily: 'Inter_700Bold' },
        ]}
      >
        Your Response
      </Text>

      {/* Response text */}
      <View
        style={[
          styles.responseCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.primary, fontFamily: 'Inter_600SemiBold' },
          ]}
        >
          Message
        </Text>
        <Text
          style={[
            styles.responseText,
            { color: colors.foreground, fontFamily: 'Inter_400Regular' },
          ]}
        >
          {response.responseText}
        </Text>
      </View>

      {/* Device command */}
      <View
        style={[
          styles.commandCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.primary, fontFamily: 'Inter_600SemiBold' },
          ]}
        >
          Stone Command
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.codeScroll}
        >
          <Text
            style={[
              styles.code,
              {
                color: colors.foreground,
                backgroundColor: colors.muted,
                fontFamily: Platform.select({
                  ios: 'Menlo',
                  android: 'monospace',
                  default: 'monospace',
                }),
              },
            ]}
          >
            {JSON.stringify(response.deviceCommand, null, 2)}
          </Text>
        </ScrollView>
      </View>

      {/* Schema version badge */}
      <Text
        style={[
          styles.versionBadge,
          { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
        ]}
      >
        Schema v{response.schemaVersion}
      </Text>

      {/* Back home */}
      <View style={styles.footer}>
        <PrimaryButton
          label="Back Home"
          onPress={() => router.replace('/')}
          testID="btn-back-home"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 16,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  responseCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  commandCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  responseText: {
    fontSize: 17,
    lineHeight: 26,
  },
  codeScroll: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  code: {
    fontSize: 13,
    lineHeight: 20,
    padding: 12,
    borderRadius: 8,
  },
  versionBadge: {
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    marginTop: 8,
  },
});
