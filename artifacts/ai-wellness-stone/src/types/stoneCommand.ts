// src/types/stoneCommand.ts

// STONE COMMAND v1 — FROZEN contract. Matches Mani's Hardware V1: haptic + RGB LED.
// warmth_c and voice are RESERVED for a future v2 (the V1 board has no thermal
// element or speaker), so they are deliberately NOT in v1 — the contract equals
// what the device can execute today. Change only by version bump, agreed with Mani.

export type StoneState =
  | "ANXIETY" | "LONELINESS" | "ACADEMIC_STRESS" | "LOW_MOOD"
  | "SLEEP_RUMINATION" | "BODY_TENSION" | "GENERAL_SUPPORT" | "CRISIS";

export type Haptic =
  | "heartbeat_70bpm" | "heartbeat_60bpm" | "slow_pulse"
  | "breathing_wave" | "long_exhale" | "none";

export type Light =
  | "amber_breathe_4_6" | "amber_steady" | "blue_breathe_4_6"
  | "green_steady" | "dim_warm_glow" | "none";

export interface StoneCommand {
  version: 1;
  cmd: "soothe" | "safety_mode" | "off";
  state: StoneState;
  haptic: Haptic;
  light: Light;
  duration_s: number;   // 10..180 (for cmd="soothe")
  intensity: number;    // 0.0..1.0
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export function validateStoneCommand(c: StoneCommand): StoneCommand {
  if (c.cmd !== "soothe") return { ...c, intensity: 0 };   // safety_mode/off: no active output
  return { ...c, duration_s: clamp(Math.round(c.duration_s), 10, 180), intensity: clamp(c.intensity, 0, 1) };
}

// Code owns this mapping. The LLM never sets hardware.
export const STATE_COMMANDS: Record<StoneState, Omit<StoneCommand, "version" | "state">> = {
  ANXIETY:          { cmd:"soothe", haptic:"heartbeat_70bpm", light:"amber_breathe_4_6", duration_s:60, intensity:0.65 },
  LONELINESS:       { cmd:"soothe", haptic:"slow_pulse",      light:"amber_steady",      duration_s:60, intensity:0.50 },
  ACADEMIC_STRESS:  { cmd:"soothe", haptic:"long_exhale",     light:"blue_breathe_4_6",  duration_s:60, intensity:0.55 },
  LOW_MOOD:         { cmd:"soothe", haptic:"breathing_wave",  light:"dim_warm_glow",     duration_s:60, intensity:0.45 },
  SLEEP_RUMINATION: { cmd:"soothe", haptic:"long_exhale",     light:"dim_warm_glow",     duration_s:90, intensity:0.40 },
  BODY_TENSION:     { cmd:"soothe", haptic:"breathing_wave",  light:"amber_breathe_4_6", duration_s:60, intensity:0.60 },
  GENERAL_SUPPORT:  { cmd:"soothe", haptic:"slow_pulse",      light:"amber_steady",      duration_s:45, intensity:0.40 },
  CRISIS:           { cmd:"safety_mode", haptic:"none",       light:"dim_warm_glow",     duration_s:0,  intensity:0.0 },
};
