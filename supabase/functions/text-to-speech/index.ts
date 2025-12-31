import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TTSRequest {
  text: string;
  voice?: string;  // Grok voices: "Charon", "Celeste", "Clio", "Zephyr", "Sage", "Aria", "Atlas", "Olympus"
  speed?: number;
}

// Valid Grok TTS voices
const VALID_VOICES = ['Charon', 'Celeste', 'Clio', 'Zephyr', 'Sage', 'Aria', 'Atlas', 'Olympus'];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId: string | null = null;

  try {
    const { text, voice = 'Aria', speed = 1.0 }: TTSRequest = await req.json();

    if (!text || text.trim() === '') {
      throw new Error('Text is required');
    }

    const GROK_API_KEY = Deno.env.get('GROK_API_KEY');
    if (!GROK_API_KEY) {
      throw new Error('GROK_API_KEY is not configured');
    }

    // Try to get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabaseClient.auth.getUser();
        userId = user?.id ?? null;
      } catch {
        // Ignore auth errors for public TTS
      }
    }

    // Validate voice parameter
    const selectedVoice = VALID_VOICES.includes(voice) ? voice : 'Aria';

    console.log(`Grok TTS request: text="${text.substring(0, 50)}...", voice=${selectedVoice}, speed=${speed}`);

    // Grok API TTS endpoint per https://docs.x.ai/docs/guides/voice
    const response = await fetch('https://api.x.ai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-fast-audio',
        input: text,
        voice: selectedVoice,
        speed: Math.max(0.25, Math.min(4.0, speed)),
        response_format: 'mp3',
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grok TTS API error:', response.status, errorText);
      
      // Log failed call
      await logTTSCall({
        status: 'error',
        responseTimeMs: responseTime,
        textLength: text.length,
        errorMessage: `Grok API error: ${response.status}`,
        userId
      });
      
      throw new Error(`Grok API error: ${response.status} - ${errorText}`);
    }

    // Convert audio buffer to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    // Log successful call
    await logTTSCall({
      status: 'success',
      responseTimeMs: responseTime,
      textLength: text.length,
      userId
    });

    console.log(`TTS audio generated successfully in ${responseTime}ms`);

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        format: 'mp3'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('TTS error:', error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

async function logTTSCall(params: {
  status: string;
  responseTimeMs: number;
  textLength: number;
  errorMessage?: string;
  userId?: string | null;
}) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Estimate tokens from text length (rough approximation: 4 chars per token)
    const estimatedTokens = Math.ceil(params.textLength / 4);
    
    // Estimate cost (TTS is typically priced per character or per 1K chars)
    const costUsd = (params.textLength / 1000) * 0.015; // Rough estimate

    await supabase.from('llm_api_calls').insert({
      provider: 'grok',
      model: 'grok-3-fast-audio',
      function_name: 'text-to-speech',
      status: params.status,
      response_time_ms: params.responseTimeMs,
      prompt_tokens: estimatedTokens,
      total_tokens: estimatedTokens,
      cost_usd: costUsd,
      error_message: params.errorMessage ?? null,
      user_id: params.userId ?? null,
      request_metadata: { text_length: params.textLength }
    });
  } catch (e) {
    console.error('Failed to log TTS call:', e);
  }
}
