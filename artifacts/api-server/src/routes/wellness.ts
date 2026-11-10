// artifacts/api-server/src/routes/wellness.ts
//
// SAI-13A — Real-AI second pass for nightly check-in responses.
// Called by the client AFTER `process-checkin-v0` has written its rule-based
// first pass to the `nightly_entries` row.
//
// Division of responsibility (do not blur these):
//   - `process-checkin-v0` is the AUTHORITATIVE crisis guard. It runs first,
//     is the only writer of `safety_events`, and is the only thing that sets
//     state === 'CRISIS'. This route no-ops for CRISIS rows.
//   - This route NEVER re-derives risk. It trusts `ai_response` already on
//     the row: if state === 'CRISIS' (or legacy detected_state === 'high_risk_stub'),
//     it returns the existing response untouched — no model call, no overwrite.
//   - The Stone command is produced by DETERMINISTIC CODE (STATE_COMMANDS
//     lookup + stone_preference adjustments + validateStoneCommand). The model
//     is never responsible for any firmware-facing value.
//   - The model is ONLY responsible for writing a short personalized
//     companion_response string. Code owns state + stoneCommand.
//
// Stone Command v1 contract is inlined from stoneCommand.ts (mobile app).
// Keep both copies in sync. Do NOT add, rename, or invent vocabulary values.

import { Router, type IRouter } from "express";
import { createClient } from "@supabase/supabase-js";
import { openai } from "@workspace/integrations-openai-ai-server";
import { z } from "zod";
import { wellnessAuth } from "../middlewares/wellnessAuth";

const SUPABASE_URL = process.env["EXPO_PUBLIC_SUPABASE_URL"];
const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

function getSupabase() {
  if (!SUPABASE_URL) throw new Error("EXPO_PUBLIC_SUPABASE_URL is required but was not set.");
  if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required but was not set.");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// ---------------------------------------------------------------------------
// Stone Command v1 — FROZEN contract. Inlined from
// artifacts/ai-wellness-stone/src/types/stoneCommand.ts.
// No warmth_c, no voice (V1 board has no thermal element or speaker).
// Do NOT add, rename, or invent any vocabulary value without a version bump
// agreed between app (Lavanya) and firmware (Mani).
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

// ---------------------------------------------------------------------------
// Physiology summary — SAI-21
// Read per-user recent telemetry from device_telemetry_readings (last 20 min),
// ignore readings with confidence < 0.5. Returns null when no usable data.
// Physiology is a SOFT signal: it sharpens state prediction but NEVER
// overrides the crisis gate, NEVER diagnoses.
// ---------------------------------------------------------------------------

interface PhysiologySummary {
  avg_hr_bpm: number | null;
  max_hr_bpm: number | null;
  avg_spo2_percent: number | null;
  avg_touch_force: number | null;
  avg_eda_microsiemens: number | null;
}

async function getRecentPhysiologySummary(
  userId: string,
  sb: ReturnType<typeof getSupabase>,
): Promise<PhysiologySummary | null> {
  const since = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const { data } = await sb
    .from("device_telemetry_readings")
    .select("measurement_type, value_numeric, confidence")
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

  // Return null when every field is null (no usable telemetry in window)
  if (Object.values(summary).every((v) => v === null)) return null;
  return summary;
}

// ---------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------

type ActiveState = Exclude<StoneState, "CRISIS">;

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
  ai_response: { state?: string; detected_state?: string; [k: string]: unknown } | null;
}

interface PersonaRow {
  user_id: string;
  profile_json: {
    primary_goal?: string;
    support_style?: { preferred_tone?: string };
  } | null;
  learned_notes?: string[] | null;
}

// ---------------------------------------------------------------------------
// Classify check-in row → StoneState (code owns this; model never classifies)
// CRISIS is handled by the Edge Function before this route is ever called.
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

  // Direct mood_label matches first (SAI-13 eval fix: explicit signal beats derived thresholds)
  if (mood === "anxious") return { state: "ANXIETY", risk_level: "low" };
  if (mood === "overwhelmed" || mood === "angry") return { state: "ACADEMIC_STRESS", risk_level: intensity >= 9 ? "medium" : "low" };
  if (mood === "lonely") return { state: "LONELINESS", risk_level: "low" };
  if (mood === "sad" || mood === "numb") return { state: "LOW_MOOD", risk_level: "low" };

  // Derived-signal fallbacks (no direct mood match above)
  if (intensity >= 8) return { state: "ACADEMIC_STRESS", risk_level: intensity >= 9 ? "medium" : "low" };

  // SAI-21 — physiology soft signal: elevated HR + elevated EDA → BODY_TENSION.
  // BODY_TENSION was indistinguishable from GENERAL_SUPPORT without sensor data.
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

