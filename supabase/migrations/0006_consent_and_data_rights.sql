-- SAI-11 — Consent + Data Export/Delete (with user scoping).
--
-- Ticket text again described phantom tables (`emotional_checkins`,
-- `persona_memory`, `users`) that do not exist in this project (5th
-- occurrence of this drift — see replit.md "Gotchas" and
-- .agents/memory/phantom-schema-tickets.md). Translated onto the real live
-- schema: nightly_entries / persona_profiles / safety_events /
-- device_telemetry_readings. There is no `users` table to alter — Supabase's
-- built-in `auth.users` (populated by anonymous auth) is the identity source;
-- `auth.uid()` is what every policy below checks against.
--
-- Run this in the SQL editor of the CORRECT project: ai-wellness-stone-dev
-- (qecdeyzqgrszbvpsrqwm) — NOT any other project in the org.
--
-- PREREQUISITE (do this FIRST, in the dashboard, before running this file):
-- Authentication -> Providers -> enable "Anonymous sign-ins". Without this,
-- the app's signInAnonymously() call fails and no session/auth.uid() exists,
-- so every policy below would block all client reads/writes.

-- ---------------------------------------------------------------------------
-- 1) Consent log — one row per grant/version; keep history, never overwrite.
-- ---------------------------------------------------------------------------
create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  policy_version text not null,
  wellness_disclaimer boolean not null,     -- "not medical/therapy/emergency"
  data_processing boolean not null,         -- store my check-ins to personalise
  granted_at timestamptz not null default now()
);

create index if not exists idx_consents_user_time on consents(user_id, granted_at desc);

-- ---------------------------------------------------------------------------
-- 2) Deletion audit — proves a delete happened WITHOUT keeping the data.
-- ---------------------------------------------------------------------------
create table if not exists deletion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  row_counts jsonb
);

-- ---------------------------------------------------------------------------
-- 3) RLS — each user only sees/changes their own rows. Uses the REAL table
-- names, not the ticket's phantom ones.
--
-- device_telemetry_readings and safety_events previously had RLS disabled
-- (migrations 0003, 0005) because the app had no auth yet and the anon key
-- wrote directly with a fixed DEV_USER_ID. Now that anonymous auth exists,
-- device_telemetry_readings gets RLS re-enabled with an owner policy.
-- safety_events stays read-only for users (only the Edge Function's
-- service-role key writes it, which bypasses RLS entirely) — same shape as
-- the ticket's own `own_safety ... for select` policy.
-- ---------------------------------------------------------------------------
alter table nightly_entries            enable row level security;
alter table persona_profiles           enable row level security;
alter table safety_events              enable row level security;
alter table device_telemetry_readings  enable row level security;
alter table consents                   enable row level security;
alter table deletion_events            enable row level security;

drop policy if exists own_checkins on nightly_entries;
create policy own_checkins on nightly_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists own_persona on persona_profiles;
create policy own_persona on persona_profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists own_safety on safety_events;
create policy own_safety on safety_events for select
  using (auth.uid() = user_id);

drop policy if exists own_telemetry on device_telemetry_readings;
create policy own_telemetry on device_telemetry_readings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists own_consents on consents;
create policy own_consents on consents for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- deletion_events has no user-facing policy at all: it is written and read
-- only by the data-controls Edge Function via the service-role key (which
-- bypasses RLS), so the safe default is "authenticated users see nothing
-- here" — the same posture as safety_events' write side.

-- ---------------------------------------------------------------------------
-- LEGACY ROWS DECISION (recorded per ticket's required "legacy-rows
-- decision"): existing rows in nightly_entries / persona_profiles /
-- device_telemetry_readings were inserted with a fixed dev placeholder
-- user_id ('00000000-0000-0000-0000-000000000001'), and there is no
-- corresponding row in auth.users for it (Supabase anonymous auth creates a
-- new auth.users row per real installation, none of which will ever be that
-- id). Decision: treat these as pre-pilot TEST DATA. No migration/backfill —
-- once RLS is enabled above, they simply become invisible to every real
-- authenticated user (they still exist for admin/service-role access, e.g.
-- via the Supabase dashboard or a future admin tool). They are intentionally
-- NOT associated to a real user and NOT exposed through any real-user
-- feature.
