import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import { MultiSelectQuestion, makeOptions as multiOptions } from '../src/components/questions/MultiSelectQuestion';
import { ScaleQuestion } from '../src/components/questions/ScaleQuestion';
import { SingleSelectQuestion, makeOptions as singleOptions } from '../src/components/questions/SingleSelectQuestion';
import { SliderQuestion } from '../src/components/questions/SliderQuestion';
import { StepProgress } from '../src/components/questions/StepProgress';
import { TextQuestion } from '../src/components/questions/TextQuestion';
import { TimeQuestion } from '../src/components/questions/TimeQuestion';
import { YesNoQuestion } from '../src/components/questions/YesNoQuestion';
import { savePersonaProfile } from '../src/services/personaService';
import { usePersona } from '../src/state/PersonaContext';
import {
  HapticPattern,
  PersonaProfile,
  StoneColor,
} from '../src/types/wellness';

// ── Option lists ───────────────────────────────────────────────────────────

const HAPTIC_PATTERNS: HapticPattern[] = ['slow_heartbeat', 'breathing_wave', 'soft_pulse', 'long_exhale', 'none'];
const STONE_COLORS: StoneColor[] = ['soft_blue', 'warm_amber', 'warm_white', 'soft_green', 'lavender', 'rose', 'none'];
const STONE_COLORS_NO_NONE: StoneColor[] = ['soft_blue', 'warm_amber', 'warm_white', 'soft_green', 'lavender', 'rose'];

const WELLBEING_LABELS = ['Never', 'Rarely', 'Sometimes', 'Often', 'Most of the time', 'All the time'];
const FREQ3_LABELS = ['Not at all', 'Several days', 'More than half', 'Nearly every day'];
const LONELY_LABELS = ['Never', 'Rarely', 'Sometimes', 'Often', 'Very often'];

const STEPS = [
  'Consent & Privacy',
  'Your Focus',
  'Emotional Baseline',
  'Well-being',
  'Thoughts & Worry',
  'Body Sensations',
  'Sleep',
  'Connection',
  'Common Triggers',
  'Support Style',
  'Stone Haptics',
  'Stone Light',
  'Safety',
];

// ── Draft state ────────────────────────────────────────────────────────────

interface PersonaDraft {
  personalization_consent: boolean | null;
  wellness_disclaimer_acknowledged: boolean;
  primary_goal: string;
  preferred_checkin_time: string;
  baseline_valence: number;
  baseline_arousal: number;
  baseline_overwhelm: number;
  felt_cheerful: number; felt_calm: number; felt_active: number;
  felt_rested: number; felt_interested: number;
  nervous_frequency: number;
  worry_control_frequency: number;
  thought_loop_tendency: number;
  body_stress_location: string[];
  body_activation_pattern: string[];
  body_activation_sensitivity: number;
  usual_bedtime: string;
  usual_wake_time: string;
  sleep_quality: string;
  sleep_blocker: string[];
  loneliness_frequency: number;
  connection_need: string;
  common_triggers: string[];
  preferred_tone: string;
  preferred_intervention: string[];
  preferred_haptic_pattern: HapticPattern;
  preferred_haptic_intensity: number;
  max_haptic_intensity: number;
  haptic_avoidance: HapticPattern[];
  preferred_light_color: StoneColor;
  disliked_light_colors: StoneColor[];
  bedtime_light_preference: string;
  unsafe_state_action: string[];
  trusted_contact_enabled: boolean | null;
  trusted_contact_name: string;
  trusted_contact_phone: string;
}

