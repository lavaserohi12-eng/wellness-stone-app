# AI Wellness Stone — Telemetry & Command Contract

> **Status:** `TelemetryFrame` / `DeviceStatusFrame` are **PROPOSED** — pending Mani's
> confirmation on JSON vs binary framing, `seq` support, `confidence` field support, and
> exact `MeasurementType` vocabulary. Do not implement BLE parsing or model features
> against this shape until confirmed.
>
> `StoneCommand` (app → device) is **FROZEN** at v1 — agreed with Mani, safe to build against.

---

## Direction 1 — App → Device: StoneCommand v1 (FROZEN)

The app sends this JSON object over BLE to the Stone after every check-in.
Code owns the command values — the LLM never sets hardware fields.

```json
{
  "version": 1,
  "state": "ANXIETY",
  "cmd": "soothe",
  "haptic": "heartbeat_70bpm",
  "light": "amber_breathe_4_6",
  "duration_s": 60,
  "intensity": 0.65
}
```

### All 8 states

| state | cmd | haptic | light | duration_s | intensity |
|---|---|---|---|---|---|
| ANXIETY | soothe | heartbeat_70bpm | amber_breathe_4_6 | 60 | 0.65 |
| LONELINESS | soothe | slow_pulse | amber_steady | 60 | 0.50 |
| ACADEMIC_STRESS | soothe | long_exhale | blue_breathe_4_6 | 60 | 0.55 |
| LOW_MOOD | soothe | breathing_wave | dim_warm_glow | 60 | 0.45 |
| SLEEP_RUMINATION | soothe | long_exhale | dim_warm_glow | 90 | 0.40 |
| BODY_TENSION | soothe | breathing_wave | amber_breathe_4_6 | 60 | 0.60 |
| GENERAL_SUPPORT | soothe | slow_pulse | amber_steady | 45 | 0.40 |
| CRISIS | safety_mode | none | dim_warm_glow | 0 | 0.00 |

**CRISIS note:** `cmd: "safety_mode"` — no haptic or light output is sent to the device.

**Valid vocabulary:**
- `cmd`: `soothe` · `safety_mode` · `off`
- `haptic`: `heartbeat_70bpm` · `heartbeat_60bpm` · `slow_pulse` · `breathing_wave` · `long_exhale` · `none`
- `light`: `amber_breathe_4_6` · `amber_steady` · `blue_breathe_4_6` · `green_steady` · `dim_warm_glow` · `none`
- `intensity`: `0.0..1.0`
- `duration_s`: `10..180` (for `cmd: "soothe"`)

**Source of truth:** `src/types/stoneCommand.ts` — `STATE_COMMANDS`, `StoneCommand`, `validateStoneCommand`.

---

## Direction 2 — Device → App: TelemetryFrame v2 (PROPOSED — pending Mani)

The Stone sends periodic telemetry frames to the app over BLE.

### TelemetryFrame example

```json
{
  "type": "telemetry_frame",
  "protocol_version": "2.0",
  "device_id": "stone-v2-001",
  "session_id": "b1a0c3e2-uuid",
  "seq": 128,
  "captured_at": "2026-07-09T04:30:00Z",
  "readings": [
    { "measurement_type": "hr_bpm",        "value": 74,   "unit": "bpm",        "confidence": 0.92 },
    { "measurement_type": "spo2_percent",  "value": 98,   "unit": "%",          "confidence": 0.88 },
    { "measurement_type": "touch_force",   "value": 0.64, "unit": "normalized", "confidence": 0.99 },
    { "measurement_type": "battery_level", "value": 82,   "unit": "%",          "confidence": 1.0  }
  ]
}
```

### DeviceStatusFrame example

```json
{
  "type": "device_status",
  "device_id": "stone-v2-001",
  "firmware_version": "2.1.0",
  "battery_level": 82,
  "ble_rssi": -58,
  "captured_at": "2026-07-09T04:30:00Z"
}
```

### Fields

| field | type | notes |
|---|---|---|
| `type` | `"telemetry_frame"` | discriminator |
| `protocol_version` | `"2.0"` | version gate for the parser |
| `device_id` | string | unique device identifier |
| `session_id` | UUID string | groups readings for model summary |
| `seq` | number | monotonically increasing; gaps = dropped BLE frames |
| `captured_at` | ISO 8601 string | device-side timestamp |
| `readings` | `TelemetryReading[]` | one or more sensor readings |

### MeasurementType vocabulary (proposed)

`hr_bpm` · `spo2_percent` · `hrv_ms` · `eda_microsiemens` · `skin_temp_c` · `ambient_temp_c` · `touch_force` · `squeeze_event` · `battery_level` · `ble_rssi` · `session_duration_s`

Legacy (existing telemetry rows): `pulse_estimate_bpm` · `bp_estimate`

**Excluded:** `eeg_band_power` — not included until Mani confirms real scalp EEG hardware on V2.

### Open questions for Mani

1. **JSON vs binary** — will the device send JSON strings or a binary frame (e.g. CBOR, custom packed struct)?
2. **`seq` support** — does the V2 firmware implement a sequence counter?
3. **`confidence`** — does the firmware expose per-reading signal quality, or is this app-side only?
4. **`session_id`** — does the device generate a session UUID, or does the app assign it?
5. **`MeasurementType` list** — confirm which sensors are physically on V2 (especially `eda_microsiemens`, `hrv_ms`, `skin_temp_c`).
6. **EEG** — confirm whether V2 has real scalp EEG before adding `eeg_band_power`.

**Source of truth:** `src/types/stoneTelemetry.ts`
