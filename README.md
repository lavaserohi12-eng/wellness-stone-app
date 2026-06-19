# AI Wellness Stone

A tactile AI companion for nightly emotional check-ins.

## Requirements

- Node LTS (v20+)
- [Expo Go](https://expo.dev/go) installed on your iPhone

## Getting started

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your iPhone to run the app on your device.

## Screens

| Route | Screen |
|-------|--------|
| `/` | Home |
| `/check-in` | Nightly Check-in |
| `/response` | AI Response |
| `/debug` | Developer Debug |

## Data Contract

The Data Contract (v1) lives in `src/types/wellness.ts`. All screens import from this single source of truth — do not redefine types elsewhere.

| Shape | Direction |
|-------|-----------|
| `CheckInPayload` | app → backend |
| `AssistantResponse` | backend → app |
| `DeviceCommand` | backend → device |

## Notes

- No network calls, no Supabase, no AI/model API, no BLE in Feature 1.
- `getAssistantResponse()` returns a mock; replace only its body in Feature 3+.
- Pinned to Expo SDK 54 for Expo Go compatibility.