// Apply stone_preference adjustments on top of the frozen STATE_COMMANDS entry.
// Preference is a user choice, not firmware vocabulary; it modifies intensity,
// haptic, or light within the frozen value set, then validates.
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
// Output gate + per-state safe fallback text
// ---------------------------------------------------------------------------

const BANNED_OUTPUT_PATTERN =
  /\b(diagnos|crush it|just relax|get over it|kill yourself|suicide|988|911)\b/i;

const OUTPUT_FALLBACK: Record<ActiveState, string> = {
  ANXIETY:
    "Racing thoughts are exhausting — you're not imagining it. Try this: breathe in for 4 counts, hold for 4, out for 6. Do it three times with your Stone in your hand and let the rhythm do the work.",
  LONELINESS:
    "Feeling disconnected is one of the hardest things, and the fact that you showed up anyway says a lot. Send one low-stakes message to someone you care about — doesn't have to be deep, just a check-in. You might be surprised.",
  ACADEMIC_STRESS:
    "When everything feels urgent at once, nothing gets done — that pressure is real. Pick the one thing that actually matters most right now, do 25 minutes on just that, then stop. Progress beats perfection every time.",
  LOW_MOOD:
    "Heavy days deserve gentleness, not a pep talk. Get outside for even 10 minutes — sunlight and movement genuinely shift your brain chemistry. No goal, no destination, just move.",
  SLEEP_RUMINATION:
    "Your brain is still trying to solve things, but sleep is when it actually processes them. Try the 4-7-8 breath: in for 4, hold for 7, slow out for 8. It activates your parasympathetic nervous system — basically a manual sleep switch.",
  BODY_TENSION:
    "Your body is carrying something your mind hasn't named yet. Do a quick scan from your jaw down to your shoulders — consciously drop whatever you're holding. Even 30 seconds of that releases more than you'd think.",
  GENERAL_SUPPORT:
    "Checking in with yourself is genuinely underrated. One thing that tends to help on ordinary days: write down three small things that actually went okay — not big wins, just okay. It rewires where your attention defaults to.",
};

function passesOutputGate(text: string): boolean {
  return !!text && text.length <= 600 && !BANNED_OUTPUT_PATTERN.test(text);
}

// ---------------------------------------------------------------------------
// OpenAI — companion_response ONLY.
// Code owns state + stoneCommand. Model writes only the message text.
// OpenAI key lives only in api-server env, never in the client app.
// ---------------------------------------------------------------------------

const ModelOutput = z.object({
  companion_response: z.string().min(1).max(600),
});

