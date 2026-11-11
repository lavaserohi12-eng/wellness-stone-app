-- SAI-9 — live schema hygiene & vocabulary discipline.
--
-- The ticket text described `emotional_checkins` / `persona_memory` — those
-- tables do not exist in this project (same phantom-schema issue as
-- SAI-6/SAI-7: a different, unrelated Supabase project). Confirmed via REST
-- (404 Could not find the table) before writing this migration. Applying the
-- SAME intent (range guards + vocabulary discipline, no columns removed, no
-- new contract) to the REAL live tables: nightly_entries / persona_profiles.
--
-- Run this in the SQL editor of the CORRECT project: ai-wellness-stone-dev
-- (qecdeyzqgrszbvpsrqwm) — NOT any other project in the org.

-- 1) RANGE GUARDS — stop out-of-range slider values from landing.
-- Ranges match the documented contract in
-- artifacts/ai-wellness-stone/src/types/wellness.ts (validateCheckIn).
alter table nightly_entries
  add constraint intensity_range            check (intensity between 0 and 10),
  add constraint body_activation_range      check (body_activation between 0 and 10),
  add constraint thought_loop_range         check (thought_loop between 0 and 10),
  add constraint energy_level_range         check (energy_level between 0 and 10),
  add constraint sleep_readiness_range      check (sleep_readiness between 0 and 10),
  add constraint valence_score_range        check (valence_score is null or valence_score between -5 and 5),
  add constraint arousal_score_range        check (arousal_score is null or arousal_score between 0 and 10),
  add constraint social_connectedness_range check (social_connectedness is null or social_connectedness between 0 and 10);

-- 2) NORMALIZE + CONSTRAIN mood_label.
-- Existing rows were confirmed already clean (lower snake_case: 'angry',
-- 'anxious', 'lonely') before this migration was written, so no drift to fix
-- yet — but lock it to the known MoodLabel set now so it can't drift later.
-- The app (checkInService.ts) and Edge Function also lower/trim at write time.
update nightly_entries set mood_label = lower(trim(mood_label)) where mood_label is not null;

alter table nightly_entries add constraint mood_label_known check (
  mood_label in ('calm','anxious','sad','overwhelmed','angry','lonely','numb','hopeful','other'));

-- 3) FIRMWARE-SAFE stone command — optional DB backstop for the value that
-- actually drives the physical Stone. Real enforcement lives in the Edge
-- Function (process-checkin-v0's buildDeviceState), which now clamps
-- color/haptic_pattern to this same firmware-approved set before writing
-- ai_response. NULL / missing suggested_device_state passes (e.g. the
-- high_risk_stub state intentionally sends no device command).
alter table nightly_entries add constraint ai_response_color_ok check (
  ai_response is null
  or ai_response->'suggested_device_state' is null
  or (ai_response->'suggested_device_state'->>'color') in
     ('soft_blue','warm_amber','warm_white','soft_green','lavender','rose','none')
);
alter table nightly_entries add constraint ai_response_haptic_ok check (
  ai_response is null
  or ai_response->'suggested_device_state' is null
  or (ai_response->'suggested_device_state'->>'haptic_pattern') in
     ('slow_heartbeat','breathing_wave','soft_pulse','long_exhale','none')
);

-- Not applicable to this schema (no such columns/feature exist yet, nothing
-- to normalize): response_feedback, response_feedback_at, companion_response,
-- app_version, persona_memory.summary/soothing_style/known_patterns.
-- companion_response ownership is already single-owner by construction: only
-- the process-checkin-v0 Edge Function writes ai_response.response_text; the
-- client's local mock text is transient in-memory state, never persisted to
-- a column of its own.
