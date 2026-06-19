// AI Wellness Stone — Data Contract v1. Single source of truth. Do not redefine elsewhere.

export const SCHEMA_VERSION = 1 as const;

export type SupportNeed = 'low' | 'medium' | 'high';

// Must match the Stone firmware color table. Add a value here AND in firmware.
export type StoneColor = 'soft_blue' | 'warm_amber' | 'deep_green' | 'soft_white' | 'rose';

// Must match the Stone firmware haptic-pattern table.
export type HapticPattern = 'slow_heartbeat' | 'steady_breath' | 'gentle_pulse' | 'none';

export interface CheckInPayload {     // app -> backend
  schemaVersion: number;
  mood: string;
  intensity: number;        // 0-100
  bodyActivation: number;   // 0-100
  thoughtLoop: boolean;
  sleepReadiness: number;   // 0-100
  supportNeed: SupportNeed;
  createdAt: string;        // ISO 8601
}

export interface DeviceCommand {      // backend -> device (serialized to firmware)
  color: StoneColor;
  breathing_period_ms: number; // 2000-12000
  haptic_pattern: HapticPattern;
  haptic_bpm: number;          // 40-90
  intensity: number;           // 0-100
  duration_sec: number;        // 30-600
}

export interface AssistantResponse {  // backend -> app
  schemaVersion: number;
  responseText: string;
  deviceCommand: DeviceCommand;
}
