import { AssistantResponse, CheckInPayload, SCHEMA_VERSION } from '../types/wellness';

const MOCK_RESPONSE: AssistantResponse = {
  schemaVersion: SCHEMA_VERSION,
  responseText:
    'You seem mentally activated tonight. Let\u2019s slow the loop down for two minutes.',
  deviceCommand: {
    color: 'soft_blue',
    breathing_period_ms: 6000,
    haptic_pattern: 'slow_heartbeat',
    haptic_bpm: 54,
    intensity: 35,
    duration_sec: 120,
  },
};

// Feature 1: returns a hardcoded mock. Feature 3+: replace ONLY the body with a
// Supabase Edge Function / Grok call. Signature and return type must NOT change.
export async function getAssistantResponse(
  _payload?: CheckInPayload
): Promise<AssistantResponse> {
  return MOCK_RESPONSE;
}
