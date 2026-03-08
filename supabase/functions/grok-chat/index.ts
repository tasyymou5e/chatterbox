import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
import { llmLimiter, llmAnonymousLimiter, RateLimiter } from '../_shared/rate-limiter.ts';
import { validateJWT, getServiceClient } from '../_shared/auth-validator.ts';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId: string | null = null;
  let isAuthenticated = false;

  try {
    const GROK_API_KEY = Deno.env.get('GROK_API_KEY');
    if (!GROK_API_KEY) {
      throw new Error('GROK_API_KEY is not configured');
    }

    // Try to get user from auth header (optional for this function)
    // Using getClaims() for local verification with asymmetric keys
    const auth = await validateJWT(req);
    if (auth.success && auth.userId) {
      userId = auth.userId;
      isAuthenticated = true;
    }

    // Apply tiered rate limiting: authenticated users get higher limits
    const limiter = isAuthenticated ? llmLimiter : llmAnonymousLimiter;
    const rateCheck = limiter.check(req);
    if (!rateCheck.allowed) {
      console.warn(`Rate limit exceeded for grok-chat (authenticated: ${isAuthenticated})`);
      return RateLimiter.createRateLimitResponse(rateCheck.resetTime, corsHeaders);
    }

    const { 
      messages, 
      model = 'grok-3-mini',
      temperature = 0.7,
      max_tokens = 1024,
      stream = false
    }: ChatRequest = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages array is required');
    }

    // Input validation: cap max_tokens and message sizes
    const MAX_TOKENS_LIMIT = 4096;
    const MAX_MESSAGES = 50;
    const MAX_MESSAGE_LENGTH = 32000;
    const safe_max_tokens = Math.min(Math.max(1, max_tokens ?? 1024), MAX_TOKENS_LIMIT);

    if (messages.length > MAX_MESSAGES) {
      throw new Error(`Too many messages (max ${MAX_MESSAGES})`);
    }
    for (const msg of messages) {
      if (typeof msg.content !== 'string' || msg.content.length > MAX_MESSAGE_LENGTH) {
        throw new Error(`Message content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
      }
    }

    console.log(`Grok chat request: model=${model}, messages=${messages.length}, stream=${stream}`);

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: safe_max_tokens,
        stream
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Log full error server-side only; never expose to clients
      console.error('Grok API error:', response.status, errorText);
      throw new Error('AI service temporarily unavailable');
    }

    const responseTime = Date.now() - startTime;

    // For streaming, pass through the stream
    if (stream) {
      // Log the call (we won't know tokens for streaming)
      logApiCall({
        provider: 'grok',
        model,
        functionName: 'grok-chat',
        status: 'success',
        responseTimeMs: responseTime,
        userId
      });

      return new Response(response.body, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    // Non-streaming response
    const data = await response.json();
    
    // Extract usage info
    const promptTokens = data.usage?.prompt_tokens ?? 0;
    const completionTokens = data.usage?.completion_tokens ?? 0;
    const totalTokens = data.usage?.total_tokens ?? promptTokens + completionTokens;

    // Log the API call
    await logApiCall({
      provider: 'grok',
      model,
      functionName: 'grok-chat',
      status: 'success',
      responseTimeMs: responseTime,
      promptTokens,
      completionTokens,
      totalTokens,
      userId
    });

    console.log(`Grok chat completed: ${totalTokens} tokens, ${responseTime}ms`);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Grok chat error:', error);

    // Log failed call
    await logApiCall({
      provider: 'grok',
      model: 'grok-3-mini',
      functionName: 'grok-chat',
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      responseTimeMs: responseTime,
      userId
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function logApiCall(params: {
  provider: string;
  model: string;
  functionName: string;
  status: string;
  responseTimeMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  errorMessage?: string;
  userId?: string | null;
}) {
  try {
    const supabase = getServiceClient();

    // Estimate cost (Grok pricing approximation)
    let costUsd = 0;
    if (params.totalTokens) {
      // Rough estimate: $0.002 per 1K tokens for grok-3-mini
      costUsd = (params.totalTokens / 1000) * 0.002;
    }

    await supabase.from('llm_api_calls').insert({
      provider: params.provider,
      model: params.model,
      function_name: params.functionName,
      status: params.status,
      response_time_ms: params.responseTimeMs,
      prompt_tokens: params.promptTokens ?? null,
      completion_tokens: params.completionTokens ?? null,
      total_tokens: params.totalTokens ?? null,
      cost_usd: costUsd > 0 ? costUsd : null,
      error_message: params.errorMessage ?? null,
      user_id: params.userId ?? null
    });
  } catch (e) {
    console.error('Failed to log API call:', e);
  }
}
