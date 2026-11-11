import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { once } from "node:events";
import test from "node:test";
import { createWellnessRouter } from "../artifacts/api-server/src/routes/wellness.ts";

const require = createRequire(new URL("../artifacts/api-server/package.json", import.meta.url));
const express = require("express");

// In-memory test doubles only: no Supabase account, model or personal data.
function fixture(options: { invalid?: boolean; foreign?: boolean; crisis?: boolean; guardFails?: boolean; guardCrisis?: boolean } = {}) {
  const calls: { table: string; operation: string; filters: Record<string, unknown> }[] = [];
  let guardCalls = 0;
  const row = {
    id: "entry-a", user_id: options.foreign ? "user-b" : "user-a",
    mood_label: "calm", intensity: 3, body_activation: 2, thought_loop: 2,
    sleep_readiness: 5, energy_level: 5,
    ai_response: { state: options.crisis ? "CRISIS" : "GENERAL_SUPPORT", risk_level: options.crisis ? "high" : "low", companion_response: "Safe response" },
  };
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: options.invalid ? null : { id: "user-a" } },
        error: options.invalid ? new Error("invalid") : null,
      }),
    },
    functions: {
      invoke: async () => {
        guardCalls++;
        return {
          data: options.guardFails ? null : { ...row.ai_response, ...(options.guardCrisis ? { state: "CRISIS", risk_level: "high" } : {}) },
          error: options.guardFails ? new Error("unavailable") : null,
        };
      },
    },
    from(table: string) {
      const call = { table, operation: "select", filters: {} as Record<string, unknown> };
      calls.push(call);
      const builder = {
        select() { return builder; },
        update() { call.operation = "update"; return builder; },
        eq(key: string, value: unknown) { call.filters[key] = value; return builder; },
        gte() { return builder; },
        order() { return builder; },
        limit() { return builder; },
        single: async () => ({
          data: call.filters.user_id === row.user_id ? row : null,
          error: null,
        }),
        maybeSingle: async () => ({ data: null, error: null }),
        then(resolve: (x: unknown) => unknown) { return Promise.resolve({ data: [], error: null }).then(resolve); },
      };
      return builder;
    },
  };
  return { client, calls, get guardCalls() { return guardCalls; } };
}

async function request(f: ReturnType<typeof fixture>, endpoint: string, body: object, auth: boolean = true) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.log = { warn() {}, error() {} }; next(); });
  app.use("/api", createWellnessRouter(() => f.client as never));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/wellness/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(auth ? { Authorization: "Bearer test-session" } : {}) },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
}

for (const endpoint of ["respond", "feedback"]) {
  test(`${endpoint}: missing and invalid sessions cannot query rows`, async () => {
    for (const mode of ["missing", "invalid"]) {
      const f = fixture({ invalid: mode === "invalid" });
      assert.equal((await request(f, endpoint, { checkin_id: "entry-a", feedback: "neutral" }, mode !== "missing")).status, 401);
      assert.equal(f.calls.length, 0);
    }
  });
  test(`${endpoint}: evaluation switches are forbidden`, async () => {
    for (const controls of [{ synthetic: true }, { dry_run: true }, { override_free_text: "test" }]) {
      const f = fixture();
      assert.equal((await request(f, endpoint, { checkin_id: "entry-a", feedback: "neutral", ...controls })).status, 403);
      assert.equal(f.calls.length, 0);
    }
  });
  test(`${endpoint}: a different user's entry is not accessible`, async () => {
    const f = fixture({ foreign: true });
    assert.equal((await request(f, endpoint, { checkin_id: "entry-a", feedback: "neutral" })).status, 404);
    assert.equal(f.calls[0].filters.user_id, "user-a");
    assert.equal(f.calls.some(c => c.operation === "update"), false);
  });
}

test("feedback writes are scoped to the verified owner", async () => {
  const f = fixture();
  assert.equal((await request(f, "feedback", { checkin_id: "entry-a", feedback: "neutral" })).status, 200);
  assert.equal(f.calls.find(c => c.operation === "update")?.filters.user_id, "user-a");
});

test("an owned check-in passes safety before writing a bounded response", async () => {
  const f = fixture();
  const result = await request(f, "respond", { checkin_id: "entry-a" });
  assert.equal(result.status, 200);
  assert.equal(f.guardCalls, 1);
  const write = f.calls.find(c => c.operation === "update");
  assert.equal(write?.filters.user_id, "user-a");
  assert.ok(result.body.stoneCommand.intensity >= 0 && result.body.stoneCommand.intensity <= 1);
});

test("existing crisis responses never call the model or safety reprocessing", async () => {
  const f = fixture({ crisis: true });
  const response = await request(f, "respond", { checkin_id: "entry-a" });
  assert.equal(response.status, 200);
  assert.equal(response.body.state, "CRISIS");
  assert.equal(f.guardCalls, 0);
  assert.equal(f.calls.some(c => c.operation === "update"), false);
});

test("safety processing failures fail closed without AI response writes", async () => {
  const f = fixture({ guardFails: true });
  assert.equal((await request(f, "respond", { checkin_id: "entry-a" })).status, 503);
  assert.equal(f.guardCalls, 1);
  assert.equal(f.calls.some(c => c.operation === "update"), false);
});

test("a crisis found by the authoritative guard short-circuits the AI pass", async () => {
  const f = fixture({ guardCrisis: true });
  const response = await request(f, "respond", { checkin_id: "entry-a" });
  assert.equal(response.body.state, "CRISIS");
  assert.equal(f.guardCalls, 1);
  assert.equal(f.calls.some(c => c.operation === "update"), false);
});
