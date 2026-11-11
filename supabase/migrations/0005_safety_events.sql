-- SAI-10 — dedicated audit table for every crisis trigger. Reviewing triggers
-- (and reported misses) is how detection gets tuned, so this gets its own
-- clean log rather than a flag on nightly_entries.
--
-- Schema translated from the ticket's phantom `emotional_checkins` table onto
-- this project's real schema: checkin_id references nightly_entries(id), the
-- real live check-ins table (see replit.md "Architecture decisions" — the
-- ticket has repeatedly described a table that doesn't exist in this project;
-- this is the 4th occurrence of that drift, see .agents/memory).
--
-- note_excerpt is the most sensitive field stored here: it is truncated to
-- 280 chars by the writer (the Edge Function) and is subject to the SAI-11
-- consent/delete rules once those exist.

create table if not exists safety_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  checkin_id uuid references nightly_entries(id) on delete set null,
  risk_level text not null,                 -- v0 logs 'high' only
  matched_terms text[],                     -- which patterns fired (for tuning)
  note_excerpt text,                        -- SENSITIVE: truncated; subject to SAI-11 delete/consent
  action_taken text not null default 'blocked_response_shown_resources',
  resource_shown text,                      -- which crisis resource was displayed
  region text,
  created_at timestamptz not null default now()
);

create index if not exists idx_safety_events_time on safety_events(created_at desc);

-- This project has no auth (dev user model, per replit.md) and the anon key
-- is used directly from the client for every other table. safety_events is
-- only ever written by the Edge Function using the service-role key, and is
-- never read by the client (Developer Debug reads risk_level from the
-- ai_response the client already fetched, not from this table directly), so
-- RLS is disabled here to match the app's existing no-auth model — the same
-- reasoning as migration 0003 for device_telemetry_readings.
alter table safety_events disable row level security;
