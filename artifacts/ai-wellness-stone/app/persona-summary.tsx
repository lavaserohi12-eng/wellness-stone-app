import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useColors } from '@/hooks/useColors';
import { AppButton } from '../src/components/AppButton';
import { AppScreen } from '../src/components/AppScreen';
import { AppText } from '../src/components/AppText';
import { SectionCard } from '../src/components/SectionCard';
import { savePersonaProfile } from '../src/services/personaService';
import { usePersona } from '../src/state/PersonaContext';

// ── Readable label helpers ─────────────────────────────────────────────────

const toReadable = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const GOAL_MAP: Record<string, string> = {
  stress: 'manage stress',
  anxiety: 'reduce anxiety and worry',
  sleep: 'improve sleep',
  loneliness: 'feel more connected',
  low_mood: 'lift your mood',
  overwhelm: 'reduce feeling overwhelmed',
  focus: 'improve focus',
  emotional_reflection: 'reflect on emotions',
  other: 'your personal goal',
};

const TIME_MAP: Record<string, string> = {
  morning: 'in the morning',
  afternoon: 'in the afternoon',
  evening: 'in the evening',
  bedtime: 'at bedtime',
  no_preference: 'whenever it feels right',
};

// ── Sub-components ─────────────────────────────────────────────────────────

function SummaryLine({ text }: { text: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.line, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
      {text}
    </Text>
  );
}

