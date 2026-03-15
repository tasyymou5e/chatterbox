import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Parse request body for schedule_type
    const requestBody = await req.json().catch(() => ({}));
    const scheduleType = requestBody.schedule_type || "daily";
    const childId = requestBody.child_id; // optional: generate plan for a specific child

    // Check if plan already exists for today
    const today = new Date().toISOString().split("T")[0];
    const { data: existingPlan } = await adminClient
      .from("user_daily_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("plan_date", today)
      .maybeSingle();

    if (existingPlan) {
      // Return existing plan with items
      const { data: items } = await adminClient
        .from("user_daily_plan_items")
        .select("*")
        .eq("plan_id", existingPlan.id)
        .order("priority");

      return new Response(
        JSON.stringify({ plan_id: existingPlan.id, items, already_exists: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user's assessment results
    const { data: assessments } = await adminClient
      .from("assessment_results")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch user profile for context
    const { data: profile } = await adminClient
      .from("profiles")
      .select("first_name, last_name, user_role")
      .eq("user_id", user.id)
      .maybeSingle();

    // Fetch available catalog items
    const { data: catalogItems } = await adminClient
      .from("life_skill_catalog")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (!catalogItems || catalogItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "No catalog items available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build AI prompt
    const assessmentSummary = assessments?.length
      ? assessments.map((a: any) => ({
          type: a.assessment_type,
          subject: a.subject_name,
          grade: a.overall_grade,
          scores: a.scores,
          ai_review: a.ai_review,
          date: a.created_at,
        }))
      : [];

    const catalogSummary = catalogItems.map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      difficulty: c.difficulty,
      age_group: c.age_group,
      duration: c.estimated_duration_minutes,
      tags: c.tags,
      skill_domain: c.skill_domain,
      item_type: c.item_type,
      autism_skill_tags: c.autism_skill_tags,
      clinical_reference: c.clinical_reference,
    }));

    const userRole = profile?.user_role || "parent";
    const userName = profile?.first_name || "User";

    // Map assessment scores to skill domain weights
    const domainWeights = mapAssessmentsToDomains(assessmentSummary);

    const itemCount = scheduleType === "weekly" ? "15-25" : scheduleType === "monthly" ? "30-40" : "5-8";
    const timeframe = scheduleType === "weekly" ? "7 days" : scheduleType === "monthly" ? "30 days" : "today";

    const systemPrompt = `You are a life skills planning assistant specializing in autism support (ABA, TEACCH, ESDM frameworks).
Review assessment results and create a personalized ${scheduleType} plan from the available catalog.

Assessment-to-Domain Mapping:
${JSON.stringify(domainWeights, null, 2)}

Rules:
- Select ${itemCount} items from the catalog matching the user's needs based on assessments.
- Weight selection toward domains with higher deficit scores (higher = more need).
- Balance across different skill domains and item types (chore, game, study, activity).
- ${scheduleType === "weekly" ? "Distribute items across 7 days with variety. Include a 'day' field (1-7) for each item." : ""}
- ${scheduleType === "monthly" ? "Create progressive difficulty: easier items first week, harder later. Include a 'week' field (1-4) for each item." : ""}
- For each item, explain why it was selected based on assessment deficits.
- Consider the user's role (${userRole}).`;

    const userPrompt = `User: ${userName} (Role: ${userRole})

Assessment Results:
${assessmentSummary.length > 0 ? JSON.stringify(assessmentSummary, null, 2) : "No assessments completed yet - create a general introductory plan."}

Available Catalog Items:
${JSON.stringify(catalogSummary, null, 2)}

Create a personalized ${scheduleType} plan for ${timeframe}. Select items and explain why each is recommended.`;

    // Call Lovable AI Gateway with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_daily_plan",
              description: "Create a personalized daily plan with selected catalog items",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "2-3 sentence summary of the plan",
                  },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        catalog_item_id: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        category: { type: "string" },
                        priority: { type: "integer" },
                        ai_reasoning: { type: "string" },
                      },
                      required: ["catalog_item_id", "title", "description", "category", "priority", "ai_reasoning"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["summary", "items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_daily_plan" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "AI failed to generate plan" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = JSON.parse(toolCall.function.arguments);

    // Validate catalog_item_ids exist
    const validIds = new Set(catalogItems.map((c: any) => c.id));
    const validItems = plan.items.filter((item: any) => validIds.has(item.catalog_item_id));

    // Insert the plan
    const { data: newPlan, error: planError } = await adminClient
      .from("user_daily_plans")
      .insert({
        user_id: user.id,
        plan_date: today,
        status: "active",
        ai_summary: plan.summary,
        assessment_snapshot: assessmentSummary.length > 0 ? assessmentSummary : null,
      })
      .select("id")
      .single();

    if (planError) {
      console.error("Plan insert error:", planError);
      return new Response(JSON.stringify({ error: "Failed to save plan" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert plan items
    const planItems = validItems.map((item: any, idx: number) => ({
      plan_id: newPlan.id,
      catalog_item_id: item.catalog_item_id,
      title: item.title,
      description: item.description,
      category: item.category,
      priority: item.priority || idx + 1,
      status: "pending",
      ai_reasoning: item.ai_reasoning,
    }));

    const { data: insertedItems, error: itemsError } = await adminClient
      .from("user_daily_plan_items")
      .insert(planItems)
      .select("*");

    if (itemsError) {
      console.error("Items insert error:", itemsError);
    }

    return new Response(
      JSON.stringify({
        plan_id: newPlan.id,
        summary: plan.summary,
        items: insertedItems || [],
        already_exists: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-daily-plan error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
