import OpenAI from "openai";

let client: OpenAI | undefined;

// Resolve lazily: health checks and non-AI routes need no model credential.
// Keep the existing Replit proxy configuration working, and support a direct
// server-side OpenAI account when running outside Replit.
export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Server-side OpenAI configuration is missing");
    client = new OpenAI({
      apiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? process.env.OPENAI_BASE_URL,
    });
  }
  return client;
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const instance = getOpenAI();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
