// LiveSessionScreen — SAI-20
// Shows live mock telemetry via MockStoneTransport (SAI-19).
// Wellness-only language: all sensor values labelled "estimate".
// NO normal/high/low judgements, NO diagnosis, NO medical alerts.
// Screen is optional — the Stone works without it.

import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { AppButton } from '../components/AppButton';
import { AppScreen } from '../components/AppScreen';
import { BLEStatus, DeviceStatus } from '../components/DeviceStatus';
import { SectionCard } from '../components/SectionCard';
import {
  onTelemetryFrame,
  startFlushTimer,
  stopFlushTimer,
} from '../services/ble/telemetryBuffer';
import { getStoneDeviceTransport } from '../services/ble/stoneTransport';
import { TelemetryFrame } from '../types/stoneTelemetry';

// ---------------------------------------------------------------------------
// Experimental Wellness Score — transparent, non-medical formula.
// Inputs: HR estimate (normalized 40–100 bpm), SpO2 estimate, touch force,
// battery. Higher is calmer/more comfortable.
// ---------------------------------------------------------------------------
function computeWellnessScore(
  hr: number | null,
  spo2: number | null,
  touchForce: number | null,
): number | null {
  if (hr === null && spo2 === null) return null;

  // HR component: 60–75 bpm → 1.0; outside that range tapers off
  let hrScore = 1.0;
  if (hr !== null) {
    const mid = 67.5, spread = 20;
    hrScore = Math.max(0, 1 - Math.abs(hr - mid) / spread);
  }

  // SpO2 component: 95–100% → 1.0
  let spo2Score = hr !== null ? 0.9 : 1.0; // fallback when missing
  if (spo2 !== null) {
    spo2Score = Math.min(1, Math.max(0, (spo2 - 85) / 15));
  }

  // Touch force: lower pressure → calmer (inverted, optional)
  let touchScore = 0.7;
  if (touchForce !== null) {
    touchScore = Math.max(0, 1 - touchForce * 0.4);
  }

  const raw = hrScore * 0.45 + spo2Score * 0.35 + touchScore * 0.2;
  return Math.round(raw * 100);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(v: number | null, unit: string, decimals = 0): string {
  if (v === null) return '—';
  return `${v.toFixed(decimals)} ${unit}`;
}

function useTimer(running: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (ref.current) clearInterval(ref.current);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);
  return elapsed;
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function LiveSessionScreen() {
  const router = useRouter();
  const colors = useColors();

  const [bleStatus, setBLEStatus] = useState<BLEStatus>('disconnected');
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const [sessionActive, setSessionActive] = useState(false);

  // Latest values from telemetry
  const [hr, setHr] = useState<number | null>(null);
  const [spo2, setSpo2] = useState<number | null>(null);
  const [touchForce, setTouchForce] = useState<number | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [skinTemp, setSkinTemp] = useState<number | null>(null);
  const [eda, setEda] = useState<number | null>(null);

  const elapsed = useTimer(sessionActive);
  const wellnessScore = computeWellnessScore(hr, spo2, touchForce);

  const handleFrame = useCallback((frame: TelemetryFrame) => {
    onTelemetryFrame(frame); // buffer for Supabase flush
    setDeviceId(frame.device_id);
    for (const r of frame.readings) {
      switch (r.measurement_type) {
        case 'hr_bpm':            setHr(r.value); break;
        case 'spo2_percent':      setSpo2(r.value); break;
        case 'touch_force':       setTouchForce(r.value); break;
        case 'battery_level':     setBattery(r.value); break;
        case 'skin_temp_c':       setSkinTemp(r.value); break;
        case 'eda_microsiemens':  setEda(r.value); break;
      }
    }
  }, []);

  const startSession = useCallback(async () => {
    setBLEStatus('scanning');
    const transport = getStoneDeviceTransport();
    transport.onTelemetryFrame(handleFrame);
    await transport.connect();
    setBLEStatus('connected');
    setSessionActive(true);
    startFlushTimer();
  }, [handleFrame]);

  const endSession = useCallback(async () => {
    setSessionActive(false);
    setBLEStatus('disconnected');
    const transport = getStoneDeviceTransport();
    await transport.disconnect();
    await stopFlushTimer();
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (sessionActive) {
        getStoneDeviceTransport().disconnect().catch(() => {});
        stopFlushTimer().catch(() => {});
      }
    };
  }, [sessionActive]);

  return (
    <AppScreen scroll title="Live Session">
      {/* BLE Status */}
      <DeviceStatus status={bleStatus} deviceId={deviceId} />

      {/* Session timer + controls */}
      <SectionCard title="Session">
        <View style={styles.timerRow}>
          <Text style={[styles.timer, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            {formatTimer(elapsed)}
          </Text>
          {!sessionActive ? (
            <AppButton title="Start session" onPress={startSession} />
          ) : (
            <AppButton title="End session" onPress={endSession} variant="secondary" />
          )}
        </View>
      </SectionCard>

      {/* Experimental Wellness Score */}
      {sessionActive && wellnessScore !== null ? (
        <SectionCard title="Experimental Wellness Score">
          <Text style={[styles.scoreNote, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            A transparency score derived from movement + sensor estimates. Not a health measurement.
          </Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
              {wellnessScore}
            </Text>
            <Text style={[styles.scoreMax, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              / 100
            </Text>
          </View>
          <View style={[styles.scoreBar, { backgroundColor: colors.muted }]}>
            <View style={[styles.scoreBarFill, { width: `${wellnessScore}%` as `${number}%`, backgroundColor: colors.primary }]} />
          </View>
        </SectionCard>
      ) : null}

      {/* Sensor readings */}
      <SectionCard title="Sensor Estimates">
        <View style={styles.grid}>
          <MetricTile label="Heart rate estimate" value={fmt(hr, 'bpm')} colors={colors} />
          <MetricTile label="SpO₂ estimate" value={fmt(spo2, '%')} colors={colors} />
          <MetricTile label="Touch / squeeze" value={fmt(touchForce, '', 2)} colors={colors} />
          <MetricTile label="Battery" value={fmt(battery, '%')} colors={colors} />
          {skinTemp !== null && (
            <MetricTile label="Skin temp estimate" value={fmt(skinTemp, '°C', 1)} colors={colors} />
          )}
          {eda !== null && (
            <MetricTile label="Stress signal estimate" value={fmt(eda, 'μS', 2)} colors={colors} />
          )}
        </View>
        {!sessionActive && (
          <Text style={[styles.hint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Start a session to see live estimates.
          </Text>
        )}
      </SectionCard>

      {/* Disclaimer */}
      <Text style={[styles.disclaimer, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        All values are experimental wellness estimates. This is not a medical device and
        provides no clinical measurement, diagnosis, or health guidance.
      </Text>

      {/* Nav */}
      <View style={styles.actions}>
        <AppButton title="View 7-day trends" onPress={() => router.push('/trends')} variant="secondary" />
        <AppButton title="Back Home" onPress={() => router.replace('/')} variant="secondary" />
      </View>
    </AppScreen>
  );
}

// ---------------------------------------------------------------------------
// MetricTile
// ---------------------------------------------------------------------------
interface TileProps {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}

function MetricTile({ label, value, colors }: TileProps) {
  return (
    <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.tileLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        {label}
      </Text>
      <Text style={[styles.tileValue, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  timer: { fontSize: 36, letterSpacing: -1 },
  scoreNote: { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  scoreValue: { fontSize: 48, lineHeight: 52 },
  scoreMax: { fontSize: 20, paddingBottom: 6 },
  scoreBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  scoreBarFill: { height: 8, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '47%', borderRadius: 10, borderWidth: 1,
    padding: 12, gap: 4,
  },
  tileLabel: { fontSize: 11, lineHeight: 15 },
  tileValue: { fontSize: 22 },
  hint: { fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  disclaimer: { fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: 8 },
  actions: { gap: 10 },
});
