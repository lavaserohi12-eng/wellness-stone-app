// deviceTelemetryService.ts
//
// SAI-23: Supabase (`device_telemetry_readings`) is the PRODUCT source of truth
// for all device telemetry. The parallel Wi-Fi → Google Apps Script → Google Sheets
// path is a FIRMWARE DEBUG fallback for Mani only — it is not read by the app,
// not read by OpenAI, and carries no product authority.
import {
  DeviceTelemetryReading,
  DeviceTelemetryRow,
  REGULATORY_LABEL,
} from '../types/telemetry';
import { getCurrentUserId, supabase } from './supabaseClient';

export async function saveTelemetryReading(reading: DeviceTelemetryReading): Promise<string> {
  const payload = {
    user_id: reading.user_id ?? (await getCurrentUserId()),
    device_id: reading.device_id ?? null,
    session_id: reading.session_id ?? null,
    source: reading.source,
    measurement_type: reading.measurement_type,
    value_numeric: reading.value_numeric ?? null,
    value_json: reading.value_json ?? null,
    unit: reading.unit ?? null,
    quality_score: reading.quality_score ?? null,
    captured_at: reading.captured_at ?? new Date().toISOString(),
    firmware_version: reading.firmware_version ?? null,
    raw_packet_json: reading.raw_packet_json ?? null,
    regulatory_label: reading.regulatory_label ?? REGULATORY_LABEL,
    is_synthetic: reading.is_synthetic ?? false,
  };

  const { data, error } = await supabase
    .from('device_telemetry_readings')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error('[deviceTelemetryService] saveTelemetryReading failed:', error.message);
    throw new Error(error.message);
  }

  if (!data) throw new Error('No row returned from device_telemetry_readings insert');
  return (data as Record<string, unknown>).id as string;
}

export const savePulseEstimateBpm = (bpm: number, qualityScore = 80) =>
  saveTelemetryReading({
    source: 'manual_debug',
    measurement_type: 'pulse_estimate_bpm',
    value_numeric: bpm,
    unit: 'bpm',
    quality_score: qualityScore,
  });

export const saveBpEstimate = (systolic: number, diastolic: number, qualityScore = 60) =>
  saveTelemetryReading({
    source: 'manual_debug',
    measurement_type: 'bp_estimate',
    value_json: { systolic, diastolic },
    unit: 'mmHg',
    quality_score: qualityScore,
  });

export async function fetchLatestTelemetryReading(
  userId?: string,
): Promise<DeviceTelemetryRow | null> {
  const uid = userId ?? (await getCurrentUserId());
  const { data, error } = await supabase
    .from('device_telemetry_readings')
    .select('*')
    .eq('user_id', uid)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[deviceTelemetryService] fetchLatestTelemetryReading failed:', error.message);
    throw new Error(error.message);
  }

  return (data as DeviceTelemetryRow | null) ?? null;
}
