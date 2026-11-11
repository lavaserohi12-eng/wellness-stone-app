-- Verified against ai-wellness-stone-dev after resuming the existing project.
-- No rows are deleted, re-assigned or rewritten.
begin;

-- PostgreSQL ORs permissive policies. The old unconditional policies defeated
-- otherwise-correct owner policies, so remove only those legacy policies.
drop policy if exists "anon select" on public.nightly_entries;
drop policy if exists "anon insert" on public.nightly_entries;
drop policy if exists "anon select" on public.persona_profiles;
drop policy if exists "anon insert" on public.persona_profiles;

-- Current proposed telemetry consumers use confidence and the expanded sensor
-- vocabulary. Keep old measurements valid; simulation remains clearly marked.
alter table public.device_telemetry_readings
  add column if not exists confidence double precision
    check (confidence is null or confidence between 0 and 1);

alter table public.device_telemetry_readings
  drop constraint if exists device_telemetry_readings_measurement_type_check;
alter table public.device_telemetry_readings
  add constraint device_telemetry_readings_measurement_type_check check (
    measurement_type in (
      'pulse_estimate_bpm', 'bp_estimate', 'skin_temp_c', 'touch_force',
      'squeeze_event', 'battery_level', 'hr_bpm', 'spo2_percent', 'hrv_ms',
      'eda_microsiemens', 'ambient_temp_c', 'ble_rssi', 'session_duration_s'
    )
  );

notify pgrst, 'reload schema';
commit;
