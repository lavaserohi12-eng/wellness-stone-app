import type { RequestHandler } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";

export function wellnessAuth(getClient: () => SupabaseClient): RequestHandler {
  return async (req, res, next) => {
    const match = /^Bearer (\S+)$/i.exec(req.headers.authorization ?? "");
    if (!match) {
      res.status(401).json({ error: "A valid Supabase session is required" });
      return;
    }
    try {
      const { data, error } = await getClient().auth.getUser(match[1]);
      if (error || !data.user) {
        res.status(401).json({ error: "A valid Supabase session is required" });
        return;
      }
      // Public product endpoints never accept the evaluation harness switches.
      if (req.body?.synthetic || req.body?.dry_run || req.body?.override_free_text !== undefined) {
        res.status(403).json({ error: "Evaluation controls are not available on product endpoints" });
        return;
      }
      res.locals.userId = data.user.id;
      next();
    } catch (err) {
      req.log.error({ err }, "Session verification unavailable");
      res.status(503).json({ error: "Session verification unavailable" });
    }
  };
}
