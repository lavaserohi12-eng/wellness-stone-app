// Calls the api-server's `/wellness/respond` route to upgrade an already-
// saved nightly_entries row to a real, personalized AI response (reads the
// free-text journal entry, not just fixed structured fields).
//
// This is a SECOND call, made only after `process-checkin-v0` has already
// run and confirmed the note is not high-risk — the Edge Function's crisis
// guard remains authoritative and this call never runs ahead of it.

import { config } from '../config/env';
import { WellnessResponse } from '../types/wellness';
import { ensureSession } from './supabaseClient';

export async function fetchAiWellnessResponse(checkinId: string): Promise<WellnessResponse> {
  if (!config.apiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured');
  }
  const base = config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl : `${config.apiBaseUrl}/`;
  const url = `${base}wellness/respond`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${(await ensureSession()).access_token}`,
    },
    body: JSON.stringify({ checkin_id: checkinId }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = (body && typeof body === 'object' && 'error' in body)
      ? String((body as Record<string, unknown>).error)
      : `wellness/respond responded with ${res.status}`;
    throw new Error(message);
  }

  if (!body || typeof body !== 'object' || !('companion_response' in body) || !('state' in body)) {
    throw new Error('wellness/respond returned an unexpected shape');
  }

  return body as WellnessResponse;
}

// SAI-12 — response feedback (Helped / Neutral / Didn't help), used to evolve
// the user's persona notes for future AI responses.
export type ResponseFeedback = 'helped' | 'neutral' | 'not_helped';

export async function submitWellnessFeedback(
  checkinId: string,
  feedback: ResponseFeedback,
): Promise<void> {
  if (!config.apiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured');
  }
  const base = config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl : `${config.apiBaseUrl}/`;
  const url = `${base}wellness/feedback`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${(await ensureSession()).access_token}`,
    },
    body: JSON.stringify({ checkin_id: checkinId, feedback }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = (body && typeof body === 'object' && 'error' in body)
      ? String((body as Record<string, unknown>).error)
      : `wellness/feedback responded with ${res.status}`;
    throw new Error(message);
  }
}
