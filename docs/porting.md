# Product workspace port and release checklist

## Baseline and scope

Source: Replit project `Expo-Router-Shell`, inspected at commit
`963cc44fc95acaf4854229065a3a39e3d20fd89d`.
Destination baseline: `wellness-stone-app` main at `13a01a8`.
The mobile app has moved from repository root into `artifacts/ai-wellness-stone/`
to restore the pnpm workspace that its catalog/workspace dependencies require.

Included: mobile screens/services, API, required libraries, dependency security
patches, functions, incremental SQL, architecture and device contracts.
Excluded: uploaded files, generated/synthetic datasets, private agent memory,
mockup-sandbox, live credentials, production database contents and deployment state.
The destination's existing app icon was retained; visual asset refresh is separate.

## Runtime portability

Use package scripts in the root README rather than the prototype's old
Replit-only proxy/build helpers. The API now defaults to port 5000, accepts
direct OpenAI server configuration as well as the existing proxy configuration,
and does not require model credentials merely to start or serve health checks.
The optional Drizzle package is retained as workspace source; product identity
and data remain in Supabase. No separate DATABASE_URL is needed by the current
wellness API routes.

## Authorization changes

Both wellness API routes verify Supabase session tokens and scope check-in reads
and writes to the verified user. The client sends its session token. Public API
requests cannot enable synthetic/evaluation controls.

The response API re-runs the authoritative check-in Edge Function before any
non-crisis model pass and fails closed if safety processing is unavailable.
Existing crisis responses short-circuit. This adds one safety call to the
prototype's existing two-pass flow; eliminating the redundant client call is
a future optimization, not part of the port.

The check-in Edge Function verifies caller identity and row ownership. Its
synthetic/dry-run controls require server authorization. Deploy this revised
function before validating the new API flow; otherwise the deployment still
runs the old implementation.

## Verified development recovery

With the owner's approval, the existing development project was resumed from
its inactive state. No replacement project or paid plan was created.
The inspected schema contained the core tables, feedback/learned notes and consent
fields, and anonymous sign-in was already enabled.

Inspection also found unconditional legacy `anon select`/`anon insert` policies
on check-ins and personas, which were ORed with owner policies and defeated
isolation. Migration `0008` was applied to remove only those legacy policies,
retain the owner policies, and add the missing telemetry confidence/vocabulary
support. No existing rows were deleted or reassigned.

The secured `process-checkin-v0` function was deployed as version 11 after saving
a local backup of its previous body. The mobile caller now forwards its own
session JWT rather than using a project API key as identity.

An isolated live test created fresh anonymous identities and verified:
authentication; consent/profile/check-in storage; cross-user read/insert denial;
function ownership checks; connected API response/feedback; the crisis
short-circuit; marked simulator telemetry; export; and deletion of test data.
The test cleaned up its own identities and records, not pre-existing users.
Run it only with explicit opt-in using `scripts/verify-live-backend.mjs`.

These checks do not establish personalized model success: this sandbox currently
has no model credential. Guided fallbacks work, but personalized AI still needs
server-side model configuration. Native/device testing and production rollout
remain separate.

## Database and release gates

- Confirm the intended Supabase project and anonymous sign-in setting.
- Inventory the live schema and applied migrations before running any SQL.
  Files `0001` onward assume that `nightly_entries` and `persona_profiles`
  already exist; their original creation SQL is absent from the prototype.
  Do not claim that these files bootstrap an empty database.
- Historical `0003` disables telemetry RLS and `0006` re-enables it. Never stop
  at the intermediate unprotected state or blindly replay history on production.
- Compare current telemetry writes and model queries with the actual schema.
  Original migration `0002` does not establish newer fields such as `confidence`
  and `hr_bpm`. The verified development fix is in `0008`; do not assume another
  environment has received it.
- Check policies for user-owned entries, personas, telemetry and consent;
  safety/deletion audit writes must remain server-only.
- Verify migrations for feedback/learned notes and consent/data rights.
- Deploy and verify `process-checkin-v0` separately. The app currently uses the
  authenticated Express `/data/export` and `/data/delete` routes for privacy
  controls; the alternative `data-controls` function source is not required
  for that path and has not been deployed by this recovery.
- Exercise anonymous sessions, persona save/load, consent, check-in persistence,
  crisis short-circuit, feedback, export and confirmed delete in an isolated
  staging project/account. Local in-memory tests do not prove any of those live
  deployments work.
- Verify API rate limiting and abuse controls at the intended deployment layer
  before a public pilot; session verification alone does not provide them.
- Keep real BLE work separate. StoneCommand v1 is frozen; inbound telemetry is
  proposed pending firmware agreement. Production sensor data must not be
  represented by the simulator's generated readings.

## Continue development here

Treat the GitHub repository as the implementation source after merge. Make
subsequent changes on branches and reviewable PRs; do not develop independent
copies in the prototype and this repository. Retain the prototype unchanged as
a reference until staging parity has been accepted. Deployment and merge need
separate authorization.
