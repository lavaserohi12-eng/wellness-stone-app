import { config } from '../config/env';
import { ensureSession } from './supabaseClient';

// Calls the api-server data routes (GET /api/data/export, POST /api/data/delete).
// Auth: the user's Supabase JWT is forwarded as a Bearer token so the server
// can resolve the caller's real user_id without trusting any body param.
async function callDataApi(
  method: 'GET' | 'POST',
  path: '/data/export' | '/data/delete',
): Promise<unknown> {
  const session = await ensureSession();
  const url = `${config.apiBaseUrl}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (body as { error?: string }).error ?? `data ${path} failed (${res.status})`,
    );
  }
  return body;
}

export function exportMyData(): Promise<Record<string, unknown>> {
  return callDataApi('GET', '/data/export') as Promise<Record<string, unknown>>;
}

export function deleteMyData(): Promise<{ deleted: Record<string, number> }> {
  return callDataApi('POST', '/data/delete') as Promise<{ deleted: Record<string, number> }>;
}