const INITIAL: PersonaDraft = {
  personalization_consent: null,
  wellness_disclaimer_acknowledged: false,
  primary_goal: '',
  preferred_checkin_time: '',
  baseline_valence: 0,
  baseline_arousal: 5,
  baseline_overwhelm: 5,
  felt_cheerful: 2, felt_calm: 2, felt_active: 2, felt_rested: 2, felt_interested: 2,
  nervous_frequency: 0,
  worry_control_frequency: 0,
  thought_loop_tendency: 5,
  body_stress_location: [],
  body_activation_pattern: [],
  body_activation_sensitivity: 5,
  usual_bedtime: '', usual_wake_time: '',
  sleep_quality: '',
  sleep_blocker: [],
  loneliness_frequency: 0,
  connection_need: '',
  common_triggers: [],
  preferred_tone: '',
  preferred_intervention: [],
  preferred_haptic_pattern: 'slow_heartbeat',
  preferred_haptic_intensity: 35,
  max_haptic_intensity: 70,
  haptic_avoidance: [],
  preferred_light_color: 'soft_blue',
  disliked_light_colors: [],
  bedtime_light_preference: '',
  unsafe_state_action: [],
  trusted_contact_enabled: null,
  trusted_contact_name: '',
  trusted_contact_phone: '',
};

// ── Build PersonaProfile from draft ───────────────────────────────────────

