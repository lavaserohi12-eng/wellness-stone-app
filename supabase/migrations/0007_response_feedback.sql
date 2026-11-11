-- SAI-12 — Response feedback + persona-note evolution.
--
-- Ticket described phantom fields (`response_feedback` on `emotional_checkins`,
-- a `persona_memory` table with `soothing_style`/`avoidances`). Translated onto
-- the REAL schema: `nightly_entries` (adds `response_feedback`) and
-- `persona_profiles` (adds `learned_notes`, a small evolving jsonb array of
-- short human-readable strings the AI-response prompt can consume next time —
-- same idea as the ticket's soothing_style/avoidances nudge, without inventing
-- a second profile table).
--
-- Run this in the SQL editor of the CORRECT project: ai-wellness-stone-dev
-- (qecdeyzqgrszbvpsrqwm) — NOT any other project in the org.

alter table nightly_entries
  add column if not exists response_feedback text
  check (response_feedback in ('helped', 'neutral', 'not_helped'));

alter table persona_profiles
  add column if not exists learned_notes jsonb not null default '[]'::jsonb;
