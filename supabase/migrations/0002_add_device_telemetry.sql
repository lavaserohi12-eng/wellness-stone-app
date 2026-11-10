-- SAI-8 — device telemetry (pulse / BP-estimate / temp / touch).
--
-- Additive, new table only. Storage + manual entry — no BLE yet.
-- user_id is uuid to match nightly_entries / persona_profiles.
--
-- Regulatory guardrail: every row carries
-- regulatory_label = 'wellness_experimental_not_medical'. This is general
-- wellness telemetry, not a medical device reading — never surface
-- diagnostic language, thresholds, or alerts in the UI.
--
-- Run this in the SQL editor of the CORRECT project: ai-wellness-stone-dev
-- (qecdeyzqgrszbvpsrqwm) — NOT any other project in the org.

create table if not exists device_telemetry_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_id text,
  session_id uuid,
  source text not null check (source in ('stone_ble','manual_debug','simulator','apple_health','synthetic')),
  measurement_type text not null check (measurement_type in (
    'pulse_estimate_bpm','bp_estimate','skin_temp_c','touch_force','squeeze_event','battery_level')),
  value_numeric double precision,
  value_json jsonb,
  unit text,
  quality_score int check (quality_score between 0 and 100),
  captured_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  firmware_version text,
  raw_packet_json jsonb,
  regulatory_label text not null default 'wellness_experimental_not_medical',
  is_synthetic boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_dtr_user_time on device_telemetry_readings(user_id, captured_at desc);
create index if not exists idx_dtr_type_time on device_telemetry_readings(measurement_type, captured_at desc);