async function generateCompanionResponse(
  state: ActiveState,
  checkin: CheckinRow,
  persona: PersonaRow | null,
  physiology: PhysiologySummary | null,
): Promise<string> {
  const system = `You are the voice behind a bedside wellness companion called "the Stone." You write short, genuinely useful, warm check-in responses — not platitudes.

The user's check-in state: ${state}.

YOUR JOB: Write 2–4 sentences that feel like a smart, caring friend responded — not a chatbot, not a therapist. Be real, be warm, be concrete.

REQUIRED STRUCTURE (in this order):
1. Acknowledge what they're actually feeling — reference specific details from their free-text note or ratings. Never start with generic filler.
2. Give ONE concrete, specific suggestion they can actually do right now: a micro-exercise, a reframe, a tiny next step, a breathing technique, a physical reset — whatever fits the state. Make it feel easy and doable, not like homework.
3. (Optional but encouraged) End with a short punchy line — a grounding thought, a relatable observation, or occasionally a quote that actually fits the moment. Keep it conversational, not inspirational-poster-y.

TONE:
- Warm and real. Conversational. Can use casual language and contractions freely.
- Specific > generic. "Put your phone in another room for 20 minutes" beats "take some time for yourself."
- Honest > cheerful. Don't pretend things are fine if they shared that they're not.
- Never: therapy jargon, clinical labels, diagnosis language, mention of "AI" or "model", medication suggestions, claims to be a medical professional, emergency service language.
- The Stone's physical response (light/haptic) is already set by code — don't mention it.
- Assume this is NOT a crisis — a separate system handles that before you're called.

OUTPUT: Respond with ONLY strict JSON: {"companion_response": "..."}. No markdown, no extra keys.`;

  const personaHints = persona?.profile_json
    ? {
        primary_goal: persona.profile_json.primary_goal,
        preferred_tone: persona.profile_json.support_style?.preferred_tone,
        learned_notes: persona.learned_notes ?? undefined,
      }
    : undefined;

  // SAI-21 — physiology summary included as a soft signal.
  // NO raw telemetry, NO user_id. Omit entirely when null (no telemetry in window).
  const user = JSON.stringify({
    mood_label: checkin.mood_label,
    intensity: checkin.intensity,
    body_activation: checkin.body_activation,
    thought_loop: checkin.thought_loop,
    energy_level: checkin.energy_level,
    sleep_readiness: checkin.sleep_readiness,
    social_connectedness: checkin.social_connectedness,
    trigger_tag: checkin.trigger_tag,
    support_need: checkin.support_need,
    free_text: checkin.free_text ?? "",
    persona: personaHints,
    ...(physiology ? { recent_physiology_summary: physiology } : {}),
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Model returned an empty response");

  const parsed = ModelOutput.parse(JSON.parse(raw));
  return parsed.companion_response;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export function createWellnessRouter(getClient: typeof getSupabase = getSupabase): IRouter {
const router: IRouter = Router();
router.use("/wellness", wellnessAuth(getClient));

router.post("/wellness/respond", async (req, res) => {
  const bodySchema = z.object({
    checkin_id: z.string().min(1),
    synthetic: z.boolean().optional(),
  });
  const parseResult = bodySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "checkin_id is required" });
    return;
  }
  const { checkin_id, synthetic } = parseResult.data;
  const checkinsTable = synthetic ? "synthetic_nightly_entries" : "nightly_entries";
  const personaTable = synthetic ? "synthetic_persona_profiles" : "persona_profiles";

  try {
    const supabase = getClient();

    const { data: c, error: fetchError } = await supabase
      .from(checkinsTable)
      .select("*")
      .eq("id", checkin_id)
      .eq("user_id", res.locals.userId)
      .single();

    if (fetchError || !c) {
      req.log.warn({ checkin_id, err: fetchError }, "wellness/respond: checkin not found");
      res.status(404).json({ error: "Check-in not found" });
      return;
    }
    const checkin = c as CheckinRow;

    // Trust the Edge Function's crisis guard — never re-derive risk here.
    // Check both new vocabulary (state === 'CRISIS') and legacy
    // (detected_state === 'high_risk_stub') for rows written before SAI-13A.
    const existingState = checkin.ai_response?.state;
    const existingDetectedState = checkin.ai_response?.detected_state;
    if (existingState === "CRISIS" || existingDetectedState === "high_risk_stub") {
      res.json({ checkin_id, ...checkin.ai_response });
      return;
    }

    // Re-run the authoritative safety gate with the caller's session.
    // An owned row or a client-writable ai_response is NOT proof that the
    // Edge Function ran. Fail closed rather than ever bypassing that guard.
    const { data: guarded, error: guardError } = await supabase.functions.invoke(
      "process-checkin-v0",
      {
        body: { checkin_id },
        headers: { Authorization: req.headers.authorization! },
      },
    );
    if (guardError || !guarded || typeof guarded !== "object" || !("state" in guarded)) {
      res.status(503).json({ error: "Safety processing unavailable; please retry" });
      return;
    }
    if (guarded.state === "CRISIS" || guarded.risk_level === "high") {
      res.json({ checkin_id, ...guarded });
      return;
    }

    const [personaResult, physiology] = await Promise.all([
      supabase
        .from(personaTable)
        .select("user_id, profile_json, learned_notes")
        .eq("user_id", checkin.user_id)
        .maybeSingle(),
      getRecentPhysiologySummary(checkin.user_id, supabase).catch(() => null),
    ]);
    const persona = (personaResult.data as PersonaRow | null) ?? null;

    const { state, risk_level } = classify(checkin, physiology);
    const stoneCommand = buildStoneCommand(state, checkin.stone_preference);

    // Call OpenAI for companion_response only; fall back to safe template on any error.
    let companion_response: string;
    try {
      const raw = await generateCompanionResponse(state, checkin, persona, physiology);
      companion_response = passesOutputGate(raw) ? raw : OUTPUT_FALLBACK[state];
    } catch (modelErr) {
      req.log.warn({ checkin_id, err: modelErr }, "wellness/respond: model call failed, using fallback");
      companion_response = OUTPUT_FALLBACK[state];
    }

    const ai_response = { state, risk_level, companion_response, stoneCommand };

    const { error: updateError } = await supabase
      .from(checkinsTable)
      .update({ ai_response })
      .eq("id", checkin_id)
      .eq("user_id", res.locals.userId);

    if (updateError) {
      req.log.error({ checkin_id, err: updateError }, "wellness/respond: failed to persist ai_response");
      res.status(500).json({ error: updateError.message });
      return;
    }

    res.json({ checkin_id, state, risk_level, companion_response, stoneCommand });
  } catch (err) {
    req.log.error({ checkin_id, err }, "wellness/respond failed");
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---------------------------------------------------------------------------
// Feedback + persona evolution (SAI-12 — unchanged by SAI-13A)
// ---------------------------------------------------------------------------

const MAX_LEARNED_NOTES = 20;

function learnedNoteFor(
  feedback: "helped" | "neutral" | "not_helped",
  state: string,
): string | null {
  if (feedback === "helped")
    return `Responds well to the tone used for "${state}" check-ins — keep that style.`;
  if (feedback === "not_helped")
    return `The tone used for "${state}" check-ins didn't land well — try a different approach next time.`;
  return null;
}

router.post("/wellness/feedback", async (req, res) => {
  const bodySchema = z.object({
    checkin_id: z.string().min(1),
    feedback: z.enum(["helped", "neutral", "not_helped"]),
    synthetic: z.boolean().optional(),
  });
  const parseResult = bodySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "checkin_id and a valid feedback value are required" });
    return;
  }
  const { checkin_id, feedback, synthetic } = parseResult.data;
  const checkinsTable = synthetic ? "synthetic_nightly_entries" : "nightly_entries";
  const personaTable = synthetic ? "synthetic_persona_profiles" : "persona_profiles";

  try {
    const supabase = getClient();

    const { data: c, error: fetchError } = await supabase
      .from(checkinsTable)
      .select("id, user_id, ai_response")
      .eq("id", checkin_id)
      .eq("user_id", res.locals.userId)
      .single();

    if (fetchError || !c) {
      req.log.warn({ checkin_id, err: fetchError }, "wellness/feedback: checkin not found");
      res.status(404).json({ error: "Check-in not found" });
      return;
    }
    const checkin = c as CheckinRow;

    const { error: feedbackUpdateError } = await supabase
      .from(checkinsTable)
      .update({ response_feedback: feedback })
      .eq("id", checkin_id)
      .eq("user_id", res.locals.userId);

    if (feedbackUpdateError) {
      req.log.error({ checkin_id, err: feedbackUpdateError }, "wellness/feedback: failed to persist feedback");
      res.status(500).json({ error: feedbackUpdateError.message });
      return;
    }

    // Use state (new vocabulary) or detected_state (legacy) for the persona note
    const rowState = (checkin.ai_response?.state ?? checkin.ai_response?.detected_state) as string | undefined;
    const note = rowState ? learnedNoteFor(feedback, rowState) : null;

    if (note) {
      const { data: p } = await supabase
        .from(personaTable)
        .select("user_id, learned_notes")
        .eq("user_id", checkin.user_id)
        .maybeSingle();
      const existingNotes: string[] = Array.isArray(
        (p as { learned_notes?: unknown } | null)?.learned_notes,
      )
        ? (p as { learned_notes: string[] }).learned_notes
        : [];
      const updatedNotes = [...existingNotes, note].slice(-MAX_LEARNED_NOTES);

      const { error: personaUpdateError } = await supabase
        .from(personaTable)
        .update({ learned_notes: updatedNotes })
        .eq("user_id", checkin.user_id);

      if (personaUpdateError) {
        req.log.error(
          { checkin_id, err: personaUpdateError },
          "wellness/feedback: failed to update learned_notes",
        );
      }
    }

    res.json({ checkin_id, feedback });
  } catch (err) {
    req.log.error({ checkin_id, err }, "wellness/feedback failed");
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

return router;
}

export default createWellnessRouter();
