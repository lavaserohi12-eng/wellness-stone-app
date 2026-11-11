// supabase/functions/data-controls/index.ts  (Deno)
//
// SAI-11 — "Export my data" and "Delete my data", the two actions
// Washington's My Health My Data Act + the FTC require a working path for.
// Service-role only (never the anon key), so it can read/delete across all
// of a user's rows regardless of RLS, but ALWAYS scoped to the caller's own
// verified identity — see the auth check below.
//
// Ticket text described phantom tables (emotional_checkins, persona_memory) —
// translated onto the real live schema: nightly_entries / persona_profiles /
// safety_events / device_telemetry_readings / consents (see replit.md
// "Gotchas" — this is a recurring drift in this ticket series).
//
// Deploy: supabase functions deploy data-controls
// Secrets (already set for process-checkin-v0, reused here):
//   supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
//
// Request:
//   POST { "action": "export" | "delete" }
//   Header: Authorization: Bearer <the caller's own Supabase access token>
//
// SECURITY: the ticket's own sample stub takes `user_id` from the request
// body and only comments "verify caller owns user_id (JWT) in real impl" —
// that is NOT implemented here as a TODO, it is done for real: the caller's
// access token is decoded via the service-role admin client
// (auth.getUser(token)) and its user id is the ONLY user_id ever used. A
// body-supplied user_id is never trusted, so one user can never export or
// delete another user's data by passing a different id.

import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Real tables only — no `emotional_checkins`/`persona_memory`/`users`.
const USER_TABLES = [
  "nightly_entries",
  "persona_profiles",
  "safety_events",
  "device_telemetry_readings",
  "consents",
] as const;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return json({ error: "Missing Authorization bearer token" }, 401);
    }

    // Resolve the caller's OWN user id from their token — never from the
    // request body. This is what makes export/delete safe to expose to the
    // client at all.
    const { data: userData, error: userError } = await admin.auth.getUser(
      token,
    );
    if (userError || !userData?.user) {
      return json({ error: "Invalid or expired session" }, 401);
    }
    const user_id = userData.user.id;

    const { action } = await req.json().catch(() => ({ action: null }));

    if (action === "export") {
      const out: Record<string, unknown> = { user_id };
      for (const t of USER_TABLES) {
        const { data, error } = await admin
          .from(t)
          .select("*")
          .eq("user_id", user_id);
        if (error) {
          return json({ error: `export failed on ${t}: ${error.message}` }, 500);
        }
        out[t] = data ?? [];
      }
      return json(out);
    }

    if (action === "delete") {
      const { error: reqError } = await admin
        .from("deletion_events")
        .insert({ user_id });
      if (reqError) {
        console.error(
          "[data-controls] deletion_events request-log insert failed:",
          reqError.message,
        );
      }

      const counts: Record<string, number> = {};
      for (const t of USER_TABLES) {
        const { count, error } = await admin
          .from(t)
          .delete({ count: "exact" })
          .eq("user_id", user_id);
        if (error) {
          return json({ error: `delete failed on ${t}: ${error.message}` }, 500);
        }
        counts[t] = count ?? 0;
      }

      // Remove the auth user itself last, after all their rows are gone.
      const { error: deleteUserError } = await admin.auth.admin.deleteUser(
        user_id,
      );
      if (deleteUserError) {
        console.error(
          "[data-controls] auth.admin.deleteUser failed:",
          deleteUserError.message,
        );
      }

      await admin
        .from("deletion_events")
        .insert({
          user_id,
          completed_at: new Date().toISOString(),
          row_counts: counts,
        });

      return json({ deleted: counts });
    }

    return json({ error: "unknown action" }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
