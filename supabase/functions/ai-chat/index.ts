import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateJWT, getServiceClient, getUserClient, createUnauthorizedResponse } from "../_shared/auth-validator.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authResult = await validateJWT(req);
    if (!authResult.success || !authResult.userId) {
      return createUnauthorizedResponse(authResult.error || "Unauthorized", corsHeaders);
    }

    const userId = authResult.userId;
    const authHeader = req.headers.get("Authorization")!;
    const serviceClient = getServiceClient();

    // ── GET: lightweight quota check ──
    if (req.method === "GET") {
      const { data: roleData } = await serviceClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(1)
        .single();

      const userRole = roleData?.role || "user";

      const { data: quotaData } = await serviceClient
        .from("ai_usage_quotas")
        .select("daily_message_limit, enabled")
        .eq("role", userRole)
        .single();

      let limit = -1;
      let remaining = -1;

      if (quotaData && quotaData.enabled && quotaData.daily_message_limit !== -1) {
        limit = quotaData.daily_message_limit;

        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        const { data: userConvs } = await serviceClient
          .from("ai_conversations")
          .select("id")
          .eq("user_id", userId);

        const convIds = userConvs?.map((c: { id: string }) => c.id) || [];

        if (convIds.length > 0) {
          const { count: todayCount } = await serviceClient
            .from("ai_messages")
            .select("id", { count: "exact", head: true })
            .eq("role", "user")
            .gte("created_at", todayStart.toISOString())
            .in("conversation_id", convIds);

          remaining = Math.max(0, limit - (todayCount || 0));
        } else {
          remaining = limit;
        }
      }

      return new Response(JSON.stringify({ remaining, limit, role: roleData?.role || "user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = getUserClient(authHeader);

    const { messages, conversationId, stream = true } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if AI is enabled
    const { data: settingsData } = await serviceClient
      .from("site_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["ai_enabled", "ai_provider", "ai_model", "ai_system_prompt"]);

    const settings: Record<string, string> = {};
    settingsData?.forEach((s: { setting_key: string; setting_value: unknown }) => {
      const val = s.setting_value;
      settings[s.setting_key] = typeof val === "string" ? val.replace(/^"|"$/g, "") : String(val);
    });

    if (settings.ai_enabled === "false") {
      return new Response(JSON.stringify({ error: "AI assistant is currently disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const provider = settings.ai_provider || "lovable";
    const model = settings.ai_model || "google/gemini-3-flash-preview";
    const systemPrompt = settings.ai_system_prompt || "You are a helpful AI assistant.";

    // ── Quota enforcement ──
    // Look up user's role
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .single();

    const userRole = roleData?.role || "user";

    // Look up quota for this role
    const { data: quotaData } = await serviceClient
      .from("ai_usage_quotas")
      .select("daily_message_limit, enabled")
      .eq("role", userRole)
      .single();

    let quotaLimit = -1; // default unlimited
    let quotaRemaining = -1;

    if (quotaData && quotaData.enabled && quotaData.daily_message_limit !== -1) {
      quotaLimit = quotaData.daily_message_limit;

      // Get user's conversation IDs
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const { data: userConvs } = await serviceClient
        .from("ai_conversations")
        .select("id")
        .eq("user_id", userId);

      const convIds = userConvs?.map((c: { id: string }) => c.id) || [];

      if (convIds.length > 0) {
        const { count: todayCount } = await serviceClient
          .from("ai_messages")
          .select("id", { count: "exact", head: true })
          .eq("role", "user")
          .gte("created_at", todayStart.toISOString())
          .in("conversation_id", convIds);

        const usedToday = todayCount || 0;
        quotaRemaining = Math.max(0, quotaLimit - usedToday);

        if (usedToday >= quotaLimit) {
          return new Response(JSON.stringify({
            error: "Daily AI message quota exceeded. Please try again tomorrow.",
            remaining: 0,
            limit: quotaLimit,
          }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        quotaRemaining = quotaLimit;
      }
    }

    // ── Resolve API endpoint and key ──
    let apiEndpoint: string;
    let apiKey: string | undefined;

    if (provider === "lovable") {
      apiEndpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
      apiKey = Deno.env.get("LOVABLE_API_KEY");
    } else {
      // Look up provider from llm_providers
      const { data: providerData } = await serviceClient
        .from("llm_providers")
        .select("api_endpoint, provider_key")
        .eq("provider_key", provider)
        .eq("is_active", true)
        .single();

      if (!providerData) {
        return new Response(JSON.stringify({ error: `Provider '${provider}' not found or inactive` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      apiEndpoint = providerData.api_endpoint.endsWith("/chat/completions")
        ? providerData.api_endpoint
        : `${providerData.api_endpoint}/chat/completions`;

      apiKey = Deno.env.get(`LLM_${provider.toUpperCase()}_API_KEY`);
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured for provider" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle conversation persistence
    let activeConversationId = conversationId;
    let fullMessages: Array<{ role: string; content: string }> = [];

    if (activeConversationId) {
      // Load existing conversation messages
      const { data: existingMessages } = await userClient
        .from("ai_messages")
        .select("role, content")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });

      if (existingMessages) {
        fullMessages = existingMessages;
      }
    } else {
      // Create new conversation
      const firstUserMsg = messages.find((m: { role: string }) => m.role === "user");
      const title = firstUserMsg
        ? firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? "..." : "")
        : "New conversation";

      const { data: newConv, error: convError } = await userClient
        .from("ai_conversations")
        .insert({ user_id: userId, title })
        .select("id")
        .single();

      if (convError || !newConv) {
        console.error("Failed to create conversation:", convError);
        return new Response(JSON.stringify({ error: "Failed to create conversation" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      activeConversationId = newConv.id;
    }

    // Save user message(s)
    const userMessages = messages.filter((m: { role: string }) => m.role === "user");
    const lastUserMessage = userMessages[userMessages.length - 1];

    if (lastUserMessage) {
      await userClient.from("ai_messages").insert({
        conversation_id: activeConversationId,
        role: "user",
        content: lastUserMessage.content,
      });
    }

    // Build final messages array
    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...fullMessages,
      ...messages,
    ];

    const startTime = Date.now();

    // Call AI API
    const aiResponse = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        stream,
      }),
    });

    if (!aiResponse.ok) {
      const responseTime = Date.now() - startTime;
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);

      // Log failed call
      await serviceClient.from("llm_api_calls").insert({
        user_id: userId,
        provider,
        model,
        function_name: "ai-chat",
        status: "error",
        error_message: `HTTP ${aiResponse.status}: ${errorText.substring(0, 200)}`,
        response_time_ms: responseTime,
      });

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (stream) {
      // For streaming, we need to tee the response to capture the full assistant response
      const [streamForClient, streamForCapture] = aiResponse.body!.tee();

      // Process capture stream in background to save assistant message
      const capturePromise = (async () => {
        try {
          const reader = streamForCapture.getReader();
          const decoder = new TextDecoder();
          let fullContent = "";
          let totalTokens = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });

            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
              try {
                const parsed = JSON.parse(line.slice(6));
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) fullContent += delta;
                if (parsed.usage?.total_tokens) totalTokens = parsed.usage.total_tokens;
              } catch { /* partial JSON, skip */ }
            }
          }

          const responseTime = Date.now() - startTime;

          // Save assistant message
          if (fullContent) {
            await serviceClient.from("ai_messages").insert({
              conversation_id: activeConversationId,
              role: "assistant",
              content: fullContent,
              tokens_used: totalTokens || null,
              model,
            });
          }

          // Log successful call
          await serviceClient.from("llm_api_calls").insert({
            user_id: userId,
            provider,
            model,
            function_name: "ai-chat",
            status: "success",
            total_tokens: totalTokens || null,
            response_time_ms: responseTime,
          });

          // Update conversation timestamp
          await serviceClient
            .from("ai_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", activeConversationId);
        } catch (err) {
          console.error("Error capturing stream:", err);
        }
      })();

      // Don't await - let it run in background
      capturePromise.catch(console.error);

      const quotaHeaders: Record<string, string> = {};
      if (quotaLimit !== -1) {
        quotaHeaders["X-Quota-Limit"] = String(quotaLimit);
        quotaHeaders["X-Quota-Remaining"] = String(Math.max(0, quotaRemaining - 1));
      }

      return new Response(streamForClient, {
        headers: {
          ...corsHeaders,
          ...quotaHeaders,
          "Content-Type": "text/event-stream",
          "X-Conversation-Id": activeConversationId,
        },
      });
    } else {
      // Non-streaming
      const data = await aiResponse.json();
      const responseTime = Date.now() - startTime;
      const assistantContent = data.choices?.[0]?.message?.content || "";
      const totalTokens = data.usage?.total_tokens || 0;

      // Save assistant message
      if (assistantContent) {
        await serviceClient.from("ai_messages").insert({
          conversation_id: activeConversationId,
          role: "assistant",
          content: assistantContent,
          tokens_used: totalTokens || null,
          model,
        });
      }

      // Log call
      await serviceClient.from("llm_api_calls").insert({
        user_id: userId,
        provider,
        model,
        function_name: "ai-chat",
        status: "success",
        total_tokens: totalTokens || null,
        prompt_tokens: data.usage?.prompt_tokens || null,
        completion_tokens: data.usage?.completion_tokens || null,
        response_time_ms: responseTime,
      });

      // Update conversation timestamp
      await serviceClient
        .from("ai_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeConversationId);

      const quotaHeaders: Record<string, string> = {};
      if (quotaLimit !== -1) {
        quotaHeaders["X-Quota-Limit"] = String(quotaLimit);
        quotaHeaders["X-Quota-Remaining"] = String(Math.max(0, quotaRemaining - 1));
      }

      return new Response(JSON.stringify({
        ...data,
        conversationId: activeConversationId,
      }), {
        headers: { ...corsHeaders, ...quotaHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("ai-chat error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
