-- SAI-8 fix — device_telemetry_readings was created with Supabase's default
-- row-level security enabled but no policies, so every insert from the app's
-- anon key was rejected with "new row violates row-level security policy".
--
-- This app has no auth yet (fixed DEV_USER_ID, matching the existing
-- nightly_entries / persona_profiles tables), so match that same access
-- model for now: RLS off, anon-key read/write via the client SDK.
-- Revisit this once real auth + per-user RLS policies land.
--
-- Run this in the SQL editor of the CORRECT project: ai-wellness-stone-dev
-- (qecdeyzqgrszbvpsrqwm) — NOT any other project in the org.

alter table device_telemetry_readings disable row level security;
