// supabase/functions/process-checkin-v0/index.ts  (Deno)
//
// SAI-13A — First-pass rule-based response for nightly check-ins.
// Reads a nightly_entries row (+ that user's persona_profiles row, if present),
// classifies the state with CODE (never a model), produces a frozen StoneCommand
// from STATE_COMMANDS, and writes the result to ai_response.
//
// The api-server's POST /wellness/respond runs as a second pass:
// it calls OpenAI for a personalized companion_response, then overwrites
// ai_response with the enriched version. This function sets the first-pass
// static companion_response text as a placeholder.
//
// Stone Command v1 contract is inlined here (not imported from the app) so
// this file can be pasted directly into the Supabase Dashboard Edge Function
// editor without resolving relative imports. Keep in sync with stoneCommand.ts.
//
// Deploy: supabase functions deploy process-checkin-v0
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (function-scoped, never in the app)
//
// Request body:
//   { "checkin_id": "<uuid>", "synthetic"?: boolean, "dry_run"?: boolean, "override_free_text"?: string }
//
// dry_run: true — runs the full deterministic pipeline but performs NO database
//   writes. Used by the SAI-13 eval harness to smoke-test all synthetic rows.
// override_free_text — honored ONLY when dry_run: true. Substitutes the row's
//   free_text for the crisis-risk check only, so the eval harness can probe
//   seeded crisis phrases against an existing row id.

import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Crisis safety helpers — INLINED (no _shared import) so this file works in
// the Supabase Dashboard editor. Source of truth is _shared/safety.ts and
// the client copy at src/services/safety.ts — keep all three in sync.
// ---------------------------------------------------------------------------

const HIGH_RISK_PATTERNS: RegExp[] = [
  /\bkill(ing)? myself\b/,
  /\bsuicide\b/,
  /\bsuicidal\b/,
  /\bend(ing)? my life\b/,
  /\bend(ing)? it all\b/,
  /\bself[\s-]?harm\b/,
  /\bhurt(ing)? myself\b/,
  /\bdon'?t wann?a (live|be here)\b/,
  /\bdon'?t want to (live|be here)\b/,
  /\bwant(ing)? to die\b/,
  /\bwanna die\b/,
  /\bfeel(ing)? like dying\b/,
  /\bcan'?t go on\b/,
  /\bno reason to live\b/,
  /\boverdose\b/,
];

interface RiskAssessment { level: "low" | "high"; matched: string[] }

function assessRisk(note: string | null | undefined): RiskAssessment {
  const text = (note ?? "").toLowerCase();
  const matched = HIGH_RISK_PATTERNS.filter((re) => re.test(text)).map((re) => re.source);
  return { level: matched.length > 0 ? "high" : "low", matched };
}

interface CrisisResource { label: string; contact: string; dialUrl?: string }

const RESOURCES: Record<string, CrisisResource> = {
  US: { label: "988 Suicide & Crisis Lifeline (US)", contact: "Call or text 988.", dialUrl: "tel:988" },
};
const DEFAULT_RESOURCE: CrisisResource = {
  label: "Local emergency / crisis support",
  contact: "Please contact local emergency services or a local crisis line now.",
};

function getCrisisResource(region?: string | null): CrisisResource {
  return (region && RESOURCES[region]) || DEFAULT_RESOURCE;
}

function safeCompanionResponse(region?: string | null): string {
  const r = getCrisisResource(region);
  return (
    "I'm really sorry you're feeling this way. This app is a wellness companion, " +
    "not emergency support. If you might hurt yourself or feel unsafe, please reach out " +
    "for help right now. " +
    r.contact
  );
}

// ---------------------------------------------------------------------------
// Stone Command v1 — FROZEN contract. Inlined from stoneCommand.ts.
// No warmth_c, no voice (V1 board has no thermal element or speaker).
// Do NOT add, rename, or invent vocabulary values.
// ---------------------------------------------------------------------------

type StoneState =
  | "ANXIETY" | "LONELINESS" | "ACADEMIC_STRESS" | "LOW_MOOD"
  | "SLEEP_RUMINATION" | "BODY_TENSION" | "GENERAL_SUPPORT" | "CRISIS";

type Haptic =
  | "heartbeat_70bpm" | "heartbeat_60bpm" | "slow_pulse"
  | "breathing_wave" | "long_exhale" | "none";

