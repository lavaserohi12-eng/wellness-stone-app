// artifacts/api-server/src/routes/data.ts
//
// GET  /api/data/export — return all rows owned by the calling user as JSON
// POST /api/data/delete — hard-delete all rows owned by the calling user
//
// Auth: the client sends its Supabase JWT as "Authorization: Bearer <token>".
// We verify it with the service-role client (getUser) to get the real user_id.
// User id is NEVER accepted from the request body.

import { Router, type IRouter, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const router: IRouter = Router();

const SUPABASE_URL = process.env["EXPO_PUBLIC_SUPABASE_URL"];
const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

function getSupabase() {
  if (!SUPABASE_URL) throw new Error("EXPO_PUBLIC_SUPABASE_URL is required but was not set.");
  if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required but was not set.");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Extract and verify the Bearer token; return the Supabase user id.
async function resolveUserId(req: Request): Promise<string | null> {
  const auth = req.headers["authorization"];
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

// ---------------------------------------------------------------------------
// GET /api/data/export
// ---------------------------------------------------------------------------
router.get("/data/export", async (req: Request, res: Response) => {
  const userId = await resolveUserId(req).catch(() => null);
  if (!userId) {
    res.status(401).json({ error: "Invalid or missing auth token" });
    return;
  }

  try {
    const sb = getSupabase();

    const [entries, persona, telemetry, consents, safetyEvents, appEvents, deletionEvents] = await Promise.all([
      sb.from("nightly_entries").select("*").eq("user_id", userId),
      sb.from("persona_profiles").select("*").eq("user_id", userId),
      sb.from("device_telemetry_readings").select("*").eq("user_id", userId),
      sb.from("consents").select("*").eq("user_id", userId),
      sb.from("safety_events").select("*").eq("user_id", userId),
      sb.from("app_events").select("*").eq("user_id", userId),
      sb.from("deletion_events").select("*").eq("user_id", userId),
    ]);

    for (const result of [entries, persona, telemetry, consents, safetyEvents, appEvents, deletionEvents]) {
      if (result.error) throw new Error("A data export query failed; please retry");
    }

    res.json({
      exported_at: new Date().toISOString(),
      user_id: userId,
      nightly_entries:           entries.data ?? [],
      persona_profiles:          persona.data ?? [],
      device_telemetry_readings: telemetry.data ?? [],
      consents:                  consents.data ?? [],
      safety_events:             safetyEvents.data ?? [],
      app_events:                appEvents.data ?? [],
      deletion_events:           deletionEvents.data ?? [],
    });
  } catch (err) {
    req.log.error({ userId, err }, "data/export failed");
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---------------------------------------------------------------------------
// POST /api/data/delete
// ---------------------------------------------------------------------------
router.post("/data/delete", async (req: Request, res: Response) => {
  const userId = await resolveUserId(req).catch(() => null);
  if (!userId) {
    res.status(401).json({ error: "Invalid or missing auth token" });
    return;
  }

  try {
    const sb = getSupabase();
    const { data: audit, error: auditError } = await sb
      .from("deletion_events")
      .insert({ user_id: userId })
      .select("id")
      .single();
    if (auditError) throw new Error("Could not record the deletion request; please retry");

    // Delete in dependency-safe order (safety_events / consents first,
    // then entries, then persona). Telemetry has no FK constraints.
    const tables = [
      "safety_events",
      "app_events",
      "consents",
      "device_telemetry_readings",
      "nightly_entries",
      "persona_profiles",
    ] as const;

    const deleted: Record<string, number> = {};
    for (const table of tables) {
      const { count, error } = await sb
        .from(table)
        .delete({ count: "exact" })
        .eq("user_id", userId);
      if (error) throw new Error(`Failed to delete from ${table}: ${error.message}`);
      deleted[table] = count ?? 0;
    }

    const { error: completionError } = await sb
      .from("deletion_events")
      .update({ completed_at: new Date().toISOString(), row_counts: deleted })
      .eq("id", audit.id);
    if (completionError) req.log.error({ err: completionError }, "Deletion audit completion failed");
    res.json({ deleted });
  } catch (err) {
    req.log.error({ userId, err }, "data/delete failed");
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
