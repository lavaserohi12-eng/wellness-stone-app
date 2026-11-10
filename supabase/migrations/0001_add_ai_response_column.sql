-- SAI-7 — additive, non-destructive migration.
--
-- Adds ONE nullable jsonb column to the REAL live `nightly_entries` table to
-- hold the Edge Function's output (matches WellnessResponse in
-- artifacts/ai-wellness-stone/src/types/wellness.ts: intent, risk_level,
-- detected_state, confidence, response_text, suggested_device_state).
--
-- Does NOT rename, drop, or restructure anything. Does NOT touch existing
-- rows (they will simply have ai_response = null until reprocessed).
--
-- Run this in the SQL editor of the CORRECT project: ai-wellness-stone-dev
-- (qecdeyzqgrszbvpsrqwm) — NOT any other project in the org.

alter table nightly_entries
  add column if not exists ai_response jsonb;
