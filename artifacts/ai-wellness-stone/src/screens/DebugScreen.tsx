import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useColors } from '@/hooks/useColors';
import { AppButton } from '../components/AppButton';
import { AppScreen } from '../components/AppScreen';
import { JsonPreview } from '../components/JsonPreview';
import { TextQuestion } from '../components/questions/TextQuestion';
import { SectionCard } from '../components/SectionCard';
import { StatusBadge } from '../components/StatusBadge';
import { appConfig } from '../config/appConfig';
import {
  fetchLatestTelemetryReading,
  saveBpEstimate,
  savePulseEstimateBpm,
} from '../services/deviceTelemetryService';
import { usePersona } from '../state/PersonaContext';
import { useWellness } from '../state/WellnessContext';
import { DeviceTelemetryRow } from '../types/telemetry';

// ── Types & helpers ────────────────────────────────────────────────────────

type Row = {
  label: string;
  value: string;
  mono?: boolean;
  warn?: boolean;
};

function rowValueColor(row: Row, colors: ReturnType<typeof useColors>): string {
  if (row.warn) return colors.destructive;
  if (row.value === 'true' || row.value === 'configured') return '#16A34A';
  if (
    row.value === 'none' ||
    row.value === 'false' ||
    row.value === 'not implemented' ||
    row.value === '(empty)' ||
    row.value === 'placeholder — not tracked yet'
  )
    return colors.mutedForeground;
  return colors.foreground;
}

// ── InfoTable ──────────────────────────────────────────────────────────────

