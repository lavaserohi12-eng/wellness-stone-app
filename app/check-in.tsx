import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { getAssistantResponse } from '../src/services/responseService';
import { useWellness } from '../src/state/WellnessContext';
import { CheckInPayload, SCHEMA_VERSION, SupportNeed } from '../src/types/wellness';

// ── Stepper ────────────────────────────────────────────────────────────────

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

function Stepper({ value, onChange, min = 0, max = 100, step = 5 }: StepperProps) {
  const colors = useColors();

  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  const handleText = (t: string) => {
    const n = parseInt(t, 10);
    if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
  };

  return (
    <View style={stepperStyles.row}>
      <Pressable
        onPress={dec}
        style={({ pressed }) => [
          stepperStyles.btn,
          {
            backgroundColor: colors.secondary,
            borderRadius: 10,
            opacity: pressed ? 0.6 : 1,
          },
        ]}
      >
        <Text style={[stepperStyles.btnText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>−</Text>
      </Pressable>

      <TextInput
        style={[
          stepperStyles.input,
          {
            color: colors.foreground,
            borderColor: colors.border,
            backgroundColor: colors.card,
            fontFamily: 'Inter_600SemiBold',
            borderRadius: 10,
          },
        ]}
        value={String(value)}
        onChangeText={handleText}
        keyboardType="number-pad"
        maxLength={3}
        selectTextOnFocus
      />

      <Pressable
        onPress={inc}
        style={({ pressed }) => [
          stepperStyles.btn,
          {
            backgroundColor: colors.secondary,
            borderRadius: 10,
            opacity: pressed ? 0.6 : 1,
          },
        ]}
      >
        <Text style={[stepperStyles.btnText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>+</Text>
      </Pressable>

      <View style={stepperStyles.track}>
        <View
          style={[
            stepperStyles.fill,
            {
              width: `${((value - min) / (max - min)) * 100}%` as unknown as number,
              backgroundColor: colors.primary,
              borderRadius: 4,
            },
          ]}
        />
      </View>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 22, lineHeight: 26 },
  input: {
    width: 62,
    height: 42,
    textAlign: 'center',
    fontSize: 17,
    borderWidth: 1,
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: '#E6EBF4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: { height: '100%' },
});

// ── SupportNeed selector ───────────────────────────────────────────────────

const SUPPORT_OPTIONS: SupportNeed[] = ['low', 'medium', 'high'];

interface SupportSelectorProps {
  value: SupportNeed;
  onChange: (v: SupportNeed) => void;
}

function SupportSelector({ value, onChange }: SupportSelectorProps) {
  const colors = useColors();
  return (
    <View style={supportStyles.row}>
      {SUPPORT_OPTIONS.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={({ pressed }) => [
              supportStyles.pill,
              {
                flex: 1,
                backgroundColor: active ? colors.primary : colors.secondary,
                borderRadius: 10,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={[
                supportStyles.pillText,
                {
                  color: active ? colors.primaryForeground : colors.secondaryForeground,
                  fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
                },
              ]}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const supportStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  pill: { paddingVertical: 12, alignItems: 'center' },
  pillText: { fontSize: 15 },
});

// ── Field wrapper ──────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  children: React.ReactNode;
  borderColor: string;
}

function Field({ label, children, borderColor }: FieldProps) {
  const colors = useColors();
  return (
    <View style={[fieldStyles.wrap, { borderBottomColor: borderColor }]}>
      <Text style={[fieldStyles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.9 },
});

// ── Main screen ────────────────────────────────────────────────────────────

export default function CheckInScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setLatestCheckInPayload, setLatestAssistantResponse } = useWellness();

  const [mood, setMood] = useState('');
  const [intensity, setIntensity] = useState(50);
  const [bodyActivation, setBodyActivation] = useState(50);
  const [thoughtLoop, setThoughtLoop] = useState(false);
  const [sleepReadiness, setSleepReadiness] = useState(70);
  const [supportNeed, setSupportNeed] = useState<SupportNeed>('medium');
  const [loading, setLoading] = useState(false);
  const [moodError, setMoodError] = useState('');

  const paddingTop = Platform.OS === 'web' ? 67 : insets.top + 8;
  const paddingBottom = Platform.OS === 'web' ? 34 : insets.bottom + 24;

  const handleGenerate = async () => {
    if (!mood.trim()) {
      setMoodError('Please describe your mood before continuing.');
      return;
    }
    setMoodError('');
    setLoading(true);

    const payload: CheckInPayload = {
      schemaVersion: SCHEMA_VERSION,
      mood: mood.trim(),
      intensity,
      bodyActivation,
      thoughtLoop,
      sleepReadiness,
      supportNeed,
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await getAssistantResponse(payload);
      setLatestCheckInPayload(payload);
      setLatestAssistantResponse(response);
      router.push('/response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop, paddingBottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.heading, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Nightly Check-in
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Tell your Stone how you're feeling tonight.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

          {/* Mood */}
          <Field label="Mood" borderColor={colors.border}>
            <TextInput
              style={[
                styles.moodInput,
                {
                  color: colors.foreground,
                  borderColor: moodError ? colors.destructive : colors.border,
                  backgroundColor: colors.background,
                  fontFamily: 'Inter_400Regular',
                  borderRadius: 10,
                },
              ]}
              placeholder="e.g. anxious, calm, wired, tired…"
              placeholderTextColor={colors.mutedForeground}
              value={mood}
              onChangeText={(t) => { setMood(t); if (t.trim()) setMoodError(''); }}
              returnKeyType="done"
              testID="input-mood"
            />
            {!!moodError && (
              <Text style={[styles.errorText, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>
                {moodError}
              </Text>
            )}
          </Field>

          {/* Intensity */}
          <Field label={`Intensity  ·  ${intensity}`} borderColor={colors.border}>
            <Stepper value={intensity} onChange={setIntensity} />
          </Field>

          {/* Body activation */}
          <Field label={`Body Activation  ·  ${bodyActivation}`} borderColor={colors.border}>
            <Stepper value={bodyActivation} onChange={setBodyActivation} />
          </Field>

          {/* Thought loop */}
          <Field label="Thought Loop" borderColor={colors.border}>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                {thoughtLoop ? 'Yes — thoughts are looping' : 'No — mind is relatively clear'}
              </Text>
              <Switch
                value={thoughtLoop}
                onValueChange={setThoughtLoop}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.card}
                testID="switch-thought-loop"
              />
            </View>
          </Field>

          {/* Sleep readiness */}
          <Field label={`Sleep Readiness  ·  ${sleepReadiness}`} borderColor={colors.border}>
            <Stepper value={sleepReadiness} onChange={setSleepReadiness} />
          </Field>

          {/* Support need */}
          <Field label="Support Need" borderColor="transparent">
            <SupportSelector value={supportNeed} onChange={setSupportNeed} />
          </Field>
        </View>

        {/* CTA */}
        <Pressable
          onPress={handleGenerate}
          disabled={loading}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: colors.primary,
              borderRadius: 14,
              opacity: pressed ? 0.82 : loading ? 0.55 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          testID="btn-generate"
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }]}>
            {loading ? 'Generating…' : 'Generate Response'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 16 },
  heading: { fontSize: 26, letterSpacing: -0.4 },
  sub: { fontSize: 15, lineHeight: 22, marginBottom: 4 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  moodInput: {
    height: 48,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, marginTop: -4 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchLabel: { fontSize: 15, flex: 1, lineHeight: 21 },
  cta: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ctaText: { fontSize: 17, letterSpacing: 0.1 },
});
