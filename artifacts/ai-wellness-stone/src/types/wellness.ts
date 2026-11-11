// ============================================================
// AI Wellness Stone — Data Contract v2 (matches the SAI-4 questionnaire)
// ============================================================

// Persisted payloads are snake_case (they become Supabase columns + JSON).
// StoneColor / HapticPattern are firmware-authoritative and shared by BOTH
// persona preferences and DeviceCommand — confirm the final list with firmware.

import { StoneCommand, StoneState } from './stoneCommand';

export { StoneCommand, StoneState };

export const SCHEMA_VERSION = 2 as const;

export type MoodLabel =
  | 'calm' | 'anxious' | 'sad' | 'overwhelmed' | 'angry'
  | 'lonely' | 'numb' | 'hopeful' | 'other';

export type SupportNeed =
  | 'calm_down' | 'sleep' | 'think_clearly'
  | 'one_small_action' | 'feel_less_alone' | 'just_record';

export type TriggerTag =
  | 'school' | 'work' | 'family' | 'relationship' | 'health'
  | 'money' | 'social' | 'uncertainty' | 'no_clear_trigger' | 'other';

export type StonePreference =
  | 'use_default' | 'softer' | 'stronger' | 'light_only' | 'haptic_only' | 'no_stone';

// Stone hardware vocab — used by PersonaProfile sensory_profile.
// The v1 frozen firmware vocabulary for the Stone Command is in stoneCommand.ts.
export type StoneColor =
  | 'soft_blue' | 'warm_amber' | 'warm_white'
  | 'soft_green' | 'lavender' | 'rose' | 'none';

export type HapticPattern =
  | 'slow_heartbeat' | 'breathing_wave' | 'soft_pulse'
  | 'long_exhale' | 'none';

// ---- nightly check-in (persisted) ----
export interface CheckInPayload {
  schema_version: number;          // 2
  mood_label: MoodLabel;           // required
  valence_score?: number;          // -5..5
  arousal_score?: number;          // 0..10
  intensity: number;               // 0..10  required
  body_activation: number;         // 0..10  required
  thought_loop: number;            // 0..10  required
  energy_level: number;            // 0..10  required
  sleep_readiness: number;         // 0..10  required
  social_connectedness?: number;   // 0..10
  trigger_tag: TriggerTag;         // required
  support_need: SupportNeed;       // required
  stone_preference?: StonePreference;
  free_text?: string;
  created_at: string;              // ISO 8601
}

// ---- persona profile (persisted; nested by theme) ----
// Wellbeing/anxiety items are INSPIRED BY public wellness questionnaires.
// They are NOT validated clinical instruments and must never be shown as a
// score or diagnosis.
export interface PersonaProfile {
  schema_version: number;          // 2
  personalization_consent: boolean;
  wellness_disclaimer_acknowledged: boolean;
  primary_goal: string;
  preferred_checkin_time?: string;
  emotional_baseline: {
    baseline_valence: number;      // -5..5
    baseline_arousal: number;      // 0..10
    baseline_overwhelm: number;    // 0..10
  };
  wellbeing_baseline: {            // 0..5 each
    felt_cheerful: number; felt_calm: number; felt_active: number;
    felt_rested: number; felt_interested: number;
  };
  anxiety_pattern: {
    nervous_frequency: number;        // 0..3
    worry_control_frequency: number;  // 0..3
    thought_loop_tendency: number;    // 0..10
  };
  somatic_pattern: {
    body_stress_location: string[];
    body_activation_pattern?: string[];
    body_activation_sensitivity: number; // 0..10
  };
  sleep_pattern: {
    usual_bedtime?: string;           // "HH:MM"
    usual_wake_time?: string;
    sleep_quality: string;
    sleep_blocker?: string[];
  };
  connection_pattern: {
    loneliness_frequency: number;     // 0..4
    connection_need?: string;
  };
  trigger_profile: { common_triggers: string[] };
  support_style: {
    preferred_tone: string;
    preferred_intervention: string[];
  };
  sensory_profile: {
    preferred_haptic_pattern: HapticPattern;
    preferred_haptic_intensity: number;   // 0..100
    max_haptic_intensity: number;         // 0..100 comfort ceiling
    haptic_avoidance?: HapticPattern[];
    preferred_light_color: StoneColor;
    disliked_light_colors?: StoneColor[];
    bedtime_light_preference?: string;
  };
  safety_preferences: {
    unsafe_state_action: string[];
    trusted_contact_enabled: boolean;
    trusted_contact_name?: string | null;
    trusted_contact_phone?: string | null;
  };
  created_at: string;
}

// ---- device command (used for persona preferences; see stoneCommand.ts for v1 firmware contract) ----
export interface DeviceCommand {
  color: StoneColor;
  breathing_period_ms: number;     // 2000..12000
  haptic_pattern: HapticPattern;
  haptic_bpm: number;              // 40..90
  intensity: number;               // 0..100
  duration_sec: number;            // 30..600
}

