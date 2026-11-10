import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Execute the actual handler with injected Deno/SDK boundaries. This verifies
// handler authorization, not Deno deployment or a live Supabase database.
function edgeFixture(options: { foreign?: boolean; invalid?: boolean } = {}) {
  let handler: (request: Request) => Promise<Response>;
  let queries = 0;
  const filters: Record<string, unknown> = {};
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: options.invalid ? null : { id: "user-a" } },
        error: options.invalid ? new Error("invalid") : null,
      }),
    },
    from() {
      queries++;
      const builder = {
        select() { return builder; },
        eq(key: string, value: unknown) { filters[key] = value; return builder; },
        single: async () => ({ data: null, error: null }),
      };
      return builder;
    },
  };
  const source = readFileSync(new URL("../supabase/functions/process-checkin-v0/index.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source.replace(/^import .+ from .+;$/gm, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  vm.runInNewContext(compiled, {
    Request, Response, console, Date,
    serve: (fn: typeof handler) => { handler = fn; },
    createClient: () => client,
    Deno: { env: { get: () => undefined } },
  });
  return {
    get queries() { return queries; },
    filters,
    async invoke(body: object, token = "test-session", method = "POST") {
      return handler(new Request("https://example.test/process-checkin-v0", {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
      }));
    },
  };
}

test("check-in Edge Function rejects missing and invalid sessions before queries", async () => {
  for (const invalid of [false, true]) {
    const f = edgeFixture({ invalid });
    assert.equal((await f.invoke({ checkin_id: "entry-a" }, invalid ? "test-session" : "")).status, 401);
    assert.equal(f.queries, 0);
  }
});

test("check-in Edge Function forbids user-controlled evaluation options", async () => {
  for (const flags of [{ synthetic: true }, { dry_run: true }, { override_free_text: "test" }]) {
    const f = edgeFixture();
    assert.equal((await f.invoke({ checkin_id: "entry-a", ...flags })).status, 403);
    assert.equal(f.queries, 0);
  }
});

test("check-in Edge Function scopes row lookup to the caller", async () => {
  const f = edgeFixture();
  assert.equal((await f.invoke({ checkin_id: "entry-a" })).status, 404);
  assert.equal(f.filters.user_id, "user-a");
});

test("check-in Edge Function handles preflight and rejects non-POST methods", async () => {
  const f = edgeFixture();
  assert.equal((await f.invoke({}, "", "OPTIONS")).status, 200);
  assert.equal((await f.invoke({}, "", "GET")).status, 405);
  assert.equal(f.queries, 0);
});
