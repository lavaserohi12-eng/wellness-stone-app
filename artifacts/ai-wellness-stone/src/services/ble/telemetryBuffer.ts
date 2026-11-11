// src/services/ble/telemetryBuffer.ts
//
// SAI-19 — Validate incoming TelemetryFrames, group by session, downsample to
// ~1 reading/sec per (session, type), then flush to device_telemetry_readings.
//
// Flush is triggered every 10 s by startFlushTimer() and at session end via
// flushTelemetry(). Call stopFlushTimer() when the app goes to background /
// the session ends.

import { MeasurementType, TelemetryFrame } from '../../types/stoneTelemetry';
import { supabase } from '../supabaseClient';

// Allowed measurement types — unknown types are dropped silently for safety.
const ALLOWED = new Set<MeasurementType>([
  'hr_bpm', 'spo2_percent', 'hrv_ms', 'eda_microsiemens', 'skin_temp_c',
  'ambient_temp_c', 'touch_force', 'squeeze_event', 'battery_level',
  'ble_rssi', 'session_duration_s',
  // legacy
  'pulse_estimate_bpm', 'bp_estimate',
]);

interface BufferedReading {
  session_id: string;
  device_id: string;
  measurement_type: MeasurementType;
  value: number;
  unit: string;
  confidence?: number;
  seq: number;
  captured_at: string;
  source: 'stone_ble' | 'simulator';
}

let buffer: BufferedReading[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

// All current transports are mocks. A future real BLE adapter must pass
// source='stone_ble' explicitly so generated readings never impersonate hardware.
export function onTelemetryFrame(frame: TelemetryFrame, source: 'stone_ble' | 'simulator' = 'simulator'): void {
  if (frame.protocol_version !== '2.0') return;   // reject unknown protocol versions

  for (const r of frame.readings) {
    if (!ALLOWED.has(r.measurement_type)) continue; // drop unknown types safely

    buffer.push({
      session_id: frame.session_id,
      device_id: frame.device_id,
      measurement_type: r.measurement_type,
      value: r.value,
      unit: r.unit,
      confidence: r.confidence,
      seq: frame.seq,
      captured_at: frame.captured_at,
      source,
    });
  }
}

// Downsample: keep the LAST reading per (session_id, measurement_type, second).
// This limits inserts to ~1 row/sec/type regardless of how often the device sends.
export async function flushTelemetry(): Promise<void> {
  if (buffer.length === 0) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // never write unscoped rows

  const seen = new Map<string, BufferedReading>();
  for (const r of buffer) {
    // Key on second-granularity timestamp so bursts within the same second merge.
    const key = `${r.session_id}|${r.measurement_type}|${r.captured_at.slice(0, 19)}`;
    seen.set(key, r); // last writer wins — most recent value for that second
  }
  buffer = [];

  const rows = [...seen.values()].map((r) => ({
    user_id: user.id,
    device_id: r.device_id,
    session_id: r.session_id,
    source: r.source,
    is_synthetic: r.source === 'simulator',
    measurement_type: r.measurement_type,
    value_numeric: r.value,
    value_json: { unit: r.unit, confidence: r.confidence, seq: r.seq },
    confidence: r.confidence ?? null,
    captured_at: r.captured_at,
    regulatory_label: 'wellness_experimental_not_medical',
  }));

  if (rows.length > 0) {
    const { error } = await supabase.from('device_telemetry_readings').insert(rows);
    if (error) throw error;
  }
}

// Start a 10-second periodic flush. Call once when a BLE session begins.
export function startFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flushTelemetry().catch((err) =>
      console.warn('[telemetryBuffer] periodic flush error:', err),
    );
  }, 10_000);
}

// Stop the timer and do a final flush. Call at session end or app background.
export async function stopFlushTimer(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  await flushTelemetry();
}
