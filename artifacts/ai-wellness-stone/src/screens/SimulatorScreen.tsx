// src/screens/SimulatorScreen.tsx
//
// SAI-22 — Stone Command Simulator V2
// Shows: fake telemetry input summary, detected state, outgoing frozen v1
// StoneCommand, LED + haptic behaviour descriptions, session duration, device
// status. All command values come from STATE_COMMANDS — nothing is hardcoded here.
//
// Intended audience: Mani (firmware mapping), Lavanya (QA), team reviews.

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { AppScreen } from '../components/AppScreen';
import { AppText } from '../components/AppText';
import { SectionCard } from '../components/SectionCard';
import { StoneCommandPreview } from '../components/StoneCommandPreview';
import {
  Haptic,
  Light,
  STATE_COMMANDS,
  StoneCommand,
  StoneState,
  validateStoneCommand,
} from '../types/stoneCommand';

// ---------------------------------------------------------------------------
// State ordering and labels
// ---------------------------------------------------------------------------

const ALL_STATES: StoneState[] = [
  'ANXIETY',
  'LONELINESS',
  'ACADEMIC_STRESS',
  'LOW_MOOD',
  'BODY_TENSION',
  'SLEEP_RUMINATION',
  'GENERAL_SUPPORT',
  'CRISIS',
];

const STATE_LABELS: Record<StoneState, string> = {
  ANXIETY:          'Anxiety',
  LONELINESS:       'Loneliness',
  ACADEMIC_STRESS:  'Academic Stress',
  LOW_MOOD:         'Low Mood',
  BODY_TENSION:     'Body Tension',
  SLEEP_RUMINATION: 'Sleep Rumination',
  GENERAL_SUPPORT:  'General Support',
  CRISIS:           'Crisis',
};

// ---------------------------------------------------------------------------
// Fake telemetry input — realistic per-state sensor snapshots for Mani's
// firmware mapping examples. These represent what the device might read in the
// 20 min before a check-in with this state classification.
//
// BODY_TENSION deliberately exceeds the SAI-21 soft-signal thresholds
// (avg_hr_bpm > 85, avg_eda_microsiemens > 5) to show physiology-driven
// classification. Other states are driven primarily by mood_label / ratings.
// ---------------------------------------------------------------------------

interface FakeTelemetry {
  avg_hr_bpm: number;
  max_hr_bpm: number;
  avg_spo2_percent: number;
  avg_eda_microsiemens: number;
  avg_touch_force: number;
  note: string;
}

const FAKE_TELEMETRY: Record<StoneState, FakeTelemetry> = {
  ANXIETY: {
    avg_hr_bpm: 93,
    max_hr_bpm: 104,
    avg_spo2_percent: 97,
    avg_eda_microsiemens: 6.8,
    avg_touch_force: 0.62,
    note: 'Elevated HR + EDA. State driven by mood_label = "anxious".',
  },
  LONELINESS: {
    avg_hr_bpm: 61,
    max_hr_bpm: 68,
    avg_spo2_percent: 98,
    avg_eda_microsiemens: 1.9,
    avg_touch_force: 0.28,
    note: 'Low baseline readings. State driven by mood_label = "lonely".',
  },
  ACADEMIC_STRESS: {
    avg_hr_bpm: 87,
    max_hr_bpm: 98,
    avg_spo2_percent: 97,
    avg_eda_microsiemens: 5.4,
    avg_touch_force: 0.71,
    note: 'Moderate-high HR. State driven by mood_label = "overwhelmed" or intensity ≥ 8.',
  },
  LOW_MOOD: {
    avg_hr_bpm: 57,
    max_hr_bpm: 63,
    avg_spo2_percent: 98,
    avg_eda_microsiemens: 1.5,
    avg_touch_force: 0.21,
    note: 'Subdued physiology. State driven by mood_label = "sad" or "numb".',
  },
  BODY_TENSION: {
    avg_hr_bpm: 92,
    max_hr_bpm: 107,
    avg_spo2_percent: 97,
    avg_eda_microsiemens: 8.6,
    avg_touch_force: 0.83,
    note: 'SAI-21 soft signal: avg_hr_bpm > 85 AND avg_eda > 5 → BODY_TENSION when no direct mood_label match.',
  },
  SLEEP_RUMINATION: {
    avg_hr_bpm: 69,
    max_hr_bpm: 74,
    avg_spo2_percent: 96,
    avg_eda_microsiemens: 3.1,
    avg_touch_force: 0.38,
    note: 'Restless baseline. State driven by sleep_readiness ≤ 2.',
  },
  GENERAL_SUPPORT: {
    avg_hr_bpm: 67,
    max_hr_bpm: 72,
    avg_spo2_percent: 98,
    avg_eda_microsiemens: 2.3,
    avg_touch_force: 0.31,
    note: 'Normal readings. No direct mood_label match and no threshold triggers — fallback state.',
  },
  CRISIS: {
    avg_hr_bpm: 108,
    max_hr_bpm: 121,
    avg_spo2_percent: 95,
    avg_eda_microsiemens: 13.2,
    avg_touch_force: 0.92,
    note: 'Very elevated readings. State driven by crisis keyword/phrase match in free_text — NOT physiology. Physiology never triggers CRISIS.',
  },
};

// ---------------------------------------------------------------------------
// Human-readable behaviour descriptions
// ---------------------------------------------------------------------------

