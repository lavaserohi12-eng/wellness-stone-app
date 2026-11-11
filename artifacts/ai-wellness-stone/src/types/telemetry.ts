// ============================================================
// AI Wellness Stone — Device Telemetry Contract (SAI-8)
// ============================================================
//
// Wellness telemetry only — NOT a medical device reading.
// Every row is written with regulatory_label = 'wellness_experimental_not_medical'.
// UI copy must say "pulse estimate" / "BP estimate — experimental" /
// "wellness telemetry" — never "medical-grade", "hypertension",
// "normal/high/low", "diagnose", "treat", or trigger alerts.

export type TelemetrySource =
  | 'stone_ble' | 'manual_debug' | 'simulator' | 'apple_health' | 'synthetic';

export type MeasurementType =
  | 'pulse_estimate_bpm' | 'bp_estimate' | 'skin_temp_c'
  | 'touch_force' | 'squeeze_event' | 'battery_level';

export const REGULATORY_LABEL = 'wellness_experimental_not_medical' as const;

export interface DeviceTelemetryReading {
  user_id?: string;                 // uuid; defaults to the current anonymous-auth user (SAI-11)
  device_id?: string | null;
  session_id?: string | null;
  source: TelemetrySource;
  measurement_type: MeasurementType;
  value_numeric?: number | null;
  value_json?: Record<string, unknown> | null;
  unit?: string | null;
  quality_score?: number | null;    // 0..100
  captured_at?: string;
  firmware_version?: string | null;
  raw_packet_json?: Record<string, unknown> | null;
  regulatory_label?: typeof REGULATORY_LABEL;
  is_synthetic?: boolean;
}

// ---- persisted row shape (as read back from Supabase) ----
export interface DeviceTelemetryRow {
  id: string;
  user_id: string;
  device_id: string | null;
  session_id: string | null;
  source: TelemetrySource;
  measurement_type: MeasurementType;
  value_numeric: number | null;
  value_json: Record<string, unknown> | null;
  unit: string | null;
  quality_score: number | null;
  captured_at: string;
  received_at: string;
  firmware_version: string | null;
  raw_packet_json: Record<string, unknown> | null;
  regulatory_label: string;
  is_synthetic: boolean;
  created_at: string;
}

export interface BpEstimateValue {
  systolic: number;
  diastolic: number;
}
