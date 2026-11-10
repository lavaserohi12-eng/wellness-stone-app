// Local mock wellness response builder — instant, no model calls, no Edge Functions.
// Shown immediately on submit; replaced by the real response when the Edge Function
// and api-server respond. The crisis guard here is UX-only: it prevents a normal
// Stone command from briefly flashing before the authoritative Edge Function guard
// responds. Only the Edge Function writes safety_events.

import {
  CheckInPayload,
  PersonaProfile,
  WellnessResponse,
  mockResponseText,
} from '../types/wellness';
import {
  StoneState,
  StoneCommand,
  STATE_COMMANDS,
  validateStoneCommand,
} from '../types/stoneCommand';
import { assessRisk } from './safety';
import { safeCompanionResponse } from './crisisResources';

type ActiveState = Exclude<StoneState, 'CRISIS'>;

// Mirrors classify() in api-server/wellness.ts and process-checkin-v0 — keep in sync.
function detectState(checkIn: CheckInPayload): ActiveState {
  const mood = checkIn.mood_label;
  const intensity = checkIn.intensity ?? 0;
  const bodyActivation = checkIn.body_activation ?? 0;
  const social = checkIn.social_connectedness ?? 5;
  const sleep = checkIn.sleep_readiness ?? 5;

  // Direct mood_label matches first (SAI-13 eval fix)
  if (mood === 'anxious') return 'ANXIETY';
  if (mood === 'overwhelmed' || mood === 'angry') return 'ACADEMIC_STRESS';
  if (mood === 'lonely') return 'LONELINESS';
  if (mood === 'sad' || mood === 'numb') return 'LOW_MOOD';

  // Derived-signal fallbacks
  if (intensity >= 8) return 'ACADEMIC_STRESS';
  if (bodyActivation >= 7) return 'BODY_TENSION';
  if (social <= 2) return 'LONELINESS';
  if (sleep <= 2) return 'SLEEP_RUMINATION';
  return 'GENERAL_SUPPORT';
}

function buildMockStoneCommand(state: ActiveState, stonePref?: string): StoneCommand {
  const base = STATE_COMMANDS[state];
  let cmd: StoneCommand['cmd'] = base.cmd;
  let haptic = base.haptic;
  let light = base.light;
  let intensity = base.intensity;
  const duration_s = base.duration_s;

  switch (stonePref) {
    case 'softer':     intensity = Math.max(0, intensity * 0.6); break;
    case 'stronger':   intensity = Math.min(1, intensity * 1.3); break;
    case 'light_only': haptic = 'none'; break;
    case 'haptic_only': light = 'none'; break;
    case 'no_stone':   cmd = 'off'; haptic = 'none'; light = 'none'; intensity = 0; break;
  }

  return validateStoneCommand({ version: 1, cmd, state, haptic, light, duration_s, intensity });
}

export function buildMockWellnessResponse(
  checkIn: CheckInPayload,
  // persona is accepted for API compatibility; not used in the mock yet
  _persona?: PersonaProfile,
): WellnessResponse {
  const risk = assessRisk(checkIn.free_text);
  if (risk.level === 'high') {
    return {
      state: 'CRISIS',
      risk_level: 'high',
      companion_response: safeCompanionResponse(undefined),
      stoneCommand: validateStoneCommand({
        version: 1,
        cmd: 'safety_mode',
        state: 'CRISIS',
        haptic: 'none',
        light: 'dim_warm_glow',
        duration_s: 0,
        intensity: 0,
      }),
    };
  }

  const state = detectState(checkIn);
  return {
    state,
    risk_level: 'low',
    companion_response: mockResponseText(checkIn),
    stoneCommand: buildMockStoneCommand(state, checkIn.stone_preference),
  };
}
