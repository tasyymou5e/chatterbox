import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import type { WideEvent } from '../_shared/wide-event.ts';

export interface LLMConfig {
  apiEndpoint: string;
  apiKey: string;
  model: string;
  provider: string;
}

/**
 * Resolve the LLM provider settings from site_settings + environment.
 */
export async function resolveLLMConfig(
  serviceClient: SupabaseClient
): Promise<{ provider: string; model: string; systemPrompt: string; enabled: boolean }> {
  const { data: settingsData } = await serviceClient
    .from('site_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['ai_enabled', 'ai_provider', 'ai_model', 'ai_system_prompt']);

  const settings: Record<string, string> = {};
  settingsData?.forEach((s: { setting_key: string; setting_value: unknown }) => {
    const val = s.setting_value;
    settings[s.setting_key] = typeof val === 'string' ? val.replace(/^"|"$/g, '') : String(val);
  });

  return {
    enabled: settings.ai_enabled !== 'false',
    provider: settings.ai_provider || 'lovable',
    model: settings.ai_model || 'google/gemini-3-flash-preview',
    systemPrompt: settings.ai_system_prompt || 'You are a helpful AI assistant.',
  };
}

/**
 * Resolve the API endpoint and key for a given provider.
 */
export async function resolveProviderEndpoint(
  provider: string,
  serviceClient: SupabaseClient
): Promise<LLMConfig | null> {
  if (provider === 'lovable') {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return null;
    return {
      apiEndpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
      apiKey,
      model: '',
      provider: 'lovable',
    };
  }

  const { data: providerData } = await serviceClient
    .from('llm_providers')
    .select('api_endpoint, provider_key')
    .eq('provider_key', provider)
    .eq('is_active', true)
    .single();

  if (!providerData) return null;

  const apiKey = Deno.env.get(`LLM_${provider.toUpperCase()}_API_KEY`);
  if (!apiKey) return null;

  const endpoint = providerData.api_endpoint.endsWith('/chat/completions')
    ? providerData.api_endpoint
    : `${providerData.api_endpoint}/chat/completions`;

  return { apiEndpoint: endpoint, apiKey, model: '', provider };
}

/**
 * Call the LLM API and return the raw fetch Response.
 */
export async function callLLM(
  config: LLMConfig,
  model: string,
  messages: Array<{ role: string; content: string }>,
  stream: boolean
): Promise<Response> {
  return fetch(config.apiEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, stream }),
  });
}

/**
 * Process a streaming response: tee the stream, capture content in background,
 * and return the client-facing stream.
 */
export function handleStreamResponse(
  aiResponse: Response,
  conversationId: string,
  userId: string,
  provider: string,
  model: string,
  startTime: number,
  serviceClient: SupabaseClient,
  corsHeaders: Record<string, string>,
  quotaLimit: number,
  quotaRemaining: number,
  wideEvent: WideEvent,
): Response {
  const [streamForClient, streamForCapture] = aiResponse.body!.tee();

  // Background capture
  const capturePromise = (async () => {
    try {
      const reader = streamForCapture.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let totalTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) fullContent += delta;
            if (parsed.usage?.total_tokens) totalTokens = parsed.usage.total_tokens;
          } catch { /* partial JSON, skip */ }
        }
      }

      const responseTime = Date.now() - startTime;
      wideEvent.response_time_ms = responseTime;
      wideEvent.total_tokens = totalTokens;

      // Save assistant message
      const { saveAssistantMessage } = await import('./conversation.ts');
      await saveAssistantMessage(conversationId, fullContent, model, totalTokens || null, serviceClient);

      // Log call
      await serviceClient.from('llm_api_calls').insert({
        user_id: userId,
        provider,
        model,
        function_name: 'ai-chat',
        status: 'success',
        total_tokens: totalTokens || null,
        response_time_ms: responseTime,
      });
    } catch (err) {
      wideEvent.stream_capture_error = err instanceof Error ? err.message : String(err);
    }
  })();

  capturePromise.catch(() => {}); // fire-and-forget

  const quotaHeaders: Record<string, string> = {};
  if (quotaLimit !== -1) {
    quotaHeaders['X-Quota-Limit'] = String(quotaLimit);
    quotaHeaders['X-Quota-Remaining'] = String(Math.max(0, quotaRemaining - 1));
  }

  return new Response(streamForClient, {
    headers: {
      ...corsHeaders,
      ...quotaHeaders,
      'Content-Type': 'text/event-stream',
      'X-Conversation-Id': conversationId,
    },
  });
}

/**
 * Log a failed LLM API call.
 */
export async function logFailedCall(
  userId: string,
  provider: string,
  model: string,
  errorMessage: string,
  responseTime: number,
  serviceClient: SupabaseClient,
): Promise<void> {
  await serviceClient.from('llm_api_calls').insert({
    user_id: userId,
    provider,
    model,
    function_name: 'ai-chat',
    status: 'error',
    error_message: errorMessage.substring(0, 200),
    response_time_ms: responseTime,
  });
}
