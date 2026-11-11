import assert from "node:assert/strict";
import { createRequire } from "node:module";

// Explicit opt-in. Creates ONLY fresh anonymous test identities and removes
// their test rows afterward. Never exports, edits or deletes existing users.
if (process.env.RUN_LIVE_SMOKE_TESTS !== "1") {
  throw new Error("Set RUN_LIVE_SMOKE_TESTS=1 to authorize isolated live test writes");
}
process.loadEnvFile(new URL("../.env", import.meta.url));
process.loadEnvFile(new URL("../artifacts/ai-wellness-stone/.env", import.meta.url));
const require = createRequire(new URL("../artifacts/api-server/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, "qecdeyzqgrszbvpsrqwm.supabase.co", "Refuse to run against an unverified project");
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const api = process.env.EXPO_PUBLIC_API_BASE_URL.replace(/\/$/, "");
const users = [];

async function newIdentity() {
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInAnonymously();
  assert.equal(error, null, "Anonymous sign-in failed");
  users.push(data.user.id);
  return { client, id: data.user.id, token: data.session.access_token };
}
async function apiCall(user, path, body) {
  const r = await fetch(api + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${user.token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(60000),
  });
  return { status: r.status, body: await r.json() };
}
function check(result, label) {
  assert.equal(result.error, null, `${label} failed (${result.error?.code ?? "unknown"})`);
  return result.data;
}

try {
  const a = await newIdentity();
  const b = await newIdentity();
  console.log("PASS anonymous authentication for two isolated test identities");
  const payload = {
    user_id: a.id, schema_version: 2, mood_label: "calm", intensity: 3,
    body_activation: 2, thought_loop: 2, energy_level: 5, sleep_readiness: 5,
    trigger_tag: "no_clear_trigger", support_need: "calm_down",
    free_text: "Automated isolated test: taking a quiet moment after a busy day.",
    check_in_json: {},
  };
  const entry = check(await a.client.from("nightly_entries").insert(payload).select("id").single(), "check-in insert");
  check(await a.client.from("consents").insert({ user_id: a.id, policy_version: "2026-07-06", wellness_disclaimer: true, data_processing: true }), "consent");
  const persona = check(await a.client.from("persona_profiles").insert({
    user_id: a.id, schema_version: 2,
    profile_json: { schema_version: 2, primary_goal: "unwind", support_style: { preferred_tone: "gentle" } },
  }).select("id").single(), "persona insert");
  assert.equal(check(await b.client.from("nightly_entries").select("id").eq("id", entry.id), "cross-user check-in read").length, 0);
  assert.equal(check(await b.client.from("persona_profiles").select("id").eq("id", persona.id), "cross-user persona read").length, 0);
  assert.ok((await b.client.from("nightly_entries").insert({ ...payload, user_id: a.id })).error, "Cross-user insert must be denied");
  console.log("PASS consent/profile persistence and real database owner isolation");

  const classified = await a.client.functions.invoke("process-checkin-v0", { body: { checkin_id: entry.id } });
  const firstPass = check(classified, "deployed classifier");
  assert.equal(firstPass.state, "GENERAL_SUPPORT");
  const forbidden = await b.client.functions.invoke("process-checkin-v0", { body: { checkin_id: entry.id } });
  assert.ok(forbidden.error, "Edge Function must deny another user's entry");
  console.log("PASS deployed classifier and Edge Function ownership checks");

  const upgraded = await apiCall(a, "/wellness/respond", { checkin_id: entry.id });
  assert.equal(upgraded.status, 200, "Connected response API failed");
  assert.ok(upgraded.body.companion_response?.length > 0);
  assert.equal((await apiCall(b, "/wellness/respond", { checkin_id: entry.id })).status, 404);
  assert.equal((await apiCall(a, "/wellness/feedback", { checkin_id: entry.id, feedback: "helped" })).status, 200);
  console.log("PASS connected response/feedback APIs and API ownership checks");

  const crisis = check(await a.client.from("nightly_entries").insert({
    ...payload, mood_label: "anxious", free_text: "Automated crisis regression fixture: I am ending my life.",
  }).select("id").single(), "crisis fixture");
  const guarded = await apiCall(a, "/wellness/respond", { checkin_id: crisis.id });
  assert.equal(guarded.status, 200);
  assert.equal(guarded.body.state, "CRISIS");
  assert.equal(guarded.body.stoneCommand.intensity, 0);
  console.log("PASS live crisis guard before personalized response processing");

  check(await a.client.from("device_telemetry_readings").insert({
    user_id: a.id, source: "simulator", is_synthetic: true,
    session_id: crypto.randomUUID(), measurement_type: "hr_bpm",
    value_numeric: 72, confidence: 0.9,
  }), "marked simulated telemetry");
  check(await admin.from("app_events").insert({
    user_id: a.id, event_name: "isolated_smoke_test", event_json: {},
  }), "owned app event fixture");
  const exported = await apiCall(a, "/data/export");
  assert.equal(exported.status, 200);
  assert.equal(exported.body.nightly_entries.length, 2);
  assert.equal(exported.body.persona_profiles.length, 1);
  assert.equal(exported.body.device_telemetry_readings.length, 1);
  assert.equal(exported.body.app_events.length, 1);
  assert.equal((await apiCall(a, "/data/delete", {})).status, 200);
  const after = await apiCall(a, "/data/export");
  for (const table of ["nightly_entries", "persona_profiles", "device_telemetry_readings", "consents", "safety_events", "app_events"]) {
    assert.equal(after.body[table].length, 0, `Deletion left test records in ${table}`);
  }
  assert.equal(after.body.deletion_events.length, 1, "Deletion audit must be included in exports");
  assert.ok(after.body.deletion_events[0].completed_at, "Deletion audit must be completed");
  console.log("PASS telemetry storage, complete export and deletion of isolated test data");
} finally {
  for (const id of users) {
    for (const table of ["safety_events", "consents", "device_telemetry_readings", "nightly_entries", "persona_profiles", "app_events", "deletion_events"]) {
      const { error } = await admin.from(table).delete().eq("user_id", id);
      if (error) console.warn(`Test cleanup requires attention in ${table}`);
    }
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.warn("Test identity cleanup requires attention");
  }
  console.log("Isolated test cleanup completed; no pre-existing users were touched.");
}