type Light =
  | "amber_breathe_4_6" | "amber_steady" | "blue_breathe_4_6"
  | "green_steady" | "dim_warm_glow" | "none";

interface StoneCommand {
  version: 1;
  cmd: "soothe" | "safety_mode" | "off";
  state: StoneState;
  haptic: Haptic;
  light: Light;
  duration_s: number;
  intensity: number;
}

function clampNum(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function validateStoneCommand(c: StoneCommand): StoneCommand {
  if (c.cmd !== "soothe") return { ...c, intensity: 0 };
  return { ...c, duration_s: clampNum(Math.round(c.duration_s), 10, 180), intensity: clampNum(c.intensity, 0, 1) };
}

// Code owns this mapping. The LLM never sets hardware.
const STATE_COMMANDS: Record<StoneState, Omit<StoneCommand, "version" | "state">> = {
  ANXIETY:          { cmd: "soothe", haptic: "heartbeat_70bpm", light: "amber_breathe_4_6", duration_s: 60, intensity: 0.65 },
  LONELINESS:       { cmd: "soothe", haptic: "slow_pulse",      light: "amber_steady",      duration_s: 60, intensity: 0.50 },
  ACADEMIC_STRESS:  { cmd: "soothe", haptic: "long_exhale",     light: "blue_breathe_4_6",  duration_s: 60, intensity: 0.55 },
  LOW_MOOD:         { cmd: "soothe", haptic: "breathing_wave",  light: "dim_warm_glow",     duration_s: 60, intensity: 0.45 },
  SLEEP_RUMINATION: { cmd: "soothe", haptic: "long_exhale",     light: "dim_warm_glow",     duration_s: 90, intensity: 0.40 },
  BODY_TENSION:     { cmd: "soothe", haptic: "breathing_wave",  light: "amber_breathe_4_6", duration_s: 60, intensity: 0.60 },
  GENERAL_SUPPORT:  { cmd: "soothe", haptic: "slow_pulse",      light: "amber_steady",      duration_s: 45, intensity: 0.40 },
  CRISIS:           { cmd: "safety_mode", haptic: "none",       light: "dim_warm_glow",     duration_s: 0,  intensity: 0.0 },
};

// Static first-pass companion_response text. The api-server's 2nd-pass call
// to OpenAI replaces this with a personalized message a few seconds later.
const STATIC_RESPONSES: Record<Exclude<StoneState, "CRISIS">, string> = {
  ANXIETY:          "Your thoughts seem to be looping tonight. Let's slow things down for two minutes.",
  LONELINESS:       "You do not have to solve the whole night. Let's create one steady moment.",
  ACADEMIC_STRESS:  "That's a lot to hold. Let's make this moment smaller for a minute.",
  LOW_MOOD:         "This feels heavy tonight. Let's make it gentler together.",
  SLEEP_RUMINATION: "Let's help your body move toward sleep with a slower rhythm.",
  BODY_TENSION:     "Your body seems keyed up right now. Let's help it settle.",
  GENERAL_SUPPORT:  "Thank you for taking a moment for yourself tonight.",
};

// ---------------------------------------------------------------------------
// Physiology summary — SAI-21
// Reads device_telemetry_readings for the past 20 min (service-role client).
// Ignores readings with confidence < 0.5. Returns null when no usable data.
// Physiology is a SOFT signal: sharpens state prediction, NEVER overrides
// the crisis gate, NEVER diagnoses.
// ---------------------------------------------------------------------------

interface PhysiologySummary {
  avg_hr_bpm: number | null;
  max_hr_bpm: number | null;
  avg_spo2_percent: number | null;
  avg_touch_force: number | null;
  avg_eda_microsiemens: number | null;
}

async function getRecentPhysiologySummary(userId: string): Promise<PhysiologySummary | null> {
  const since = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("device_telemetry_readings")
    .select("measurement_type,value_numeric,confidence")
    .eq("user_id", userId)
    .gte("captured_at", since);

  if (!data || data.length === 0) return null;

  type Row = { measurement_type: string; value_numeric: number | null; confidence: number | null };
  const vals = (t: string): number[] =>
    (data as Row[])
      .filter((d) => d.measurement_type === t && (d.confidence ?? 1) >= 0.5 && d.value_numeric !== null)
      .map((d) => d.value_numeric as number);

  const avg = (t: string): number | null => {
    const v = vals(t);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  const max = (t: string): number | null => {
    const v = vals(t);
    return v.length ? Math.max(...v) : null;
  };

  const summary: PhysiologySummary = {
    avg_hr_bpm: avg("hr_bpm"),
    max_hr_bpm: max("hr_bpm"),
    avg_spo2_percent: avg("spo2_percent"),
    avg_touch_force: avg("touch_force"),
    avg_eda_microsiemens: avg("eda_microsiemens"),
  };

  if (Object.values(summary).every((v) => v === null)) return null;
  return summary;
}

// ---------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------

interface CheckinRow {
  id: string;
  user_id: string;
  mood_label: string | null;
  intensity: number | null;
  body_activation: number | null;
  thought_loop: number | null;
  energy_level: number | null;
  sleep_readiness: number | null;
  social_connectedness: number | null;
  trigger_tag: string | null;
  support_need: string | null;
  stone_preference: string | null;
  free_text: string | null;
}

type ActiveState = Exclude<StoneState, "CRISIS">;

// ---------------------------------------------------------------------------
// Classify check-in → StoneState (code owns this; model never classifies)
// CRISIS is short-circuited before this function is ever called.
// ---------------------------------------------------------------------------

function classify(
  c: CheckinRow,
  physiology?: PhysiologySummary | null,
): { state: ActiveState; risk_level: "low" | "medium" | "high" } {
  const mood = (c.mood_label ?? "").toLowerCase().trim();
  const intensity = c.intensity ?? 0;
  const bodyActivation = c.body_activation ?? 0;
  const social = c.social_connectedness ?? 5;
  const sleep = c.sleep_readiness ?? 5;

  // Direct mood_label matches first (SAI-13 eval fix)
  if (mood === "anxious") return { state: "ANXIETY", risk_level: "low" };
  if (mood === "overwhelmed" || mood === "angry") return { state: "ACADEMIC_STRESS", risk_level: intensity >= 9 ? "medium" : "low" };
  if (mood === "lonely") return { state: "LONELINESS", risk_level: "low" };
  if (mood === "sad" || mood === "numb") return { state: "LOW_MOOD", risk_level: "low" };

  // Derived-signal fallbacks
  if (intensity >= 8) return { state: "ACADEMIC_STRESS", risk_level: intensity >= 9 ? "medium" : "low" };

  // SAI-21 — physiology soft signal: elevated HR + elevated EDA → BODY_TENSION.
  // Physiology NEVER overrides mood_label matches or the crisis gate (above).
  const physioBodyTension =
    physiology != null &&
    physiology.avg_hr_bpm !== null && physiology.avg_hr_bpm > 85 &&
    physiology.avg_eda_microsiemens !== null && physiology.avg_eda_microsiemens > 5;

  if (bodyActivation >= 7 || physioBodyTension) return { state: "BODY_TENSION", risk_level: "low" };
  if (social <= 2) return { state: "LONELINESS", risk_level: "low" };
  if (sleep <= 2) return { state: "SLEEP_RUMINATION", risk_level: "low" };
  return { state: "GENERAL_SUPPORT", risk_level: "low" };
}

function buildStoneCommand(state: ActiveState, stonePref: string | null): StoneCommand {
  const base = STATE_COMMANDS[state];
  let cmd: StoneCommand["cmd"] = base.cmd;
  let haptic: Haptic = base.haptic;
  let light: Light = base.light;
  let intensity = base.intensity;
  const duration_s = base.duration_s;

  switch (stonePref) {
    case "softer":     intensity = Math.max(0, intensity * 0.6); break;
    case "stronger":   intensity = Math.min(1, intensity * 1.3); break;
    case "light_only": haptic = "none"; break;
    case "haptic_only": light = "none"; break;
    case "no_stone":   cmd = "off"; haptic = "none"; light = "none"; intensity = 0; break;
  }

  return validateStoneCommand({ version: 1, cmd, state, haptic, light, duration_s, intensity });
}

// ---------------------------------------------------------------------------
// Supabase client (service-role, server-side only)
// ---------------------------------------------------------------------------

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ---------------------------------------------------------------------------
// CORS headers (Expo Web + RN runtime both send preflight OPTIONS requests)
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = /^Bearer (\S+)$/i.exec(req.headers.get("Authorization") ?? "")?.[1];
  if (!token) return json({ error: "A valid session is required" }, 401);
  const isServiceRole = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  let callerId: string | null = null;
  if (!isServiceRole) {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return json({ error: "A valid session is required" }, 401);
    callerId = data.user.id;
  }

  try {
    const { checkin_id, synthetic, dry_run = false, override_free_text } = await req.json();
    if (!isServiceRole && (synthetic || dry_run || override_free_text !== undefined)) {
      return json({ error: "Evaluation controls require server authorization" }, 403);
    }
    if (!checkin_id) {
      return json({ error: "checkin_id is required" }, 400);
    }

    const checkinsTable = synthetic ? "synthetic_nightly_entries" : "nightly_entries";
    const personaTable = synthetic ? "synthetic_persona_profiles" : "persona_profiles";

    let query = supabase
      .from(checkinsTable)
      .select("*")
      .eq("id", checkin_id);
    if (callerId) query = query.eq("user_id", callerId);
    const { data: c, error: fetchError } = await query.single();

    if (fetchError || !c) {
      return json({ error: "Check-in not found" }, 404);
    }
    const checkin = c as CheckinRow;

    // SAI-10 — crisis guard runs FIRST and short-circuits before classify().
    // No region field exists yet; always resolves to the safe generic default.
    const region: string | null = null;
    // override_free_text is ONLY honored in dry_run mode (eval harness probing seeded phrases)
    const noteForRiskCheck =
      dry_run && typeof override_free_text === "string" ? override_free_text : checkin.free_text;
    const risk0 = assessRisk(noteForRiskCheck);

    if (risk0.level === "high") {
      const resource = getCrisisResource(region);
      const companion_response = safeCompanionResponse(region);
      const stoneCommand: StoneCommand = validateStoneCommand({
        version: 1,
        cmd: "safety_mode",
        state: "CRISIS",
        haptic: "none",
        light: "dim_warm_glow",
        duration_s: 0,
        intensity: 0,
      });
      const ai_response = {
        state: "CRISIS" as const,
        risk_level: "high" as const,
        companion_response,
        stoneCommand,
      };

      if (dry_run) {
        return json({ checkin_id, ...ai_response, crisis_resource: resource, dry_run: true });
      }

      const { error: updateError } = await supabase
        .from(checkinsTable)
        .update({ ai_response })
        .eq("id", checkin_id);

      if (updateError) {
        return json({ error: updateError.message }, 500);
      }

      const { error: safetyEventError } = await supabase
        .from("safety_events")
        .insert({
          user_id: checkin.user_id,
          checkin_id,
          risk_level: "high",
          matched_terms: risk0.matched,
          note_excerpt: (checkin.free_text ?? "").slice(0, 280),
          action_taken: "blocked_response_shown_resources",
          resource_shown: resource.label,
          region,
        });

      if (safetyEventError) {
        // Do not fail the request over audit logging — user still needs the safe response.
        console.error("[process-checkin-v0] safety_events insert failed:", safetyEventError.message);
      }

      return json({ checkin_id, ...ai_response, crisis_resource: resource });
    }

    // ----- NOT high risk: classify → STATE_COMMANDS → first-pass response -----

    // SAI-21 — fetch physiology summary as a soft signal for classify().
    // Failure is non-fatal; falls back to self-report-only classification.
    const physiology = await getRecentPhysiologySummary(checkin.user_id).catch(() => null);

    const { state, risk_level } = classify(checkin, physiology);
    const stoneCommand = buildStoneCommand(state, checkin.stone_preference);
    const companion_response = STATIC_RESPONSES[state];

    const ai_response = { state, risk_level, companion_response, stoneCommand };

    if (dry_run) {
      // SAI-13 eval — no database write; return deterministic result only.
      return json({ checkin_id, ...ai_response, dry_run: true });
    }

    const { error: updateError } = await supabase
      .from(checkinsTable)
      .update({ ai_response })
      .eq("id", checkin_id);

    if (updateError) {
      return json({ error: updateError.message }, 500);
    }

    return json({ checkin_id, ...ai_response });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
