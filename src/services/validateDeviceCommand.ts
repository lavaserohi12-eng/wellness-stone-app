import { DeviceCommand } from '../types/wellness';

// TS can't enforce numeric ranges at runtime, and a model can return bad numbers.
// This clamps the command before it reaches the hardware.
const RANGES = {
  intensity: [0, 100],
  breathing_period_ms: [2000, 12000],
  haptic_bpm: [40, 90],
  duration_sec: [30, 600],
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
