import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

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
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

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

    const requestBody = await req.json().catch(() => ({}));
    const scheduleType = requestBody.schedule_type || "daily";
    const childId = requestBody.child_id;
    const targetChildId = childId || user.id;

    // Check if plan already exists for today
    const today = new Date().toISOString().split("T")[0];
    const { data: existingPlan } = await adminClient
      .from("user_daily_plans")
      .select("id")
      .eq("user_id", targetChildId)
      .eq("plan_date", today)
      .maybeSingle();

    if (existingPlan) {
      const { data: items } = await adminClient
        .from("user_daily_plan_items")
        .select("id, plan_id, catalog_item_id, title, description, category, priority, status, ai_reasoning, completed_at")
        .eq("plan_id", existingPlan.id)
        .order("priority");

      return new Response(
        JSON.stringify({ plan_id: existingPlan.id, items, already_exists: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch catalog items (limit to 30 most relevant)
    const { data: catalogItems } = await adminClient
      .from("life_skill_catalog")
      .select("id, title, description, category, difficulty, age_group, skill_domain, item_type")
      .eq("is_active", true)
      .order("sort_order")
      .limit(30);

    if (!catalogItems || catalogItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "No catalog items available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch assessments (limit fields)
    const { data: assessments } = await adminClient
      .from("assessment_results")
      .select("assessment_type, subject_name, overall_grade, scores")
      .or(`child_id.eq.${targetChildId},user_id.eq.${targetChildId}`)
      .order("created_at", { ascending: false })
      .limit(3);

    // Fetch profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("first_name, user_role")
      .eq("user_id", targetChildId)
      .maybeSingle();

    const userName = profile?.first_name || "User";
    const userRole = profile?.user_role || "parent";

    // Try AI generation, fall back to randomized plan on failure
    let planResult: { summary: string; items: any[] };

    try {
      planResult = await generateWithAI(
        lovableKey, catalogItems, assessments || [], userName, userRole, scheduleType
      );
    } catch (aiErr) {
      console.warn("AI generation failed, using fallback:", aiErr);
      planResult = generateFallbackPlan(catalogItems, scheduleType);
    }

    const validIds = new Set(catalogItems.map((c: any) => c.id));
    const validItems = planResult.items.filter((item: any) => validIds.has(item.catalog_item_id));

    // If AI returned no valid items, use fallback
    if (validItems.length === 0) {
      planResult = generateFallbackPlan(catalogItems, scheduleType);
    }

    const finalItems = validItems.length > 0 ? validItems : planResult.items;

    // Upsert the plan
    const { data: newPlan, error: planError } = await adminClient
      .from("user_daily_plans")
      .upsert({
        user_id: targetChildId,
        plan_date: today,
        status: "active",
        ai_summary: planResult.summary,
        assessment_snapshot: assessments && assessments.length > 0 ? assessments : null,
      }, { onConflict: "user_id,plan_date" })
      .select("id")
      .single();

    if (planError || !newPlan) {
      console.error("Plan upsert error:", planError);
      return new Response(JSON.stringify({ error: "Failed to save plan" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create skill_plan_schedules entry
    const { data: familyMember } = await adminClient
      .from("family_connections")
      .select("family_id")
      .eq("connected_user_id", targetChildId)
      .limit(1)
      .maybeSingle();

    if (familyMember?.family_id) {
      await adminClient
        .from("skill_plan_schedules")
        .insert({
          child_id: targetChildId,
          family_id: familyMember.family_id,
          created_by: user.id,
          schedule_type: scheduleType,
          plan_name: `${scheduleType.charAt(0).toUpperCase() + scheduleType.slice(1)} Plan - ${today}`,
          plan_items: finalItems.map((item: any) => ({
            catalog_item_id: item.catalog_item_id,
            title: item.title,
            description: item.description,
            category: item.category,
            skill_domain: item.category,
            item_type: 'activity',
            priority: item.priority,
            ai_reasoning: item.ai_reasoning,
          })),
          status: "pending_approval",
          start_date: today,
        })
        .select("id")
        .single();
    }

    // Insert plan items
    const planItems = finalItems.map((item: any, idx: number) => ({
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
      .select("id, plan_id, catalog_item_id, title, description, category, priority, status, ai_reasoning, completed_at");

    if (itemsError) {
      console.error("Items insert error:", itemsError);
    }

    return new Response(
      JSON.stringify({
        plan_id: newPlan.id,
        summary: planResult.summary,
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

/** AI-powered plan generation with minimal payload */
async function generateWithAI(
  lovableKey: string | undefined,
  catalogItems: any[],
  assessments: any[],
  userName: string,
  userRole: string,
  scheduleType: string
): Promise<{ summary: string; items: any[] }> {
  if (!lovableKey) {
    throw new Error("No LOVABLE_API_KEY");
  }

  // Compact catalog: only id + title + category
  const compactCatalog = catalogItems.map(c => `${c.id}|${c.title}|${c.category}|${c.skill_domain || ''}`).join('\n');

  const assessmentBrief = assessments.length > 0
    ? assessments.map(a => `${a.assessment_type}: grade=${a.overall_grade}`).join('; ')
    : "No assessments yet";

  const itemCount = scheduleType === "weekly" ? "15" : scheduleType === "monthly" ? "30" : "6";

  const prompt = `Select ${itemCount} items from this catalog for ${userName} (${userRole}). Assessments: ${assessmentBrief}.

Catalog (id|title|category|domain):
${compactCatalog}

Return JSON: {"summary":"...","items":[{"catalog_item_id":"...","title":"...","description":"brief","category":"...","priority":1,"ai_reasoning":"brief"}]}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          { role: "system", content: "You are a life skills planner for autism support. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    clearTimeout(timeout);

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI ${aiResponse.status}: ${errText.slice(0, 200)}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");

    return JSON.parse(jsonMatch[0]);
  } finally {
    clearTimeout(timeout);
  }
}

/** Fallback: pick random catalog items without AI */
function generateFallbackPlan(
  catalogItems: any[],
  scheduleType: string
): { summary: string; items: any[] } {
  const count = scheduleType === "weekly" ? 15 : scheduleType === "monthly" ? 30 : 6;

  // Shuffle and pick
  const shuffled = [...catalogItems].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  return {
    summary: `Your ${scheduleType} plan with ${selected.length} activities selected from the catalog.`,
    items: selected.map((item, idx) => ({
      catalog_item_id: item.id,
      title: item.title,
      description: item.description || "",
      category: item.category || "general",
      priority: idx + 1,
      ai_reasoning: `Selected to build ${item.skill_domain || item.category || 'life'} skills.`,
    })),
  };
}
