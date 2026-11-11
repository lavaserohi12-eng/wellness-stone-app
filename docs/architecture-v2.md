# AI Wellness Stone — Architecture V2
<!-- SAI-23 · Lavanya + Mani alignment · Source-of-truth clarification -->

## Data paths

### PRODUCT path (source of truth)

```
Stone (BLE) → Expo App → Supabase → OpenAI (api-server) → Expo App → Stone (BLE)
```

| Step | Detail |
|---|---|
| **Stone → BLE → App** | Device sends `TelemetryFrame` over BLE. App receives via `StoneDeviceTransport` (`stoneTransport.ts`), buffers in `TelemetryBuffer`, and flushes to Supabase `device_telemetry_readings` (see `telemetryBuffer.ts`). |
| **App → Supabase** | Check-in submitted → `nightly_entries` row written. Persona stored in `persona_profiles`. Safety events in `safety_events`. Consent in `consents`. All user-scoped, RLS-protected. |
| **Supabase → OpenAI** | `process-checkin-v0` Edge Function classifies the `nightly_entries` row (rule-based, no model). Then `POST /api/wellness/respond` on api-server reads the row + persona + recent physiology summary (`device_telemetry_readings`, last 20 min), calls OpenAI, and overwrites `ai_response`. |
| **OpenAI → App → Stone** | App polls / receives the final `ai_response` (a frozen `StoneCommand` v1 + `companion_response`). The command is sent to the device over BLE. |

**Supabase is the single source of truth for:**
- User identity (anonymous auth)
- Nightly check-in entries and AI responses (`nightly_entries.ai_response`)
- Persona profiles and learned notes (`persona_profiles`)
- Device telemetry readings (`device_telemetry_readings`)
- Safety audit log (`safety_events`)
- Consent records (`consents`)
- Export / deletion events (`deletion_events`)

OpenAI reads **only** what the api-server passes in the prompt: `mood_label`, numeric ratings,
`free_text`, and persona hints. It never reads from Supabase directly and never sees `user_id`
or any identifier.

---

### DEBUG / backup path (firmware diagnostics only)

```
Stone (Wi-Fi) → Google Apps Script → Google Sheets
```

| Step | Detail |
|---|---|
| **Stone → Wi-Fi** | Device can emit raw sensor readings over Wi-Fi as a firmware-level fallback. |
| **Google Apps Script** | A script (owned by Mani) receives the POST and appends rows to a Sheet. |
| **Google Sheets** | A human-readable log for firmware debugging and hardware bring-up. |

**This path is for Mani's firmware diagnostics only.** It is not the product database.

### Rules that follow from the two-path design

1. **OpenAI never reads from Google Sheets.** The inference pipeline reads only from Supabase.
2. **Google Sheets is never the authoritative store** for telemetry, personas, check-ins, safety events, or model outputs. Anything that appears in Sheets is a copy for debugging, not a source of truth.
3. **No product feature may depend on Sheets being populated.** If Wi-Fi / Apps Script is unavailable, the product path (BLE → Supabase) continues unaffected.
4. **Firmware values in Stone commands come from `STATE_COMMANDS` (code), not from Sheets or the model.** The model writes only `companion_response`; the hardware command envelope is deterministic.

---

## Component map

```
artifacts/ai-wellness-stone/          Expo app (React Native + Expo Router)
  src/services/ble/
    stoneTransport.ts                 BLE transport abstraction (product path in)
    telemetryBuffer.ts                Buffer → flush to Supabase
    transport.ts                      One-shot BLE send (StoneCommand out)
  src/services/
    deviceTelemetryService.ts         Supabase writes for device_telemetry_readings
    checkInService.ts                 Supabase writes for nightly_entries
    personaService.ts                 Supabase reads/writes for persona_profiles
    edgeFunctionService.ts            Calls process-checkin-v0 Edge Function
  src/types/
    stoneCommand.ts                   Frozen v1 StoneCommand contract + STATE_COMMANDS

artifacts/api-server/
  src/routes/wellness.ts              POST /wellness/respond (2nd-pass OpenAI)
                                      POST /wellness/feedback (persona evolution)

supabase/functions/
  process-checkin-v0/index.ts         Rule-based 1st-pass classifier + crisis gate
  data-controls/index.ts              Export / delete Edge Function

docs/
  architecture-v2.md                  This file
  telemetry-contract-v2.md            BLE telemetry frame contract (Mani ↔ app)
```

---

## Questions for Mani (confirm at next sync)

1. Is the Wi-Fi → Sheets path still active in the current firmware build, or is it disabled by default?
2. Should the Sheets log be opt-in (dev firmware flag) so production devices never write to Sheets?
3. Are there any product features currently reading from Sheets that need to be migrated to Supabase?
4. Does the firmware distinguish between "BLE session active" and "Wi-Fi fallback active" so the app can surface a connection-mode indicator?
