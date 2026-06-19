import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { getAssistantResponse } from '@/src/services/responseService';
import { useColors } from '@/hooks/useColors';

export default function CheckInScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const paddingTop =
    Platform.OS === 'web' ? 67 : insets.top + 8;

  const handleContinue = async () => {
    setLoading(true);
    try {
      const response = await getAssistantResponse();
      router.push({
        pathname: '/response',
        params: { responseData: JSON.stringify(response) },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop },
      ]}
    >
      {/* Icon area */}
      <View style={styles.iconArea}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.iconDot,
              { backgroundColor: colors.primary },
            ]}
          />
          <View
            style={[
              styles.iconDotSmall,
              { backgroundColor: colors.primary, opacity: 0.4 },
            ]}
          />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: colors.foreground, fontFamily: 'Inter_700Bold' },
          ]}
        >
          Nightly Check-in
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.cardLabel,
              { color: colors.primary, fontFamily: 'Inter_600SemiBold' },
            ]}
          >
            Coming soon
          </Text>
          <Text
            style={[
              styles.cardBody,
              { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
            ]}
          >
            In a future update, this screen will capture your mood, intensity,
            body activation, thought loop, sleep readiness, and support need —
            giving your Stone the context it needs to guide tonight's session.
          </Text>
        </View>

        <View
          style={[
            styles.fieldsPreview,
            { backgroundColor: colors.muted, borderRadius: 10 },
          ]}
        >
          {[
            'Mood',
            'Intensity (0–100)',
            'Body activation (0–100)',
            'Thought loop',
            'Sleep readiness (0–100)',
            'Support need',
          ].map((field) => (
            <View
              key={field}
              style={[
                styles.fieldRow,
                { borderBottomColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.fieldDot,
                  { backgroundColor: colors.primary, opacity: 0.5 },
                ]}
              />
              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color: colors.mutedForeground,
                    fontFamily: 'Inter_400Regular',
                  },
                ]}
              >
                {field}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Button */}
      <View style={styles.footer}>
        <PrimaryButton
          label="Continue to Response"
          onPress={handleContinue}
          loading={loading}
          testID="btn-continue"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  iconArea: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  iconDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    gap: 16,
  },
  title: {
    fontSize: 24,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  fieldsPreview: {
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  fieldDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  fieldLabel: {
    fontSize: 14,
  },
  footer: {
    paddingBottom: 12,
    paddingTop: 16,
  },
});
