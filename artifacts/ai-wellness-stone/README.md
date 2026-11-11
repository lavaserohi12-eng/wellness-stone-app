# AI Wellness Stone mobile app

See the [workspace README](../../README.md) for installation and commands.
Run pnpm from the workspace root; this package is not a standalone npm project.

The app uses Expo SDK 54 and Expo Router. Supabase stores anonymous identities,
check-ins, personas, telemetry and consent. The check-in flow shows a local
response, then the authoritative Edge Function result, then an optional
personalized API response. Failed services must not bypass crisis handling.

Routes include home, persona setup/summary, consent, check-in, response, privacy
settings, debug, trends, simulator and live-session. Debug/simulation screens are
development tools, not evidence of real device communication.

Contracts:
- `src/types/wellness.ts`: current check-in/persona/response structures.
- `src/types/stoneCommand.ts`: frozen v1 device command and deterministic state map.
- `src/types/stoneTelemetry.ts`: proposed inbound telemetry shape, pending firmware agreement.

BLE transports remain mocked/stubbed. Do not import React Navigation directly
in app code or upgrade Expo without verifying the target mobile runtime.
