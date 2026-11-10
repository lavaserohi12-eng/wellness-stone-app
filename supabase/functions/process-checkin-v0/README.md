# process-checkin-v0

SAI-7 Edge Function. Reads a `nightly_entries` row (+ that user's
`persona_profiles` row, if present), classifies a `detected_state`, builds a
personalized `suggested_device_state`, and writes the result into the
additive `ai_response` column as a `WellnessResponse` (matches the contract
already defined in
`artifacts/ai-wellness-stone/src/types/wellness.ts`).

This version targets the REAL live schema (`nightly_entries` /
`persona_profiles`, Data Contract v2, locked by SAI-5). An earlier version of
this function targeted `emotional_checkins` / `persona_memory` — tables that
were investigated in a DIFFERENT, unrelated Supabase project by mistake and
do not exist in the real project. Superseded.

## 1. Run the migration first

Run `supabase/migrations/0001_add_ai_response_column.sql` in the SQL editor
of the CORRECT project — **ai-wellness-stone-dev** (`qecdeyzqgrszbvpsrqwm`).
Double-check the project ref in the dashboard URL before running any SQL;
this project has more than one Supabase project in the org and it's easy to
run SQL against the wrong one.

This adds one nullable `ai_response jsonb` column to `nightly_entries`. It
does not rename, drop, or restructure anything, and does not touch existing
rows.

## 2. Deploy

This Replit environment has no Supabase CLI link to your project (no
`supabase/config.toml`, no linked project ref), so deployment has to happen
from your machine or the Supabase Dashboard — it can't be run from here.

**Option A — Supabase Dashboard**
1. Project → Edge Functions → Create a new function named `process-checkin-v0`.
2. Paste the contents of `index.ts` into the editor and deploy.
3. Project → Edge Functions → `process-checkin-v0` → Secrets: confirm
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set (Supabase sets
   `SUPABASE_URL` automatically for you; you must add
   `SUPABASE_SERVICE_ROLE_KEY` yourself from Project Settings → API).

**Option B — Supabase CLI (from your own machine, not Replit)**
```
supabase login
supabase link --project-ref qecdeyzqgrszbvpsrqwm
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
supabase functions deploy process-checkin-v0
```

## Test against SAI-6 staging data (safe, no live rows touched)

First load `synthetic-data/staging_tables.sql`, then
`synthetic-data/insert_synthetic_nightly_entries.txt` and
`synthetic-data/insert_synthetic_persona_profiles.txt`, into the correct
project's SQL editor.

```
curl -X POST https://qecdeyzqgrszbvpsrqwm.supabase.co/functions/v1/process-checkin-v0 \
  -H "Authorization: Bearer <anon-or-service-key>" \
  -H "Content-Type: application/json" \
  -d '{"checkin_id": "<a synthetic_nightly_entries.id>", "synthetic": true}'
```

## Test against live data

Same call, omit `"synthetic": true` (or set it `false`), with a real
`nightly_entries.id`.

## SAI-13 — dry_run / override_free_text (needs redeploy)

This function's source now includes `dry_run` and `override_free_text`
params (see the header comment in `index.ts`), for the eval harness in
`synthetic-data/eval_on_synthetic.py`. **As of SAI-13 this has NOT been
redeployed** — a live probe against the deployed function showed it still
running the pre-SAI-13 code (no `dry_run: true` echoed back, and it fell
through to a normal write). Redeploy via Option A or B above before running
the eval harness.

## Wiring into the app (separate change from this ticket)

The app currently computes `mockResponseText()`/`deriveDeviceCommand()`
client-side in `check-in.tsx` and never calls this function. To use it for
real, `checkInService.ts` would need to call this function with the new
row's id after insert and read back `ai_response` — that's a follow-up
change, not part of SAI-7.
