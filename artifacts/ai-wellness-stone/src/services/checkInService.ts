import { CheckInPayload } from '../types/wellness';
import { getCurrentUserId, supabase } from './supabaseClient';

export async function saveNightlyCheckIn(payload: CheckInPayload): Promise<string> {
  const user_id = await getCurrentUserId();
  const { data, error } = await supabase
    .from('nightly_entries')
    .insert({
      user_id,
      schema_version: payload.schema_version,
      // Defensive normalize at write time (SAI-9) — mood_label is already a
      // closed MoodLabel union client-side, but normalize anyway so the DB
      // stays consistent even if that ever changes upstream.
      mood_label: payload.mood_label?.toLowerCase().trim() as typeof payload.mood_label,
      valence_score: payload.valence_score,
      arousal_score: payload.arousal_score,
      intensity: payload.intensity,
      body_activation: payload.body_activation,
      thought_loop: payload.thought_loop,
      energy_level: payload.energy_level,
      sleep_readiness: payload.sleep_readiness,
      social_connectedness: payload.social_connectedness,
      trigger_tag: payload.trigger_tag,
      support_need: payload.support_need,
      stone_preference: payload.stone_preference,
      free_text: payload.free_text,
      check_in_json: payload,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[checkInService] saveNightlyCheckIn failed:', error.message);
    throw new Error(error.message);
  }

  if (!data) throw new Error('No row returned from nightly_entries insert');
  return (data as Record<string, unknown>).id as string;
}

// Used by the reminder notification flow to decide whether tonight's
// check-in still needs to happen. "Today" is the device's local calendar
// day (midnight-to-midnight), not UTC — matches how a user thinks about
// "have I logged tonight yet".
export async function hasCheckedInToday(): Promise<boolean> {
  const user_id = await getCurrentUserId();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('nightly_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user_id)
    .gte('created_at', startOfToday.toISOString());

  if (error) {
    console.error('[checkInService] hasCheckedInToday failed:', error.message);
    throw new Error(error.message);
  }

  return (count ?? 0) > 0;
}
