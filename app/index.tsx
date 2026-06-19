import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useColors } from '@/hooks/useColors';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const paddingTop =
    Platform.OS === 'web' ? 67 : insets.top + 24;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop,
        },
      ]}
    >
      {/* Stone glyph */}
      <View style={styles.glyphArea}>
        <View
          style={[
            styles.stoneCircle,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.primary,
            },
          ]}
        >
          <View
            style={[
              styles.stoneInner,
              { backgroundColor: colors.primary },
            ]}
          />
        </View>
      </View>

      {/* Text */}
      <View style={styles.textArea}>
        <Text
          style={[
            styles.title,
            { color: colors.foreground, fontFamily: 'Inter_700Bold' },
          ]}
        >
          AI Wellness Stone
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
          ]}
        >
          Your tactile AI companion for nightly emotional check-ins
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonArea}>
        <PrimaryButton
          label="Start Check-in"
          onPress={() => router.push('/check-in')}
          testID="btn-check-in"
        />
        <View style={styles.buttonGap} />
        <PrimaryButton
          label="Developer Debug"
          onPress={() => router.push('/debug')}
          variant="secondary"
          testID="btn-debug"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
  },
  glyphArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stoneCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 8,
  },
  stoneInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    opacity: 0.85,
  },
  textArea: {
    alignItems: 'center',
    paddingBottom: 40,
    gap: 10,
  },
  title: {
    fontSize: 26,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  buttonArea: {
    paddingBottom: 12,
  },
  buttonGap: {
    height: 12,
  },
});
