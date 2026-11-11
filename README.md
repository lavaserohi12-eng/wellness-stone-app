# AI Wellness Stone

Expo SDK 54 / Expo Router wellness app, Supabase persistence and Edge Functions,
and an Express API for personalized AI responses. This workspace ports the
`Expo-Router-Shell` prototype into the existing product repository, preserving
the repository's history. It is general wellness software, not emergency or medical care.

## Layout

- `artifacts/ai-wellness-stone/`: mobile/web app, onboarding, check-ins, consent, responses, feedback, trends, privacy controls, simulator.
- `artifacts/api-server/`: authenticated response and feedback routes.
- `lib/`: shared API codegen, validation and server-side model integration.
- `supabase/`: existing incremental migrations and Edge Function source.
- `contracts/`: frozen StoneCommand v1 JSON schema.
- `tests/`: local authorization and safety regression tests (in-memory fixtures).

## Local development

Use **Node 24** and **pnpm 10.26.1**. Do not use npm install in this workspace.

```sh
corepack enable
corepack prepare pnpm@10.26.1 --activate
pnpm install --frozen-lockfile
cp .env.example .env
cp artifacts/ai-wellness-stone/.env.example artifacts/ai-wellness-stone/.env
```

Populate the files through your local secret manager; never commit them. The API
loads the root `.env`, and Expo loads the mobile package's `.env`. The mobile API
base URL must include `/api`, and on a phone must use a reachable LAN address or
HTTPS host, **not the phone's localhost**. Expo public configuration is bundled into
the client; service-role and model credentials belong only in the API environment.

In separate terminals:

```sh
pnpm dev:api                 # port 5000 by default; /api/healthz
pnpm dev:mobile              # scan with a compatible Expo Go client
# Or: pnpm dev:web
```

Anonymous Supabase sign-in must be enabled. Existing app sessions remain tied
to their Supabase project: do not point a migrated app at a different project
without planning the data/identity transition.

## Checks

```sh
pnpm typecheck
pnpm test
node --test scripts/verify-security-dependencies.mjs
pnpm build
```

For isolated live-backend regression tests against the verified development
project, after secure configuration:

```sh
RUN_LIVE_SMOKE_TESTS=1 node scripts/verify-live-backend.mjs
```

This creates fresh anonymous test accounts, performs test writes and removes
those accounts/data afterward. It does not operate on existing users.

The web export is written to `artifacts/ai-wellness-stone/web-dist`; the API builds
to `artifacts/api-server/dist`. Native BLE still uses the prototype's mock/stub
transports. It is not a working physical-device integration.

To run the built web app and API as **one service**:

```sh
pnpm build
pnpm start
```

Open port 5000 (or your configured `PORT`). It serves both the app and `/api`,
including direct screen links. For web hosting, prefer the same origin for the
app/API; for Expo native, set a reachable HTTPS API base URL ending in `/api`.

## Deployment is separate

No database migration, function deployment or production change happens by cloning
or building this repository. Read [the port and release checklist](docs/porting.md)
before deploying. The bundled SQL is **not a complete fresh-database bootstrap**.
Live Supabase configuration, RLS, schema and Edge Function versions need verification.
