import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateJWT, getServiceClient, getUserClient, createUnauthorizedResponse } from "../_shared/auth-validator.ts";
import { withWideEvent } from "../_shared/wide-event.ts";
import { checkQuota } from "./quota.ts";
import { resolveConversation, saveUserMessage, saveAssistantMessage } from "./conversation.ts";
import { resolveLLMConfig, resolveProviderEndpoint, callLLM, handleStreamResponse, logFailedCall } from "./llm-client.ts";

serve(withWideEvent('ai-chat', async (req, wideEvent) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth
  const authResult = await validateJWT(req);
  if (!authResult.success || !authResult.userId) {
    return createUnauthorizedResponse(authResult.error || "Unauthorized", corsHeaders);
  }

  const userId = authResult.userId;
  wideEvent.user_id = userId;
  const serviceClient = getServiceClient();

  // GET: quota check
  if (req.method === "GET") {
    const quota = await checkQuota(userId, serviceClient);
    return new Response(JSON.stringify({ remaining: quota.remaining, limit: quota.limit, role: quota.role }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization")!;
  const userClient = getUserClient(authHeader);
  const { messages, conversationId, stream = true } = await req.json();

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Messages array is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check AI settings
  const llmSettings = await resolveLLMConfig(serviceClient);
  if (!llmSettings.enabled) {
    return new Response(JSON.stringify({ error: "AI assistant is currently disabled" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { provider, model, systemPrompt } = llmSettings;
  wideEvent.provider = provider;
  wideEvent.model = model;

  // Quota enforcement
  const quota = await checkQuota(userId, serviceClient);
  if (quota.exceeded) {
    return new Response(
      JSON.stringify({ error: "Daily AI message quota exceeded. Please try again tomorrow.", remaining: 0, limit: quota.limit }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Resolve API endpoint
  const providerConfig = await resolveProviderEndpoint(provider, serviceClient);
  if (!providerConfig) {
    return new Response(JSON.stringify({ error: "API key not configured for provider" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Conversation persistence
  const { conversationId: activeConversationId, existingMessages } = await resolveConversation(
    conversationId,
    userId,
    messages,
    userClient,
    serviceClient
  );
  wideEvent.conversation_id = activeConversationId;

  // Save user message
  const userMessages = messages.filter((m: { role: string }) => m.role === "user");
  const lastUserMessage = userMessages[userMessages.length - 1];
  if (lastUserMessage) {
    await saveUserMessage(activeConversationId, lastUserMessage.content, userClient);
  }

  // Build API messages
  const apiMessages = [{ role: "system", content: systemPrompt }, ...existingMessages, ...messages];

  const startTime = Date.now();
  const aiResponse = await callLLM(providerConfig, model, apiMessages, stream);

  if (!aiResponse.ok) {
    const responseTime = Date.now() - startTime;
    const errorText = await aiResponse.text();
    wideEvent.llm_error = { status: aiResponse.status, body: errorText.substring(0, 200) };

    await logFailedCall(userId, provider, model, `HTTP ${aiResponse.status}: ${errorText.substring(0, 200)}`, responseTime, serviceClient);

    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "AI service error" }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Streaming response
  if (stream) {
    return handleStreamResponse(
      aiResponse, activeConversationId, userId, provider, model,
      startTime, serviceClient, corsHeaders, quota.limit, quota.remaining, wideEvent
    );
  }

  // Non-streaming response
  const data = await aiResponse.json();
  const responseTime = Date.now() - startTime;
  const assistantContent = data.choices?.[0]?.message?.content || "";
  const totalTokens = data.usage?.total_tokens || 0;

  wideEvent.response_time_ms = responseTime;
  wideEvent.total_tokens = totalTokens;

  await saveAssistantMessage(activeConversationId, assistantContent, model, totalTokens || null, serviceClient);

  await serviceClient.from("llm_api_calls").insert({
    user_id: userId, provider, model, function_name: "ai-chat",
    status: "success", total_tokens: totalTokens || null,
    prompt_tokens: data.usage?.prompt_tokens || null,
    completion_tokens: data.usage?.completion_tokens || null,
    response_time_ms: responseTime,
  });

  const quotaHeaders: Record<string, string> = {};
  if (quota.limit !== -1) {
    quotaHeaders["X-Quota-Limit"] = String(quota.limit);
    quotaHeaders["X-Quota-Remaining"] = String(Math.max(0, quota.remaining - 1));
  }

  return new Response(
    JSON.stringify({ ...data, conversationId: activeConversationId }),
    { headers: { ...corsHeaders, ...quotaHeaders, "Content-Type": "application/json" } }
  );
}));
