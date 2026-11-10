import { getCurrentUserId, supabase } from './supabaseClient';

// SAI-11 — bump this whenever the disclaimer/data-processing copy changes so
// existing grants stop counting as valid consent and users are re-prompted.
// Bumped for SAI-14 — added third-party AI (OpenAI) processing disclosure.
export const POLICY_VERSION = '2026-07-06';

export interface ConsentRecord {
  policy_version: string;
  wellness_disclaimer: boolean;
  data_processing: boolean;
  granted_at: string;
}

// True only if the user has an on-file consent row for the CURRENT policy
// version with both flags granted. An older policy_version (or a row with
// either flag false) does not count — the check-in flow re-gates until the
// user re-consents.
export async function hasConsent(): Promise<boolean> {
  const user_id = await getCurrentUserId();
  const { data, error } = await supabase
    .from('consents')
    .select('policy_version, wellness_disclaimer, data_processing')
    .eq('user_id', user_id)
    .eq('policy_version', POLICY_VERSION)
    .order('granted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[consentService] hasConsent check failed:', error.message);
    // Fail closed: if we can't confirm consent, treat it as not granted
    // rather than silently letting the check-in flow proceed.
    return false;
  }

  return !!data && data.wellness_disclaimer === true && data.data_processing === true;
}

export async function grantConsent(): Promise<void> {
  const user_id = await getCurrentUserId();
  const { error } = await supabase.from('consents').insert({
    user_id,
    policy_version: POLICY_VERSION,
    wellness_disclaimer: true,
    data_processing: true,
  });

  if (error) {
    console.error('[consentService] grantConsent failed:', error.message);
    throw new Error(error.message);
  }
}
