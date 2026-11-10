import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { AppButton } from '../src/components/AppButton';
import { MultiSelectQuestion, makeOptions as multiOpts } from '../src/components/questions/MultiSelectQuestion';
import { SingleSelectQuestion, makeOptions as singleOpts } from '../src/components/questions/SingleSelectQuestion';
import { SliderQuestion } from '../src/components/questions/SliderQuestion';
import { TextQuestion } from '../src/components/questions/TextQuestion';
import { usePersona } from '../src/state/PersonaContext';
import { saveNightlyCheckIn } from '../src/services/checkInService';
import { hasConsent } from '../src/services/consentService';
import { cancelReminder } from '../src/services/notificationService';
import { fetchWellnessResponse } from '../src/services/edgeFunctionService';
import { fetchAiWellnessResponse } from '../src/services/aiResponseService';
import { buildMockWellnessResponse } from '../src/services/wellnessResponseService';
import { useWellness } from '../src/state/WellnessContext';
import { getTimeOfDay, getSessionWord } from '../src/utils/timeOfDay';
import {
  CheckInPayload,
  MoodLabel,
  SCHEMA_VERSION,
  StonePreference,
  SupportNeed,
  TriggerTag,
  validateCheckIn,
} from '../src/types/wellness';

// ── Section header ─────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[sh.text, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
      {title}
    </Text>
  );
}
const sh = StyleSheet.create({ text: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.1 } });

// ── Main screen ────────────────────────────────────────────────────────────

