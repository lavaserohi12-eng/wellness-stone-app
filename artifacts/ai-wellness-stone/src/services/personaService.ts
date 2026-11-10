import { PersonaProfile } from '../types/wellness';
import { getCurrentUserId, supabase } from './supabaseClient';

export async function savePersonaProfile(profile: PersonaProfile): Promise<string> {
  const s = profile.sensory_profile;
  const user_id = await getCurrentUserId();

  const { data, error } = await supabase
    .from('persona_profiles')
    .insert({
      user_id,
      schema_version: profile.schema_version,
      profile_json: profile,
      personalization_consent: profile.personalization_consent,
      primary_goal: profile.primary_goal,
      preferred_tone: profile.support_style?.preferred_tone,
      preferred_haptic_pattern: s?.preferred_haptic_pattern,
      preferred_haptic_intensity: s?.preferred_haptic_intensity,
      max_haptic_intensity: s?.max_haptic_intensity,
      preferred_light_color: s?.preferred_light_color,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[personaService] savePersonaProfile failed:', error.message);
    throw new Error(error.message);
  }

  if (!data) throw new Error('No row returned from persona_profiles insert');
  return (data as Record<string, unknown>).id as string;
}

// Used by the reminder notification flow, which needs preferred_checkin_time
// even on a cold app launch, before PersonaContext has been populated by any
// screen visit. Returns the most recently saved profile for the current
// user, or null if they haven't completed onboarding yet.
export async function fetchLatestPersonaProfile(): Promise<PersonaProfile | null> {
  const user_id = await getCurrentUserId();
  const { data, error } = await supabase
    .from('persona_profiles')
    .select('profile_json')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[personaService] fetchLatestPersonaProfile failed:', error.message);
    throw new Error(error.message);
  }

  if (!data) return null;
  return (data as Record<string, unknown>).profile_json as PersonaProfile;
}