const HAPTIC_LABELS: Record<Haptic, string> = {
  heartbeat_70bpm: 'Heartbeat pattern — 70 bpm',
  heartbeat_60bpm: 'Heartbeat pattern — 60 bpm',
  slow_pulse:      'Slow gentle pulse',
  breathing_wave:  'Breathing rhythm wave',
  long_exhale:     'Long exhale pulse',
  none:            'Off — no haptic output',
};

const LIGHT_LABELS: Record<Light, string> = {
  amber_breathe_4_6: 'Amber — slow breathe (4 s in / 6 s out)',
  amber_steady:      'Amber — steady glow',
  blue_breathe_4_6:  'Blue — slow breathe (4 s in / 6 s out)',
  green_steady:      'Green — steady glow',
  dim_warm_glow:     'Warm white — dim steady glow',
  none:              'Off — no LED output',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCommand(state: StoneState): StoneCommand {
  return validateStoneCommand({ version: 1, state, ...STATE_COMMANDS[state] });
}

function deviceStatus(cmd: StoneCommand): string {
  if (cmd.cmd === 'safety_mode') return 'Connected · Safety mode active';
  if (cmd.cmd === 'off') return 'Connected · Device off';
  return 'Connected · Soothing active';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TelemetryRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.tRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.tLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        {label}
      </Text>
      <Text style={[styles.tValue, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
        {value}
      </Text>
    </View>
  );
}

function BehaviourRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.bRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.bLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        {label}
      </Text>
      <Text style={[styles.bValue, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
        {value}
      </Text>
    </View>
  );
}

function StatePicker({
  selected,
  onSelect,
}: {
  selected: StoneState;
  onSelect: (s: StoneState) => void;
}) {
  const colors = useColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pickerRow}
    >
      {ALL_STATES.map((s) => {
        const active = s === selected;
        const isCrisis = s === 'CRISIS';
        const bg = active
          ? isCrisis
            ? '#D94F4F'
            : colors.primary
          : colors.secondary;
        const fg = active
          ? colors.primaryForeground
          : isCrisis
          ? '#D94F4F'
          : colors.secondaryForeground;
        return (
          <Pressable
            key={s}
            onPress={() => onSelect(s)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: bg, borderColor: isCrisis && !active ? '#D94F4F' : 'transparent', opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Text style={[styles.chipLabel, { color: fg, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
              {STATE_LABELS[s]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function SimulatorScreen() {
  const colors = useColors();
  const [selected, setSelected] = useState<StoneState>('ANXIETY');

  const cmd = buildCommand(selected);
  const tele = FAKE_TELEMETRY[selected];
  const isCrisis = selected === 'CRISIS';

  return (
    <AppScreen scroll title="Simulator V2">
      <AppText variant="subtitle">
        Telemetry-in → StoneCommand-out for all eight states. Frozen v1 contract.
        Use "Copy JSON" to share firmware mapping examples with Mani.
      </AppText>

      {/* State picker */}
      <StatePicker selected={selected} onSelect={setSelected} />

      {/* CRISIS banner */}
      {isCrisis && (
        <View style={[styles.crisisBanner, { backgroundColor: '#FEF2F2', borderColor: colors.destructive }]}>
          <Text style={[styles.crisisTitle, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>
            CRISIS — Safety mode only
          </Text>
          <Text style={[styles.crisisSub, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>
            State is set by crisis keyword/phrase match in free_text — never by physiology.
            No soothe output is sent. Haptic and intensity are forced to zero.
            This command is non-overridable: stone_preference is ignored.
          </Text>
        </View>
      )}

      {/* Telemetry input */}
      <SectionCard
        title="Telemetry input (last 20 min)"
        subtitle={tele.note}
      >
        <View style={[styles.table, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <TelemetryRow label="avg HR"         value={`${tele.avg_hr_bpm} bpm`} />
          <TelemetryRow label="max HR"         value={`${tele.max_hr_bpm} bpm`} />
          <TelemetryRow label="avg SpO₂"       value={`${tele.avg_spo2_percent}%`} />
          <TelemetryRow label="avg EDA"        value={`${tele.avg_eda_microsiemens} µS`} />
          <TelemetryRow label="avg touch force" value={tele.avg_touch_force.toFixed(2)} />
        </View>
      </SectionCard>

      {/* Stone command output */}
      <SectionCard title="Stone command output (v1 frozen)">
        <StoneCommandPreview stoneCommand={cmd} />
      </SectionCard>

      {/* Expected behaviour */}
      <SectionCard title="Expected device behaviour">
        <View style={[styles.table, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <BehaviourRow label="LED"           value={LIGHT_LABELS[cmd.light]} />
          <BehaviourRow label="Haptic"        value={HAPTIC_LABELS[cmd.haptic]} />
          <BehaviourRow label="Session"       value={cmd.cmd === 'soothe' ? `${cmd.duration_s} s` : 'n/a — safety_mode'} />
          <BehaviourRow label="Intensity"     value={cmd.cmd === 'soothe' ? `${(cmd.intensity * 100).toFixed(0)}%` : '0% — forced off'} />
          <BehaviourRow label="Device status" value={deviceStatus(cmd)} />
        </View>
      </SectionCard>
    </AppScreen>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  pickerRow: {
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 13 },

  crisisBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  crisisTitle: { fontSize: 14 },
  crisisSub: { fontSize: 13, lineHeight: 19 },

  table: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  tLabel: { fontSize: 13, flex: 1 },
  tValue: { fontSize: 13, textAlign: 'right' },

  bRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  bLabel: { fontSize: 13, flexShrink: 0, width: 90 },
  bValue: { fontSize: 13, flex: 1, textAlign: 'right', lineHeight: 18 },
});