export default function CheckInScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setCheckInResult, setCheckInSaving, setCheckInSaveResult } = useWellness();
  const { personaProfile } = usePersona();

  const sessionWord = getSessionWord(getTimeOfDay());

  const [mood_label, set_mood_label] = useState<MoodLabel | ''>('');
  const [valence_score, set_valence_score] = useState(0);
  const [arousal_score, set_arousal_score] = useState(5);
  const [intensity, set_intensity] = useState(5);
  const [body_activation, set_body_activation] = useState(5);
  const [thought_loop, set_thought_loop] = useState(5);
  const [energy_level, set_energy_level] = useState(5);
  const [sleep_readiness, set_sleep_readiness] = useState(5);
  const [social_connectedness, set_social_connectedness] = useState(5);
  const [showSocialConn, setShowSocialConn] = useState(false);
  const [trigger_tag, set_trigger_tag] = useState<TriggerTag | ''>('');
  const [support_need, set_support_need] = useState<SupportNeed | ''>('');
  const [stone_preference, set_stone_preference] = useState<StonePreference | ''>('');
  const [free_text, set_free_text] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setConsentChecked(false);
      hasConsent()
        .then((granted) => {
          if (cancelled) return;
          if (!granted) {
            router.replace({ pathname: '/consent', params: { next: '/check-in' } });
            return;
          }
          setConsentChecked(true);
        })
        .catch((err) => {
          console.error('[check-in] hasConsent check failed:', err);
          if (!cancelled) router.replace({ pathname: '/consent', params: { next: '/check-in' } });
        });
      return () => {
        cancelled = true;
      };
    }, [router]),
  );

  const paddingBottom = Platform.OS === 'web' ? 34 : insets.bottom + 24;

  const handleSubmit = () => {
    const partial: Partial<CheckInPayload> = {
      mood_label: mood_label || undefined,
      intensity,
      body_activation,
      thought_loop,
      energy_level,
      sleep_readiness,
      trigger_tag: trigger_tag || undefined,
      support_need: support_need || undefined,
      valence_score,
      arousal_score,
      social_connectedness: showSocialConn ? social_connectedness : undefined,
      stone_preference: (stone_preference as StonePreference) || undefined,
      free_text: free_text.trim() || undefined,
    };

    const errs = validateCheckIn(partial);
    if (errs.length) { setErrors(errs); return; }

    setLoading(true);
    setErrors([]);

    const payload: CheckInPayload = {
      schema_version: SCHEMA_VERSION,
      mood_label: mood_label as MoodLabel,
      valence_score,
      arousal_score,
      intensity,
      body_activation,
      thought_loop,
      energy_level,
      sleep_readiness,
      social_connectedness: showSocialConn ? social_connectedness : undefined,
      trigger_tag: trigger_tag as TriggerTag,
      support_need: support_need as SupportNeed,
      stone_preference: (stone_preference as StonePreference) || undefined,
      free_text: free_text.trim() || undefined,
      created_at: new Date().toISOString(),
    };

    const mock = buildMockWellnessResponse(payload, personaProfile ?? undefined);
    setCheckInResult(
      payload,
      mock.companion_response,
      mock.state !== 'CRISIS' ? mock.stoneCommand : null,
      mock.risk_level,
    );
    setCheckInSaving();
    setLoading(false);
    router.push('/response');
    saveNightlyCheckIn(payload)
      .then((id) => {
        setCheckInSaveResult(id, 'saved');
        cancelReminder().catch((err) =>
          console.warn('[check-in] cancelReminder failed:', err),
        );
        fetchWellnessResponse(id)
          .then((wellnessResponse) => {
            setCheckInResult(
              payload,
              wellnessResponse.companion_response,
              wellnessResponse.state !== 'CRISIS' ? wellnessResponse.stoneCommand : null,
              wellnessResponse.risk_level,
            );

            if (wellnessResponse.state !== 'CRISIS') {
              fetchAiWellnessResponse(id)
                .then((aiResponse) => {
                  setCheckInResult(
                    payload,
                    aiResponse.companion_response,
                    aiResponse.state !== 'CRISIS' ? aiResponse.stoneCommand : null,
                    aiResponse.risk_level,
                  );
                })
                .catch((err: unknown) => {
                  console.warn('[check-in] fetchAiWellnessResponse failed, keeping rule-based response:', err);
                });
            }
          })
          .catch((err: unknown) => {
            console.warn('[check-in] fetchWellnessResponse failed, keeping mock response:', err);
          });
      })
      .catch((err: unknown) =>
        setCheckInSaveResult(null, 'failed', err instanceof Error ? err.message : String(err)),
      );
  };

  if (!consentChecked) return null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Your mood ── */}
        <SectionHeader title="Your mood" />

        <SingleSelectQuestion
          label="What best describes how you feel right now?"
          options={singleOpts(['calm', 'anxious', 'sad', 'overwhelmed', 'angry', 'lonely', 'numb', 'hopeful', 'other'])}
          value={mood_label}
          onChange={(v) => { if (v) set_mood_label(v as MoodLabel); }}
        />

        <View style={styles.divider} />
        <SliderQuestion
          label={`How intense is this mood? · ${intensity}`}
          helperText="Rate how strong or overwhelming this feeling is for you right now — 0 means barely noticeable, 10 means all-consuming."
          value={intensity} min={0} max={10} step={1}
          onChange={set_intensity}
          minLabel="Barely there" maxLabel="All-consuming"
        />

        <View style={styles.divider} />
        <SliderQuestion
          label={`How does ${sessionWord} feel emotionally? · ${valence_score}`}
          helperText="Not about intensity — just whether the overall emotional tone feels heavy and painful, or light and okay."
          value={valence_score} min={-5} max={5} step={1}
          onChange={set_valence_score}
          minLabel="Very heavy" maxLabel="Very light"
        />

        {/* ── Your body & mind ── */}
        <View style={styles.sectionGap} />
        <SectionHeader title="Your body & mind" />

        <SliderQuestion
          label={`How tense is your body? · ${body_activation}`}
          helperText="Any tightness in your chest, jaw, shoulders, or stomach? A 0 means completely relaxed, 10 means physically wound up."
          value={body_activation} min={0} max={10}
          onChange={set_body_activation}
          minLabel="Completely relaxed" maxLabel="Very tense"
        />
        <View style={styles.divider} />
        <SliderQuestion
          label={`Racing thoughts? · ${thought_loop}`}
          helperText="Are the same thoughts cycling on repeat, or does your mind feel quiet and still?"
          value={thought_loop} min={0} max={10}
          onChange={set_thought_loop}
          minLabel="Mind is quiet" maxLabel="Non-stop loop"
        />
        <View style={styles.divider} />
        <SliderQuestion
          label={`How buzzy is your mind? · ${arousal_score}`}
          helperText="Separate from your thoughts — is your mind winding down toward sleep, or still alert and switched on?"
          value={arousal_score} min={0} max={10}
          onChange={set_arousal_score}
          minLabel="Winding down" maxLabel="Fully alert"
        />
        <View style={styles.divider} />
        <SliderQuestion
          label={`Energy level · ${energy_level}`}
          helperText={`How much fuel do you have left ${sessionWord}?`}
          value={energy_level} min={0} max={10}
          onChange={set_energy_level}
          minLabel="Running on empty" maxLabel="Fully charged"
        />
        <View style={styles.divider} />
        <SliderQuestion
          label={`Ready for sleep? · ${sleep_readiness}`}
          helperText="How close does your body feel to being able to rest?"
          value={sleep_readiness} min={0} max={10}
          onChange={set_sleep_readiness}
          minLabel="Wide awake" maxLabel="Almost out"
        />

        <View style={styles.divider} />
        <Pressable onPress={() => setShowSocialConn((s) => !s)} style={styles.optionalToggle}>
          <Text style={[styles.optionalToggleText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
            {showSocialConn ? '− Hide' : '+ Add'} connection check (optional)
          </Text>
        </Pressable>
        {showSocialConn && (
          <>
            <View style={styles.divider} />
            <SliderQuestion
              label={`Feeling connected to others? · ${social_connectedness}`}
              helperText="How close or far away do other people feel right now?"
              value={social_connectedness} min={0} max={10}
              onChange={set_social_connectedness}
              minLabel="Very alone" maxLabel="Very connected"
            />
          </>
        )}

        {/* ── What's behind this? ── */}
        <View style={styles.sectionGap} />
        <SectionHeader title="What's behind this?" />

        <SingleSelectQuestion
          label="What's been on your mind or weighing on you?"
          options={singleOpts(['school', 'work', 'family', 'relationship', 'health', 'money', 'social', 'uncertainty', 'no_clear_trigger', 'other'])}
          value={trigger_tag}
          onChange={(v) => { if (v) set_trigger_tag(v as TriggerTag); }}
        />

        <View style={styles.divider} />
        <SingleSelectQuestion
          label={`What would feel most helpful ${sessionWord}?`}
          options={singleOpts(['calm_down', 'sleep', 'think_clearly', 'one_small_action', 'feel_less_alone', 'just_record'])}
          value={support_need}
          onChange={(v) => { if (v) set_support_need(v as SupportNeed); }}
        />

        {/* ── Tonight's Stone ── */}
        <View style={styles.sectionGap} />
        <SectionHeader title="Your Stone" />

        <SingleSelectQuestion
          label={`Any preference for how your Stone responds ${sessionWord}?`}
          options={singleOpts(['use_default', 'softer', 'stronger', 'light_only', 'haptic_only', 'no_stone'])}
          value={stone_preference}
          onChange={(v) => set_stone_preference(v as StonePreference)}
          optional
        />

        {/* ── Anything to add? ── */}
        <View style={styles.sectionGap} />
        <SectionHeader title="Anything to add?" />

        <TextQuestion
          label="Write as much or as little as you like"
          value={free_text}
          onChange={set_free_text}
          placeholder="Your Stone reads this too — feel free to share anything on your mind."
          multiline
          optional
        />

        {/* ── Errors ── */}
        {errors.length > 0 && (
          <View style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: colors.destructive, borderRadius: 10 }]}>
            {errors.map((e) => (
              <Text key={e} style={[styles.errorText, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>
                · {e}
              </Text>
            ))}
          </View>
        )}

        {/* ── Submit ── */}
        <AppButton
          title="Check in with Stone"
          onPress={handleSubmit}
          loading={loading}
          testID="btn-generate"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 0 },
  divider: { height: 20 },
  sectionGap: { height: 32 },
  optionalToggle: { paddingVertical: 4 },
  optionalToggleText: { fontSize: 14 },
  errorBox: { padding: 14, borderWidth: 1, gap: 4 },
  errorText: { fontSize: 13, lineHeight: 20 },
});
