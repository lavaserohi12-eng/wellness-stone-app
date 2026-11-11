// Calls the deployed `process-checkin-v0` Supabase Edge Function to get the
// real AI-generated WellnessResponse for a saved nightly_entries row.
// Falls back is handled by the caller (buildMockWellnessResponse) if this
// throws — no network calls happen anywhere else in the app.

import { config } from '../config/env';
import { WellnessResponse } from '../types/wellness';
import { ensureSession } from './supabaseClient';

export async function fetchWellnessResponse(checkinId: string): Promise<WellnessResponse> {
  const url = `${config.supabaseUrl}/functions/v1/process-checkin-v0`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${(await ensureSession()).access_token}`,
    },
    body: JSON.stringify({ checkin_id: checkinId, synthetic: false }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = (body && typeof body === 'object' && 'error' in body)
      ? String((body as Record<string, unknown>).error)
      : `process-checkin-v0 responded with ${res.status}`;
    throw new Error(message);
  }

  if (!body || typeof body !== 'object' || !('companion_response' in body) || !('state' in body)) {
    throw new Error('process-checkin-v0 returned an unexpected shape');
  }

  return body as WellnessResponse;
}