export const DEFAULT_DEVICE_COMMAND: DeviceCommand = {
  color: 'soft_blue', breathing_period_ms: 6000, haptic_pattern: 'slow_heartbeat',
  haptic_bpm: 54, intensity: 35, duration_sec: 120,
};

const RANGES = {
  intensity: [0, 100], breathing_period_ms: [2000, 12000],
  haptic_bpm: [40, 90], duration_sec: [30, 600],
} as const;

const clamp = (v: number, [lo, hi]: readonly [number, number]) =>
  Math.min(hi, Math.max(lo, Math.round(v)));

export function validateDeviceCommand(cmd: DeviceCommand): DeviceCommand {
  return {
    ...cmd,
    intensity: clamp(cmd.intensity, RANGES.intensity),
    breathing_period_ms: clamp(cmd.breathing_period_ms, RANGES.breathing_period_ms),
    haptic_bpm: clamp(cmd.haptic_bpm, RANGES.haptic_bpm),
    duration_sec: clamp(cmd.duration_sec, RANGES.duration_sec),
  };
}

export function deriveDeviceCommand(
  checkIn: CheckInPayload, persona?: PersonaProfile,
): DeviceCommand {
  let cmd: DeviceCommand = { ...DEFAULT_DEVICE_COMMAND };
  if (persona) {
    const s = persona.sensory_profile;
    cmd.color = s.preferred_light_color ?? cmd.color;
    cmd.haptic_pattern = s.preferred_haptic_pattern ?? cmd.haptic_pattern;
    cmd.intensity = Math.min(s.preferred_haptic_intensity ?? cmd.intensity, s.max_haptic_intensity ?? 100);
    if (s.disliked_light_colors?.includes(cmd.color)) cmd.color = DEFAULT_DEVICE_COMMAND.color;
    if (s.haptic_avoidance?.includes(cmd.haptic_pattern)) cmd.haptic_pattern = DEFAULT_DEVICE_COMMAND.haptic_pattern;
  }
  switch (checkIn.stone_preference) {
    case 'softer':      cmd.intensity = Math.round(cmd.intensity * 0.6); break;
    case 'stronger':    cmd.intensity = Math.round(cmd.intensity * 1.3); break;
    case 'light_only':  cmd.haptic_pattern = 'none'; break;
    case 'haptic_only': cmd.color = 'none'; break;
    case 'no_stone':    cmd = { ...cmd, color: 'none', haptic_pattern: 'none', intensity: 0 }; break;
  }
  return validateDeviceCommand(cmd);
}

// ---- validation ----
export function validateCheckIn(p: Partial<CheckInPayload>): string[] {
  const errors: string[] = [];
  const required: (keyof CheckInPayload)[] = [
    'mood_label', 'intensity', 'body_activation', 'thought_loop',
    'energy_level', 'sleep_readiness', 'trigger_tag', 'support_need',
  ];
  for (const k of required) {
    const v = p[k as keyof CheckInPayload];
    if (v === undefined || v === null || v === '') errors.push(`${k} is required`);
  }
  const range = (v: number | undefined, lo: number, hi: number, n: string) => {
    if (v !== undefined && (v < lo || v > hi)) errors.push(`${n} must be ${lo}..${hi}`);
  };
  range(p.intensity, 0, 10, 'intensity');
  range(p.body_activation, 0, 10, 'body_activation');
  range(p.thought_loop, 0, 10, 'thought_loop');
  range(p.energy_level, 0, 10, 'energy_level');
  range(p.sleep_readiness, 0, 10, 'sleep_readiness');
  range(p.valence_score, -5, 5, 'valence_score');
  range(p.arousal_score, 0, 10, 'arousal_score');
  range(p.social_connectedness, 0, 10, 'social_connectedness');
  return errors;
}

// ---- AI response types (SAI-13A frozen envelope) ----

export type RiskLevel = 'low' | 'medium' | 'high';

// SAI-13A — The response envelope. state and stoneCommand are set by CODE
// (never by the LLM). companion_response is the only field the model writes.
export interface WellnessResponse {
  state: StoneState;
  risk_level: RiskLevel;
  companion_response: string;
  stoneCommand: StoneCommand;
}

// ---- mock supportive response text (v0 only — fixed rules, no model) ----
export function mockResponseText(p: CheckInPayload): string {
  if (p.mood_label === 'anxious' && p.thought_loop >= 7)
    return 'You seem mentally activated tonight. Let\u2019s slow the loop down for two minutes.';
  if (p.mood_label === 'sad')
    return 'This feels heavy tonight. Let\u2019s make this moment smaller and gentler.';
  if (p.mood_label === 'lonely')
    return 'You do not have to solve the whole night right now. Let\u2019s create one moment of steadiness.';
  if (p.support_need === 'sleep')
    return 'Let\u2019s help your body move toward sleep with a slower rhythm.';
  return 'I\u2019m here with you. Let\u2019s take this one step at a time.';
}