function buildProfile(d: PersonaDraft): PersonaProfile {
  return {
    schema_version: 2,
    personalization_consent: d.personalization_consent === true,
    wellness_disclaimer_acknowledged: d.wellness_disclaimer_acknowledged,
    primary_goal: d.primary_goal,
    preferred_checkin_time: d.preferred_checkin_time || undefined,
    emotional_baseline: {
      baseline_valence: d.baseline_valence,
      baseline_arousal: d.baseline_arousal,
      baseline_overwhelm: d.baseline_overwhelm,
    },
    wellbeing_baseline: {
      felt_cheerful: d.felt_cheerful, felt_calm: d.felt_calm,
      felt_active: d.felt_active, felt_rested: d.felt_rested,
      felt_interested: d.felt_interested,
    },
    anxiety_pattern: {
      nervous_frequency: d.nervous_frequency,
      worry_control_frequency: d.worry_control_frequency,
      thought_loop_tendency: d.thought_loop_tendency,
    },
    somatic_pattern: {
      body_stress_location: d.body_stress_location,
      body_activation_pattern: d.body_activation_pattern.length ? d.body_activation_pattern : undefined,
      body_activation_sensitivity: d.body_activation_sensitivity,
    },
    sleep_pattern: {
      usual_bedtime: d.usual_bedtime || undefined,
      usual_wake_time: d.usual_wake_time || undefined,
      sleep_quality: d.sleep_quality,
      sleep_blocker: d.sleep_blocker.length ? d.sleep_blocker : undefined,
    },
    connection_pattern: {
      loneliness_frequency: d.loneliness_frequency,
      connection_need: d.connection_need || undefined,
    },
    trigger_profile: { common_triggers: d.common_triggers },
    support_style: {
      preferred_tone: d.preferred_tone,
      preferred_intervention: d.preferred_intervention,
    },
    sensory_profile: {
      preferred_haptic_pattern: d.preferred_haptic_pattern,
      preferred_haptic_intensity: d.preferred_haptic_intensity,
      max_haptic_intensity: d.max_haptic_intensity,
      haptic_avoidance: d.haptic_avoidance.length ? d.haptic_avoidance : undefined,
      preferred_light_color: d.preferred_light_color,
      disliked_light_colors: d.disliked_light_colors.length ? d.disliked_light_colors : undefined,
      bedtime_light_preference: d.bedtime_light_preference || undefined,
    },
    safety_preferences: {
      unsafe_state_action: d.unsafe_state_action,
      trusted_contact_enabled: d.trusted_contact_enabled === true,
      trusted_contact_name: d.trusted_contact_enabled ? (d.trusted_contact_name || null) : null,
      trusted_contact_phone: d.trusted_contact_enabled ? (d.trusted_contact_phone || null) : null,
    },
    created_at: new Date().toISOString(),
  };
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function PersonaSetupScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setPersonaProfile, setPersonaSaving, setPersonaSaveResult } = usePersona();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<PersonaDraft>(INITIAL);
  const [errors, setErrors] = useState<string[]>([]);

  const paddingBottom = Platform.OS === 'web' ? 34 : insets.bottom + 24;

  const upd = <K extends keyof PersonaDraft>(k: K, v: PersonaDraft[K]) =>
    setDraft((p) => ({ ...p, [k]: v }));

  const canProceed = (): string[] => {
    switch (step) {
      case 0:
        if (draft.personalization_consent === null) return ['Please answer the consent question.'];
        if (!draft.wellness_disclaimer_acknowledged) return ['Please acknowledge the wellness disclaimer.'];
        return [];
      case 1:
        if (!draft.primary_goal) return ['Please select an area to focus on.'];
        return [];
      case 5:
        if (!draft.body_stress_location.length) return ['Please select at least one location.'];
        return [];
      case 6:
        if (!draft.sleep_quality) return ['Please select your sleep quality.'];
        return [];
      case 8:
        if (!draft.common_triggers.length) return ['Please select at least one trigger.'];
        return [];
      case 9:
        if (!draft.preferred_tone) return ['Please select a preferred tone.'];
        if (!draft.preferred_intervention.length) return ['Please select at least one intervention.'];
        return [];
      case 12:
        if (!draft.unsafe_state_action.length) return ['Please select at least one preference.'];
        return [];
      default:
        return [];
    }
  };

  const handleNext = async () => {
    const errs = canProceed();
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    if (step === STEPS.length - 1) {
      const profile = buildProfile(draft);
      setPersonaProfile(profile);
      setPersonaSaving();
      router.push('/persona-summary');
      try {
        const id = await savePersonaProfile(profile);
        setPersonaSaveResult(id, 'saved');
      } catch (err) {
        setPersonaSaveResult(null, 'failed', err instanceof Error ? err.message : String(err));
      }
    } else {
      setStep((s) => s + 1);
    }
  };

  const renderStep = (): React.ReactNode => {
    switch (step) {
      case 0:
        return (
          <View style={styles.section}>
            <YesNoQuestion
              label="Can the app use your check-ins and feedback to personalize future responses?"
              value={draft.personalization_consent}
              onChange={(v) => upd('personalization_consent', v)}
            />
            <View style={styles.divider} />
            <Pressable
              onPress={() => upd('wellness_disclaimer_acknowledged', !draft.wellness_disclaimer_acknowledged)}
              style={({ pressed }) => [
                styles.disclaimerCard,
                {
                  backgroundColor: draft.wellness_disclaimer_acknowledged ? colors.secondary : colors.card,
                  borderColor: draft.wellness_disclaimer_acknowledged ? colors.primary : colors.border,
                  opacity: pressed ? 0.8 : 1,
                  borderRadius: 14,
                },
              ]}
            >
              <Text style={[styles.checkbox, { color: draft.wellness_disclaimer_acknowledged ? colors.primary : colors.border }]}>
                {draft.wellness_disclaimer_acknowledged ? '☑' : '☐'}
              </Text>
              <Text style={[styles.disclaimerText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                I understand this is a wellness companion, not medical care, therapy, diagnosis, or emergency support.
              </Text>
            </Pressable>
          </View>
        );

      case 1:
        return (
          <View style={styles.section}>
            <SingleSelectQuestion
              label="What's been weighing on you most?"
              options={singleOptions(['stress', 'anxiety', 'sleep', 'loneliness', 'low_mood', 'overwhelm', 'focus', 'emotional_reflection', 'other'])}
              value={draft.primary_goal}
              onChange={(v) => { if (v) upd('primary_goal', v); }}
            />
            <View style={styles.divider} />
            <SingleSelectQuestion
              label="When do you prefer to check in?"
              options={singleOptions(['morning', 'afternoon', 'evening', 'bedtime', 'no_preference'])}
              value={draft.preferred_checkin_time}
              onChange={(v) => upd('preferred_checkin_time', v)}
              optional
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.section}>
            <SliderQuestion
              label="Evening mood"
              helperText="Overall lately, how pleasant or unpleasant have your evenings felt?"
              value={draft.baseline_valence} min={-5} max={5} step={1}
              onChange={(v) => upd('baseline_valence', v)}
              minLabel="Very unpleasant" maxLabel="Very pleasant"
            />
            <View style={styles.divider} />
            <SliderQuestion
              label="Body activation at night"
              helperText="Overall lately, how calm or activated has your body felt at night?"
              value={draft.baseline_arousal} min={0} max={10}
              onChange={(v) => upd('baseline_arousal', v)}
              minLabel="Very calm" maxLabel="Very activated"
            />
            <View style={styles.divider} />
            <SliderQuestion
              label="Feeling overloaded"
              helperText="How often has life felt overloaded lately?"
              value={draft.baseline_overwhelm} min={0} max={10}
              onChange={(v) => upd('baseline_overwhelm', v)}
              minLabel="Rarely" maxLabel="Almost always"
            />
          </View>
        );

      case 3:
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionNote, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Over the past two weeks, how often have you felt…
            </Text>
            {(
              [
                ['felt_cheerful', 'Cheerful'],
                ['felt_calm', 'Calm and relaxed'],
                ['felt_active', 'Active and vigorous'],
                ['felt_rested', 'Fresh and rested'],
                ['felt_interested', 'Interested in daily life'],
              ] as const
            ).map(([key, lbl], i) => (
              <React.Fragment key={key}>
                {i > 0 && <View style={styles.divider} />}
                <ScaleQuestion
                  label={lbl}
                  value={draft[key]}
                  min={0} max={5}
                  labels={WELLBEING_LABELS}
                  onChange={(v) => upd(key, v)}
                />
              </React.Fragment>
            ))}
          </View>
        );

      case 4:
        return (
          <View style={styles.section}>
            <ScaleQuestion
              label="Feeling nervous, anxious, or on edge"
              helperText="Over the past two weeks"
              value={draft.nervous_frequency} min={0} max={3}
              labels={FREQ3_LABELS}
              onChange={(v) => upd('nervous_frequency', v)}
            />
            <View style={styles.divider} />
            <ScaleQuestion
              label="Unable to stop or control worrying"
              helperText="Over the past two weeks"
              value={draft.worry_control_frequency} min={0} max={3}
              labels={FREQ3_LABELS}
              onChange={(v) => upd('worry_control_frequency', v)}
            />
            <View style={styles.divider} />
            <SliderQuestion
              label="Thought loops at night"
              helperText="How often do thoughts loop or replay when you're trying to wind down?"
              value={draft.thought_loop_tendency} min={0} max={10}
              onChange={(v) => upd('thought_loop_tendency', v)}
              minLabel="Rarely" maxLabel="Almost always"
            />
          </View>
        );

      case 5:
        return (
          <View style={styles.section}>
            <MultiSelectQuestion
              label="Where do you feel stress in your body?"
              options={multiOptions(['chest', 'stomach', 'throat', 'head', 'hands', 'shoulders', 'whole_body', 'not_in_body', 'other'])}
              values={draft.body_stress_location}
              onChange={(v) => upd('body_stress_location', v)}
            />
            <View style={styles.divider} />
            <MultiSelectQuestion
              label="Body signals you notice"
              options={multiOptions(['racing_heart', 'tight_chest', 'short_breath', 'stomach_drop', 'muscle_tension', 'shaking', 'warmth_or_heat', 'numbness', 'no_clear_body_signal'])}
              values={draft.body_activation_pattern}
              onChange={(v) => upd('body_activation_pattern', v)}
              optional
            />
            <View style={styles.divider} />
            <SliderQuestion
              label="Sensitivity to body sensations"
              helperText="How quickly do you notice physical signs of stress?"
              value={draft.body_activation_sensitivity} min={0} max={10}
              onChange={(v) => upd('body_activation_sensitivity', v)}
              minLabel="Not very" maxLabel="Very sensitive"
            />
          </View>
        );

      case 6:
        return (
          <View style={styles.section}>
            <TimeQuestion
              label="Usual bedtime"
              value={draft.usual_bedtime}
              onChange={(v) => upd('usual_bedtime', v)}
              optional
            />
            <View style={styles.divider} />
            <TimeQuestion
              label="Usual wake time"
              value={draft.usual_wake_time}
              onChange={(v) => upd('usual_wake_time', v)}
              optional
            />
            <View style={styles.divider} />
            <SingleSelectQuestion
              label="How would you describe your sleep quality lately?"
              options={singleOptions(['very_poor', 'poor', 'okay', 'good', 'very_good'])}
              value={draft.sleep_quality}
              onChange={(v) => { if (v) upd('sleep_quality', v); }}
            />
            <View style={styles.divider} />
            <MultiSelectQuestion
              label="What typically gets in the way of sleep?"
              options={multiOptions(['thoughts', 'body_tension', 'phone_scrolling', 'caffeine', 'alcohol', 'work_or_school', 'relationship_stress', 'loneliness', 'no_clear_reason', 'other'])}
              values={draft.sleep_blocker}
              onChange={(v) => upd('sleep_blocker', v)}
              optional
            />
          </View>
        );

      case 7:
        return (
          <View style={styles.section}>
            <ScaleQuestion
              label="How often have you felt lonely?"
              value={draft.loneliness_frequency} min={0} max={4}
              labels={LONELY_LABELS}
              onChange={(v) => upd('loneliness_frequency', v)}
            />
            <View style={styles.divider} />
            <SingleSelectQuestion
              label="What kind of connection support helps most?"
              options={singleOptions(['warm_companionship', 'practical_suggestion', 'reminder_to_contact_someone', 'quiet_presence', 'distraction', 'no_preference'])}
              value={draft.connection_need}
              onChange={(v) => upd('connection_need', v)}
              optional
            />
          </View>
        );

      case 8:
        return (
          <View style={styles.section}>
            <MultiSelectQuestion
              label="What commonly triggers stress or difficult feelings for you?"
              options={multiOptions(['school', 'work', 'family', 'relationship', 'health', 'money', 'social', 'uncertainty', 'loneliness', 'sleep', 'no_clear_trigger', 'other'])}
              values={draft.common_triggers}
              onChange={(v) => upd('common_triggers', v)}
            />
          </View>
        );

      case 9:
        return (
          <View style={styles.section}>
            <SingleSelectQuestion
              label="What tone of support feels right for you?"
              options={singleOptions(['warm_and_comforting', 'direct_and_practical', 'calm_and_quiet', 'analytical', 'encouraging', 'minimal_words'])}
              value={draft.preferred_tone}
              onChange={(v) => { if (v) upd('preferred_tone', v); }}
            />
            <View style={styles.divider} />
            <MultiSelectQuestion
              label="What kinds of support help you most?"
              options={multiOptions(['breathing', 'grounding', 'journaling', 'music', 'movement', 'talking_to_someone', 'planning_next_step', 'distraction', 'silence'])}
              values={draft.preferred_intervention}
              onChange={(v) => upd('preferred_intervention', v)}
            />
          </View>
        );

      case 10:
        return (
          <View style={styles.section}>
            <SingleSelectQuestion
              label="Preferred Stone haptic pattern"
              options={HAPTIC_PATTERNS.map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))}
              value={draft.preferred_haptic_pattern}
              onChange={(v) => { if (v) upd('preferred_haptic_pattern', v as HapticPattern); }}
            />
            <View style={styles.divider} />
            <SliderQuestion
              label={`Preferred haptic intensity · ${draft.preferred_haptic_intensity}`}
              value={draft.preferred_haptic_intensity} min={0} max={100} step={5}
              onChange={(v) => upd('preferred_haptic_intensity', v)}
              minLabel="Very gentle" maxLabel="Strong"
            />
            <View style={styles.divider} />
            <SliderQuestion
              label={`Maximum haptic intensity · ${draft.max_haptic_intensity}`}
              helperText="The Stone will never exceed this level."
              value={draft.max_haptic_intensity} min={0} max={100} step={5}
              onChange={(v) => upd('max_haptic_intensity', v)}
              minLabel="Very gentle" maxLabel="Strong"
            />
            <View style={styles.divider} />
            <MultiSelectQuestion
              label="Haptic patterns to avoid"
              options={HAPTIC_PATTERNS.filter((p) => p !== 'none').map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))}
              values={draft.haptic_avoidance}
              onChange={(v) => upd('haptic_avoidance', v as HapticPattern[])}
              optional
            />
          </View>
        );

      case 11:
        return (
          <View style={styles.section}>
            <SingleSelectQuestion
              label="Preferred Stone light color"
              options={STONE_COLORS.map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))}
              value={draft.preferred_light_color}
              onChange={(v) => { if (v) upd('preferred_light_color', v as StoneColor); }}
            />
            <View style={styles.divider} />
            <MultiSelectQuestion
              label="Colors to avoid"
              options={STONE_COLORS_NO_NONE.map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))}
              values={draft.disliked_light_colors}
              onChange={(v) => upd('disliked_light_colors', v as StoneColor[])}
              optional
            />
            <View style={styles.divider} />
            <SingleSelectQuestion
              label="Bedtime light preference"
              options={singleOptions(['none', 'dim_amber', 'slow_breathing_light', 'very_soft_light', 'no_preference'])}
              value={draft.bedtime_light_preference}
              onChange={(v) => upd('bedtime_light_preference', v)}
              optional
            />
          </View>
        );

      case 12:
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionNote, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              If you reach a difficult moment, what would you like the app to do?
            </Text>
            <MultiSelectQuestion
              label="If I seem to be in a difficult state…"
              options={multiOptions(['show_support_resources', 'suggest_contacting_trusted_person', 'pause_normal_stone_response', 'use_grounding_only', 'no_preference'])}
              values={draft.unsafe_state_action}
              onChange={(v) => upd('unsafe_state_action', v)}
            />
            <View style={styles.divider} />
            <YesNoQuestion
              label="Would you like to add a trusted contact?"
              value={draft.trusted_contact_enabled}
              onChange={(v) => upd('trusted_contact_enabled', v)}
              optional
            />
            {draft.trusted_contact_enabled && (
              <>
                <View style={styles.divider} />
                <TextQuestion
                  label="Trusted contact name"
                  value={draft.trusted_contact_name}
                  onChange={(v) => upd('trusted_contact_name', v)}
                  placeholder="Name"
                  optional
                />
                <View style={styles.divider} />
                <TextQuestion
                  label="Trusted contact phone"
                  value={draft.trusted_contact_phone}
                  onChange={(v) => upd('trusted_contact_phone', v)}
                  placeholder="+1 555 000 0000"
                  keyboardType="phone-pad"
                  optional
                />
              </>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StepProgress current={step + 1} total={STEPS.length} title={STEPS[step]} />

        {renderStep()}

        {errors.map((e) => (
          <Text key={e} style={[styles.error, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>
            {e}
          </Text>
        ))}

        <View style={styles.navRow}>
          {step > 0 ? (
            <Pressable
              onPress={() => { setErrors([]); setStep((s) => s - 1); }}
              style={({ pressed }) => [
                styles.backBtn,
                { backgroundColor: colors.secondary, borderRadius: 14, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Text style={[styles.backText, { color: colors.secondaryForeground, fontFamily: 'Inter_600SemiBold' }]}>
                Back
              </Text>
            </Pressable>
          ) : <View style={styles.backBtn} />}

          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.nextBtn,
              { backgroundColor: colors.primary, borderRadius: 14, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <Text style={[styles.nextText, { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }]}>
              {step === STEPS.length - 1 ? 'Complete Setup' : 'Next'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 20 },
  section: { gap: 0 },
  divider: { height: 24 },
  sectionNote: { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  disclaimerCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16, borderWidth: 1.5, gap: 12,
  },
  checkbox: { fontSize: 22, lineHeight: 28 },
  disclaimerText: { fontSize: 14, lineHeight: 21, flex: 1 },
  error: { fontSize: 14, lineHeight: 20, marginTop: -8 },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  backBtn: { flex: 1, height: 54, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 16 },
  nextBtn: { flex: 2, height: 54, alignItems: 'center', justifyContent: 'center' },
  nextText: { fontSize: 16 },
});