function InfoTable({ rows }: { rows: Row[] }) {
  const colors = useColors();
  return (
    <View style={[styles.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {rows.map((row, i) => (
        <View
          key={row.label}
          style={[
            styles.row,
            { borderBottomColor: i < rows.length - 1 ? colors.border : 'transparent' },
          ]}
        >
          <Text
            style={[styles.rowLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
          >
            {row.label}
          </Text>
          <Text
            style={[
              styles.rowValue,
              {
                color: rowValueColor(row, colors),
                fontFamily: row.mono ? 'Inter_400Regular' : 'Inter_500Medium',
                fontSize: row.mono ? 11 : 13,
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function formatTelemetryValue(row: DeviceTelemetryRow): string {
  if (row.measurement_type === 'bp_estimate' && row.value_json) {
    const { systolic, diastolic } = row.value_json as { systolic?: number; diastolic?: number };
    return `${systolic ?? '—'}/${diastolic ?? '—'} mmHg`;
  }
  if (row.value_numeric !== null && row.value_numeric !== undefined) {
    return `${row.value_numeric}${row.unit ? ` ${row.unit}` : ''}`;
  }
  return '(no value)';
}

function ErrorBox({ title, message }: { title: string; message: string }) {
  const colors = useColors();
  return (
    <View style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: colors.destructive }]}>
      <Text style={[styles.errorLabel, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>
        {title}
      </Text>
      <Text style={[styles.errorMsg, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>
        {message}
      </Text>
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function DebugScreen() {
  const router = useRouter();
  const colors = useColors();

  const { personaProfile, personaSaveStatus, savedPersonaProfileId, personaSaveError } =
    usePersona();
  const {
    latestCheckInPayload,
    latestResponseText,
    latestStoneCommand,
    latestRiskLevel,
    latestStoneBlocked,
    checkInSaveStatus,
    savedNightlyEntryId,
    checkInSaveError,
  } = useWellness();

  // ── Telemetry (SAI-8) ─────────────────────────────────────────────────────
  const [pulseInput, setPulseInput] = useState('');
  const [systolicInput, setSystolicInput] = useState('');
  const [diastolicInput, setDiastolicInput] = useState('');
  const [pulseStatus, setPulseStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [bpStatus, setBpStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [latestReading, setLatestReading] = useState<DeviceTelemetryRow | null>(null);
  const [latestReadingLoaded, setLatestReadingLoaded] = useState(false);

  const refreshLatestReading = useCallback(async () => {
    try {
      const row = await fetchLatestTelemetryReading();
      setLatestReading(row);
    } catch (err) {
      console.error('[DebugScreen] fetchLatestTelemetryReading failed:', err);
    } finally {
      setLatestReadingLoaded(true);
    }
  }, []);

  useEffect(() => {
    refreshLatestReading();
  }, [refreshLatestReading]);

  const handleSavePulse = async () => {
    const bpm = Number(pulseInput);
    if (!pulseInput || Number.isNaN(bpm)) {
      setTelemetryError('Enter a numeric pulse estimate (bpm) first.');
      return;
    }
    setTelemetryError(null);
    setPulseStatus('saving');
    try {
      await savePulseEstimateBpm(bpm);
      setPulseStatus('saved');
      setPulseInput('');
      await refreshLatestReading();
    } catch (err) {
      setPulseStatus('failed');
      setTelemetryError(err instanceof Error ? err.message : 'Failed to save pulse estimate');
    }
  };

  const handleSaveBp = async () => {
    const systolic = Number(systolicInput);
    const diastolic = Number(diastolicInput);
    if (!systolicInput || !diastolicInput || Number.isNaN(systolic) || Number.isNaN(diastolic)) {
      setTelemetryError('Enter numeric systolic and diastolic values first.');
      return;
    }
    setTelemetryError(null);
    setBpStatus('saving');
    try {
      await saveBpEstimate(systolic, diastolic);
      setBpStatus('saved');
      setSystolicInput('');
      setDiastolicInput('');
      await refreshLatestReading();
    } catch (err) {
      setBpStatus('failed');
      setTelemetryError(err instanceof Error ? err.message : 'Failed to save BP estimate');
    }
  };

  // ── Section 1: App Info rows ─────────────────────────────────────────────
  const appInfoRows: Row[] = [
    { label: 'app name', value: appConfig.appName },
    { label: 'app version', value: appConfig.appVersion },
    { label: 'build environment', value: appConfig.appEnv },
    { label: 'debug screen enabled', value: String(appConfig.enableDebugScreen) },
    { label: 'data schema version', value: '2' },
  ];

  // ── Section 2: Navigation rows ───────────────────────────────────────────
  const navRows: Row[] = [
    { label: 'current screen', value: 'Developer Debug' },
    { label: 'last navigation action', value: 'placeholder — not tracked yet' },
  ];

  // ── Section 3: Supabase & API rows ───────────────────────────────────────
  const supabaseConfigured =
    appConfig.supabaseUrlConfigured && appConfig.supabaseAnonKeyConfigured;
  const serviceRows: Row[] = [
    {
      label: 'Supabase status',
      value: supabaseConfigured ? 'configured' : 'missing config',
      warn: !supabaseConfigured,
    },
    {
      label: 'Supabase URL present',
      value: String(appConfig.supabaseUrlConfigured),
      warn: !appConfig.supabaseUrlConfigured,
    },
    {
      label: 'Supabase anon key present',
      value: String(appConfig.supabaseAnonKeyConfigured),
      warn: !appConfig.supabaseAnonKeyConfigured,
    },
    { label: 'API base URL present', value: String(appConfig.apiBaseUrlConfigured) },
  ];

  // ── Section 8: BLE rows ──────────────────────────────────────────────────
  const bleRows: Row[] = [{ label: 'BLE status', value: 'not implemented' }];

  return (
    <AppScreen scroll>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text
          style={[styles.heading, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}
        >
          Developer Debug
        </Text>
        <View
          style={[styles.badge, { backgroundColor: colors.secondary, borderRadius: 6 }]}
        >
          <Text
            style={[styles.badgeText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}
          >
            {appConfig.appEnv.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* 1 · App Info */}
      <SectionCard title="1 · App Info" bordered={false}>
        <InfoTable rows={appInfoRows} />
      </SectionCard>

      {/* 2 · Navigation State */}
      <SectionCard title="2 · Navigation State" bordered={false}>
        <InfoTable rows={navRows} />
      </SectionCard>

      {/* 3 · Supabase & API Status */}
      <SectionCard title="3 · Supabase & API Status" bordered={false}>
        <InfoTable rows={serviceRows} />
      </SectionCard>

      {/* 4 · Latest Persona Profile */}
      <SectionCard title="4 · Latest Persona Profile">
        <StatusBadge
          status={personaSaveStatus as 'idle' | 'saving' | 'saved' | 'failed'}
          label={`Save: ${personaSaveStatus}${savedPersonaProfileId ? ` · ${savedPersonaProfileId.slice(0, 8)}…` : ''}`}
        />
        {personaSaveError && (
          <ErrorBox title="Persona save error" message={personaSaveError} />
        )}
        <JsonPreview value={personaProfile} emptyLabel="No persona profile submitted yet" />
      </SectionCard>

      {/* 5 · Latest Check-in Payload */}
      <SectionCard title="5 · Latest Check-in Payload">
        <StatusBadge
          status={checkInSaveStatus as 'idle' | 'saving' | 'saved' | 'failed'}
          label={`Save: ${checkInSaveStatus}${savedNightlyEntryId ? ` · ${savedNightlyEntryId.slice(0, 8)}…` : ''}`}
        />
        {checkInSaveError && (
          <ErrorBox title="Check-in save error" message={checkInSaveError} />
        )}
        <JsonPreview value={latestCheckInPayload} emptyLabel="No check-in submitted yet" />
      </SectionCard>

      {/* 6 · Latest Backend Response */}
      <SectionCard title="6 · Latest Backend Response (local mock)">
        <InfoTable
          rows={[
            { label: 'risk_level', value: latestRiskLevel ?? '(none yet)', warn: latestRiskLevel === 'high' },
            { label: 'stone_command blocked', value: String(latestStoneBlocked), warn: latestStoneBlocked },
          ]}
        />
        <JsonPreview value={latestResponseText} emptyLabel="No backend response yet" />
      </SectionCard>

      {/* 7 · Latest Stone Command */}
      <SectionCard title="7 · Latest Stone Command">
        <JsonPreview
          value={latestStoneCommand}
          emptyLabel={latestStoneBlocked ? 'Blocked — crisis safety guard (CRISIS state)' : 'No stone command yet'}
        />
      </SectionCard>

      {/* 8 · Device Telemetry (wellness experimental, not medical) */}
      <SectionCard
        title="8 · Device Telemetry"
        subtitle="Manual entry only — pulse estimate & BP estimate (experimental wellness telemetry, not a medical device reading)."
      >
        <Text style={[styles.telemetryLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          Pulse estimate
        </Text>
        <TextQuestion
          label="Pulse estimate (bpm)"
          value={pulseInput}
          onChange={setPulseInput}
          placeholder="e.g. 72"
          keyboardType="default"
        />
        <AppButton
          title="Save pulse estimate"
          onPress={handleSavePulse}
          loading={pulseStatus === 'saving'}
          variant="secondary"
        />
        <StatusBadge status={pulseStatus} label={`Pulse save: ${pulseStatus}`} />

        <View style={styles.telemetrySpacer} />

        <Text style={[styles.telemetryLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          BP estimate — experimental
        </Text>
        <View style={styles.bpRow}>
          <View style={styles.bpField}>
            <TextQuestion
              label="Systolic"
              value={systolicInput}
              onChange={setSystolicInput}
              placeholder="e.g. 118"
            />
          </View>
          <View style={styles.bpField}>
            <TextQuestion
              label="Diastolic"
              value={diastolicInput}
              onChange={setDiastolicInput}
              placeholder="e.g. 76"
            />
          </View>
        </View>
        <AppButton
          title="Save BP estimate"
          onPress={handleSaveBp}
          loading={bpStatus === 'saving'}
          variant="secondary"
        />
        <StatusBadge status={bpStatus} label={`BP save: ${bpStatus}`} />

        {telemetryError && <ErrorBox title="Telemetry save error" message={telemetryError} />}

        <View style={styles.telemetrySpacer} />

        <Text style={[styles.telemetryLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          Latest reading
        </Text>
        {!latestReadingLoaded ? (
          <Text style={[styles.telemetryHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Loading…
          </Text>
        ) : latestReading ? (
          <>
            <InfoTable
              rows={[
                { label: 'measurement type', value: latestReading.measurement_type },
                { label: 'value', value: formatTelemetryValue(latestReading), mono: true },
                { label: 'source', value: latestReading.source },
                { label: 'regulatory label', value: latestReading.regulatory_label },
                { label: 'captured at', value: latestReading.captured_at },
              ]}
            />
            <JsonPreview value={latestReading} emptyLabel="No telemetry reading yet" />
          </>
        ) : (
          <Text style={[styles.telemetryHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            No telemetry readings yet.
          </Text>
        )}

        <Text style={[styles.telemetryDisclaimer, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Wellness telemetry only — experimental, not a medical device reading. Not for diagnosis or treatment.
        </Text>
      </SectionCard>

      {/* 9 · BLE Status */}
      <SectionCard title="9 · BLE Status" bordered={false}>
        <InfoTable rows={bleRows} />
      </SectionCard>

      {/* Test all states */}
      <AppButton
        title="Test all states →"
        onPress={() => router.push('/test-states')}
        variant="secondary"
      />

      {/* SAI-22 — V2 Simulator */}
      <AppButton
        title="Simulator V2 →"
        onPress={() => router.push('/simulator')}
        variant="secondary"
      />

      {/* Back Home */}
      <AppButton
        title="Back Home"
        onPress={() => router.replace('/')}
        variant="secondary"
      />
    </AppScreen>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 4 },
  heading: { fontSize: 26, letterSpacing: -0.4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, letterSpacing: 0.8 },
  table: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowLabel: { fontSize: 13, flex: 1 },
  rowValue: { textAlign: 'right', flexShrink: 1, maxWidth: '60%' },
  errorBox: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 4 },
  errorLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  errorMsg: { fontSize: 13, lineHeight: 19 },
  telemetryLabel: { fontSize: 13 },
  telemetryHint: { fontSize: 13, fontStyle: 'italic' },
  telemetrySpacer: { height: 4 },
  telemetryDisclaimer: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  bpRow: { flexDirection: 'row', gap: 10 },
  bpField: { flex: 1 },
});
