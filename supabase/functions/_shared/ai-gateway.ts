/**
 * OpenAI-compatible chat gateway configuration.
 *
 * Defaults to the Lovable AI gateway (production). For local or self-hosted
 * runs, point it at any OpenAI-compatible endpoint, e.g.:
 *   AI_GATEWAY_URL=https://api.openai.com/v1
 *   AI_GATEWAY_API_KEY=sk-...
 *   AI_GATEWAY_MODEL=gpt-4o-mini
 */
export const AI_GATEWAY_URL = (Deno.env.get("AI_GATEWAY_URL") ?? "https://ai.gateway.lovable.dev/v1").replace(/\/+$/, "");

export function getAiGatewayKey(): string | undefined {
  return Deno.env.get("AI_GATEWAY_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY");
}

/** Model override for non-Lovable gateways, which won't recognise Lovable's model ids. */
export function aiModel(defaultModel: string): string {
  return Deno.env.get("AI_GATEWAY_MODEL") ?? defaultModel;
}
