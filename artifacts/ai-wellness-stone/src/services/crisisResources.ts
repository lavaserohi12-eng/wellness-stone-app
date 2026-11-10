// src/services/crisisResources.ts — SAI-10
//
// Region-aware. 988 is US-ONLY. Do NOT hardcode it as the universal answer.
// Add lines for other regions ONLY with a verified, current authoritative source
// BEFORE launching there. The default is intentionally generic and always safe.
//
// IMPORTANT: this logic is duplicated (not imported) in
// supabase/functions/_shared/crisisResources.ts for the Deno Edge Function
// runtime. Keep both copies in sync.
//
// No region is collected anywhere in PersonaProfile/CheckInPayload yet (SAI-10
// scope is detection + safe fallback, not region collection), so `region` is
// always undefined today and every user resolves to DEFAULT_RESOURCE. That is
// intentional and safe — a missing/unknown region must never resolve to a
// wrong or dead number. Wiring real region collection is a follow-up.

export interface CrisisResource {
  label: string;
  contact: string;
  dialUrl?: string; // present only when there's a single unambiguous number to dial
}

const RESOURCES: Record<string, CrisisResource> = {
  US: { label: '988 Suicide & Crisis Lifeline (US)', contact: 'Call or text 988.', dialUrl: 'tel:988' },
  // e.g. GB: { label: "Samaritans (UK & ROI)", contact: "Call 116 123." }  // verify before enabling
};

const DEFAULT_RESOURCE: CrisisResource = {
  label: 'Local emergency / crisis support',
  contact: 'Please contact local emergency services or a local crisis line now.',
};

export function getCrisisResource(region?: string | null): CrisisResource {
  return (region && RESOURCES[region]) || DEFAULT_RESOURCE;
}

export function safeCompanionResponse(region?: string | null): string {
  const r = getCrisisResource(region);
  return (
    "I'm really sorry you're feeling this way. This app is a wellness companion, " +
    'not emergency support. If you might hurt yourself or feel unsafe, please reach out ' +
    'for help right now. ' + r.contact
  );
}