function SaveStatusBanner() {
  const colors = useColors();
  const { personaSaveStatus, savedPersonaProfileId, setPersonaSaving, setPersonaSaveResult, personaProfile } =
    usePersona();

  const handleRetry = async () => {
    if (!personaProfile) return;
    setPersonaSaving();
    try {
      const id = await savePersonaProfile(personaProfile);
      setPersonaSaveResult(id, 'saved');
    } catch {
      setPersonaSaveResult(null, 'failed');
    }
  };

  if (personaSaveStatus === 'idle') return null;

  const bannerBg =
    personaSaveStatus === 'saved'
      ? '#F0FDF4'
      : personaSaveStatus === 'failed'
      ? '#FEF2F2'
      : colors.secondary;

  const bannerBorder =
    personaSaveStatus === 'saved'
      ? '#86EFAC'
      : personaSaveStatus === 'failed'
      ? colors.destructive
      : colors.border;

  const bannerText =
    personaSaveStatus === 'saving'
      ? 'Saving your wellness profile…'
      : personaSaveStatus === 'saved'
      ? `Profile saved${savedPersonaProfileId ? ` · ${savedPersonaProfileId.slice(0, 8)}…` : ''}`
      : 'Save failed — tap to retry';

  const bannerColor =
    personaSaveStatus === 'saved'
      ? '#16A34A'
      : personaSaveStatus === 'failed'
      ? colors.destructive
      : colors.foreground;

  return (
    <Pressable
      onPress={personaSaveStatus === 'failed' ? handleRetry : undefined}
      style={[styles.banner, { backgroundColor: bannerBg, borderColor: bannerBorder, borderRadius: 12 }]}
    >
      {personaSaveStatus === 'saving' && (
        <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
      )}
      <Text style={[styles.bannerText, { color: bannerColor, fontFamily: 'Inter_500Medium' }]}>
        {bannerText}
      </Text>
      {personaSaveStatus === 'failed' && (
        <Text style={[styles.retryText, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>
          Retry ↺
        </Text>
      )}
    </Pressable>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function PersonaSummaryScreen() {
  const router = useRouter();
  const { personaProfile } = usePersona();

  if (!personaProfile) {
    return (
      <AppScreen>
        <View style={styles.emptyInner}>
          <AppText variant="subtitle">
            No wellness profile yet. Complete the setup first.
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

  const p = personaProfile;
  const triggers = p.trigger_profile.common_triggers.map(toReadable).join(', ');
  const interventions = p.support_style.preferred_intervention.map(toReadable).join(', ');
  const stressSpots = p.somatic_pattern.body_stress_location.map(toReadable).join(', ');

  return (
    <AppScreen scroll>
      {/* Header */}
      <View style={styles.headerArea}>
        <View style={[styles.checkCircle, { backgroundColor: '#16A34A' }]}>
          <Text style={[styles.checkIcon, { fontFamily: 'Inter_700Bold' }]}>✓</Text>
        </View>
        <AppText variant="title" style={styles.centered}>
          Wellness Profile Ready
        </AppText>
        <AppText variant="subtitle" style={[styles.centered, styles.subPad]}>
          Here's what your Stone knows about you. These preferences shape every session.
        </AppText>
      </View>

      <SaveStatusBanner />

      <SectionCard title="Your Goal">
        <SummaryLine text={`You're here to ${GOAL_MAP[p.primary_goal] ?? toReadable(p.primary_goal)}.`} />
        {p.preferred_checkin_time && p.preferred_checkin_time !== 'no_preference' && (
          <SummaryLine
            text={`You prefer to check in ${TIME_MAP[p.preferred_checkin_time] ?? p.preferred_checkin_time}.`}
          />
        )}
      </SectionCard>

      <SectionCard title="How You Feel at Night">
        <SummaryLine
          text={
            p.emotional_baseline.baseline_valence >= 2
              ? 'Your evenings tend to feel more pleasant than not.'
              : p.emotional_baseline.baseline_valence <= -2
              ? 'Your evenings have been feeling difficult lately.'
              : 'Your evenings vary — sometimes calm, sometimes hard.'
          }
        />
        <SummaryLine
          text={
            p.emotional_baseline.baseline_arousal >= 7
              ? 'Your body tends to be quite activated at night.'
              : p.emotional_baseline.baseline_arousal <= 3
              ? 'You generally feel calm in your body at night.'
              : 'Your body activation at night is in the middle range.'
          }
        />
        {p.anxiety_pattern.thought_loop_tendency >= 7 && (
          <SummaryLine text="You often experience thought loops when winding down." />
        )}
      </SectionCard>

      <SectionCard title="Body & Stress">
        {!!stressSpots && (
          <SummaryLine text={`You tend to feel stress in: ${stressSpots}.`} />
        )}
        <SummaryLine
          text={
            p.somatic_pattern.body_activation_sensitivity >= 7
              ? 'You are quite sensitive to body sensations.'
              : p.somatic_pattern.body_activation_sensitivity <= 3
              ? 'You tend not to notice body sensations strongly.'
              : 'You have a moderate awareness of body sensations.'
          }
        />
      </SectionCard>

      <SectionCard title="Common Triggers">
        {!!triggers && <SummaryLine text={`Things that often affect you: ${triggers}.`} />}
      </SectionCard>

      <SectionCard title="Support Style">
        <SummaryLine text={`You prefer ${toReadable(p.support_style.preferred_tone)} support.`} />
        {!!interventions && <SummaryLine text={`What helps most: ${interventions}.`} />}
      </SectionCard>

      <SectionCard title="Sleep">
        <SummaryLine
          text={`Your sleep quality has been: ${toReadable(p.sleep_pattern.sleep_quality)}.`}
        />
        {p.sleep_pattern.usual_bedtime && (
          <SummaryLine text={`You usually sleep around ${p.sleep_pattern.usual_bedtime}.`} />
        )}
      </SectionCard>

      <SectionCard title="Stone Settings">
        <SummaryLine text={`Light: ${toReadable(p.sensory_profile.preferred_light_color)}`} />
        <SummaryLine
          text={`Haptics: ${toReadable(p.sensory_profile.preferred_haptic_pattern)} at ${p.sensory_profile.preferred_haptic_intensity}% intensity`}
        />
        <SummaryLine text={`Maximum intensity: ${p.sensory_profile.max_haptic_intensity}%`} />
        {p.sensory_profile.haptic_avoidance?.length ? (
          <SummaryLine
            text={`Haptics to avoid: ${p.sensory_profile.haptic_avoidance.map(toReadable).join(', ')}`}
          />
        ) : null}
      </SectionCard>

      <View style={styles.actions}>
        <AppButton
          title="Start Your Check-in"
          onPress={() => router.push('/check-in')}
        />
        <AppButton
          title="Back Home"
          onPress={() => router.replace('/')}
          variant="secondary"
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  emptyInner: { flex: 1, gap: 14, paddingHorizontal: 4 },
  headerArea: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  checkCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  checkIcon: { fontSize: 24, color: '#fff' },
  centered: { textAlign: 'center' },
  subPad: { paddingHorizontal: 12 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  spinner: { width: 18, height: 18 },
  bannerText: { fontSize: 14, flex: 1 },
  retryText: { fontSize: 13 },
  line: { fontSize: 15, lineHeight: 22 },
  actions: { gap: 10, marginTop: 4 },
});
