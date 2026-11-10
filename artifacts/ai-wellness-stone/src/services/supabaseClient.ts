import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';

import { config } from '../config/env';

let client: SupabaseClient | undefined;
function getClient(): SupabaseClient {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('Supabase is not configured. See the repository setup instructions.');
  }
  return client ??= createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  });
}

// A fresh checkout should display setup guidance rather than crashing on import.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = getClient();
    const value = Reflect.get(instance, prop);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

// SAI-11 — every install gets a stable Supabase anonymous-auth identity
// (auth.uid()), used as user_id for every write (check-ins, persona,
// telemetry, consents). Session persists across restarts via AsyncStorage,
// so signInAnonymously() only actually runs once per install; subsequent
// launches reuse the restored session. Requires "Anonymous sign-ins" to be
// enabled in the Supabase dashboard (Authentication -> Providers) — done by
// hand, an agent cannot toggle this.
let ensureSessionPromise: Promise<Session> | null = null;

export async function ensureSession(): Promise<Session> {
  // Consult the SDK each time so refreshed access tokens reach the API.
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  if (!ensureSessionPromise) {
    ensureSessionPromise = (async () => {
      const { data: signInData, error } = await supabase.auth.signInAnonymously();
      if (error || !signInData.session) {
        // Allow a retry on the next call instead of caching a permanent failure
        // (e.g. anonymous sign-ins not yet enabled in the dashboard, or a
        // transient network error).
        throw new Error(error?.message ?? 'Anonymous sign-in returned no session');
      }
      return signInData.session;
    })().finally(() => { ensureSessionPromise = null; });
  }
  return ensureSessionPromise;
}

export async function getCurrentUserId(): Promise<string> {
  const session = await ensureSession();
  return session.user.id;
}
