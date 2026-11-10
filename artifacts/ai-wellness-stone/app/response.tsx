import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { AppButton } from '../src/components/AppButton';
import { AppScreen } from '../src/components/AppScreen';
import { AppText } from '../src/components/AppText';
import { SectionCard } from '../src/components/SectionCard';
import { ResponseFeedback, submitWellnessFeedback } from '../src/services/aiResponseService';
import { getCrisisResource } from '../src/services/crisisResources';
import { useWellness } from '../src/state/WellnessContext';

// SAI-12 — Helped / Neutral / Didn't help feedback, used server-side to
// evolve the user's persona notes for future AI responses.
function FeedbackRow({ checkinId }: { checkinId: string | null }) {
  const colors = useColors();
  const [selected, setSelected] = useState<ResponseFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!checkinId) return null;

  const options: { value: ResponseFeedback; emoji: string; label: string; testID: string }[] = [
    { value: 'helped',     emoji: '🙌', label: 'Helped',      testID: 'btn-feedback-helped' },
    { value: 'neutral',    emoji: '😐', label: 'Neutral',     testID: 'btn-feedback-neutral' },
    { value: 'not_helped', emoji: '😕', label: "Didn't help", testID: 'btn-feedback-not-helped' },
  ];

  const handlePress = async (value: ResponseFeedback) => {
    if (submitting || selected) return;
    setSelected(value);
    setSubmitting(true);
    try {
      await submitWellnessFeedback(checkinId, value);
    } catch {
      // Non-critical — silently keep selection so the user isn't interrupted.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SectionCard title="How did this land?">
      <View style={styles.feedbackRow}>
        {options.map((opt) => {
          const isSelected = selected === opt.value;
          const isDisabled = submitting || (selected !== null && !isSelected);
          return (
            <Pressable
              key={opt.value}
              onPress={() => handlePress(opt.value)}
              disabled={isDisabled}
              testID={opt.testID}
              style={({ pressed }) => [
                styles.feedbackPill,
                {
                  backgroundColor: isSelected ? colors.primary : 'transparent',
                  borderColor: isSelected ? colors.primary : colors.border,
                  opacity: isDisabled && !isSelected ? 0.4 : pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={styles.feedbackEmoji}>{isSelected ? '✓' : opt.emoji}</Text>
              <Text
                style={[
                  styles.feedbackLabel,
                  {
                    color: isSelected ? colors.primaryForeground : colors.foreground,
                    fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selected ? (
        <Text style={[styles.feedbackThanks, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Thanks — this helps your Stone learn what works for you.
        </Text>
      ) : null}
    </SectionCard>
  );
}

export default function ResponseScreen() {
  const router = useRouter();
  const colors = useColors();
  const { latestResponseText, latestRiskLevel, savedNightlyEntryId } = useWellness();

  if (!latestResponseText) {
    return (
      <AppScreen>
        <View style={styles.emptyInner}>
          <AppText variant="title">No response yet</AppText>
          <AppText variant="subtitle">
            Complete a check-in to see your Stone's response here.
          </AppText>
          <AppButton
            title="Back Home"
            onPress={() => router.replace('/')}
            variant="secondary"
          />
        </View>
      </AppScreen>
    );
  }

  // SAI-10 — high-risk responses never show a Stone command, and instead
  // surface the region-appropriate crisis resource. No region is collected
  // yet so this always resolves to the safe generic default.
  if (latestRiskLevel === 'high') {
    const resource = getCrisisResource(undefined);
    return (
      <AppScreen scroll title="Your Response">
        <SectionCard title="Message">
          <Text
            style={[
              styles.responseText,
              { color: colors.foreground, fontFamily: 'Inter_400Regular' },
            ]}
          >
            {latestResponseText}
          </Text>
        </SectionCard>

        <View
          style={[
            styles.crisisBox,
            { backgroundColor: '#FEF2F2', borderColor: colors.destructive },
          ]}
        >
          <Text style={[styles.crisisLabel, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>
            {resource.label}
          </Text>
          <Text style={[styles.crisisContact, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>
            {resource.contact}
          </Text>
        </View>

        <AppButton
          title="Get help now"
          onPress={() => {
            Alert.alert(
              'Get Help Now',
              'If this is a life-threatening emergency, call 911 immediately.',
              [
                {
                  text: 'Call 911 — Emergency',
                  style: 'destructive',
                  onPress: () => Linking.openURL('tel:911'),
                },
                {
                  text: 'Call 988 — Mental Health Crisis Line',
                  onPress: () => Linking.openURL('tel:988'),
                },
                {
                  text: 'Text HOME to 741741 — Crisis Text Line',
                  onPress: () => Linking.openURL('sms:741741?body=HOME'),
                },
                { text: 'Cancel', style: 'cancel' },
              ],
            );
          }}
          testID="btn-get-help-now"
        />

        <Text style={[styles.disclaimer, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          AI Wellness Stone is a wellness companion, not emergency care, therapy, or a
          medical service. If this is a life-threatening emergency, contact local
          emergency services immediately.
        </Text>

        <View style={styles.actions}>
          <AppButton
            title="Back Home"
            onPress={() => router.replace('/')}
            variant="secondary"
            testID="btn-back-home"
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll title="Your Response">
      {/* Message */}
      <SectionCard title="Message">
        <Text
          style={[
            styles.responseText,
            { color: colors.foreground, fontFamily: 'Inter_400Regular' },
          ]}
        >
          {latestResponseText}
        </Text>
      </SectionCard>

      {/* SAI-12 — feedback, keyed off the saved nightly_entries row id */}
      <FeedbackRow checkinId={savedNightlyEntryId} />

      {/* Actions */}
      <View style={styles.actions}>
        <AppButton
          title="New Check-in"
          onPress={() => router.push('/check-in')}
          testID="btn-new-check-in"
        />
        <AppButton
          title="Back Home"
          onPress={() => router.replace('/')}
          variant="secondary"
          testID="btn-back-home"
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  emptyInner:      { flex: 1, gap: 14, paddingHorizontal: 4 },
  responseText:    { fontSize: 18, lineHeight: 28 },
  actions:         { gap: 10, marginTop: 4 },
  crisisBox:       { borderRadius: 12, borderWidth: 1, padding: 16, gap: 6, marginBottom: 16 },
  crisisLabel:     { fontSize: 14 },
  crisisContact:   { fontSize: 14, lineHeight: 20 },
  disclaimer:      { fontSize: 12, lineHeight: 17, marginTop: 12, marginBottom: 4 },
  feedbackRow:     { flexDirection: 'row', gap: 8 },
  feedbackPill: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  feedbackEmoji:   { fontSize: 20 },
  feedbackLabel:   { fontSize: 13, lineHeight: 16, textAlign: 'center' },
  feedbackThanks:  { fontSize: 13, lineHeight: 18, marginTop: 10 },
});
