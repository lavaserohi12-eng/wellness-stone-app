// src/types/stoneTelemetry.ts
//
// V2 TELEMETRY CONTRACT — PROPOSED to Mani; NOT FROZEN.
// Pending firmware confirmation on:
//   - JSON vs binary framing
//   - seq (sequence number) support
//   - confidence field support
//   - exact MeasurementType vocabulary
//
// Do NOT build BLE parsing, dashboard UI, or model features against this
// shape until Mani confirms the above. Change only by version bump agreed
// with Mani (same process as StoneCommand v1).

export type MeasurementType =
  | "hr_bpm"
  | "spo2_percent"
  | "hrv_ms"
  | "eda_microsiemens"
  | "skin_temp_c"
  | "ambient_temp_c"
  | "touch_force"
  | "squeeze_event"
  | "battery_level"
  | "ble_rssi"
  | "session_duration_s"
  | "pulse_estimate_bpm"   // legacy — keep for backward compat with existing telemetry rows
  | "bp_estimate";         // legacy — keep for backward compat with existing telemetry rows
  // NOTE: eeg_band_power is intentionally excluded until Mani confirms real
  // scalp EEG hardware exists on V2. Do not add it as a placeholder.

export interface TelemetryReading {
  measurement_type: MeasurementType;
  value: number;
  unit: string;           // "bpm", "%", "microsiemens", "normalized", "ms", "°C", ...
  confidence?: number;    // 0..1 — signal quality; model/dashboard must down-weight low values
}

export interface TelemetryFrame {
  type: "telemetry_frame";
  protocol_version: "2.0";
  device_id: string;
  session_id: string;     // UUID — groups a session's readings for model summary
  seq: number;            // monotonically increasing; gaps indicate dropped BLE frames
  captured_at: string;    // ISO 8601
  readings: TelemetryReading[];
}

export interface DeviceStatusFrame {
  type: "device_status";
  device_id: string;
  firmware_version: string;
  battery_level: number;  // %
  ble_rssi?: number;
  captured_at: string;    // ISO 8601
}
