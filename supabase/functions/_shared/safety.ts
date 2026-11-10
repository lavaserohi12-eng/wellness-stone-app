// supabase/functions/_shared/safety.ts — SAI-10 (Deno runtime copy)
//
// v0 crisis detection: deliberately CONSERVATIVE keyword/phrase matching.
// This is the INPUT gate only. It WILL have false negatives — real distress is
// often indirect ("I don't see the point", "better off without me"), which this
// does NOT catch. Treat it as a safety FLOOR, not a guarantee. The OUTPUT gate
// (constraining what the model may say, even on non-flagged notes) is added
// with the model in SAI-13. The two together are the safety design; this is
// half.
//
// IMPORTANT: this is a duplicate of
// artifacts/ai-wellness-stone/src/services/safety.ts, kept separate because
// Deno Edge Functions cannot import RN app code. Keep both copies in sync
// when tuning patterns — THIS copy is the one that actually gates real
// traffic, since it runs server-side in front of the (future) model call.

const HIGH_RISK_PATTERNS: RegExp[] = [
  /\bkill(ing)? myself\b/, /\bsuicide\b/, /\bsuicidal\b/,
  /\bend(ing)? my life\b/, /\bend(ing)? it all\b/, // tightened from bare "end it"
  /\bself[\s-]?harm\b/, /\bhurt(ing)? myself\b/,
  // "don't/dont want to" AND the casual "don't/dont wanna" both need to match
  // — real users type the contraction, not just the formal phrase.
  /\bdon'?t wann?a (live|be here)\b/, /\bdon'?t want to (live|be here)\b/,
  /\bwant(ing)? to die\b/, /\bwanna die\b/, /\bfeel(ing)? like dying\b/,
  /\bcan'?t go on\b/, /\bno reason to live\b/, /\boverdose\b/,
];

export interface RiskAssessment {
  level: 'low' | 'high';
  matched: string[];
}

export function assessRisk(note: string | null | undefined): RiskAssessment {
  const text = (note ?? '').toLowerCase();
  const matched = HIGH_RISK_PATTERNS.filter((re) => re.test(text)).map((re) => re.source);
  return { level: matched.length > 0 ? 'high' : 'low', matched };
}

export const detectRiskLevel = (note: string): 'low' | 'high' => assessRisk(note).level;
