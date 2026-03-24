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
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "start_session": {
        const { catalog_item_id, plan_item_id } = body;
        // Get catalog item for total steps
        const { data: catalogItem } = await adminClient
          .from("life_skill_catalog")
          .select("step_by_step_instructions, max_duration_minutes, title")
          .eq("id", catalog_item_id)
          .single();

        const steps = Array.isArray(catalogItem?.step_by_step_instructions)
          ? catalogItem.step_by_step_instructions
          : [];

        const { data: session, error } = await adminClient
          .from("plan_session_logs")
          .insert({
            child_id: user.id,
            catalog_item_id,
            plan_item_id: plan_item_id || null,
            current_step: 0,
            total_steps: steps.length,
            completion_status: "in_progress",
          })
          .select("*")
          .single();

        if (error) throw error;
        return new Response(
          JSON.stringify({ session, steps, max_duration: catalogItem?.max_duration_minutes }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_progress": {
        const { session_id, current_step, duration_seconds } = body;
        const updateData: Record<string, unknown> = { current_step, duration_seconds };

        const { data: session, error } = await adminClient
          .from("plan_session_logs")
          .update(updateData)
          .eq("id", session_id)
          .eq("child_id", user.id)
          .select("*, life_skill_catalog(max_duration_minutes, estimated_duration_minutes)")
          .single();

        if (error) throw error;

        // Check if child should take a break (120% of estimated duration)
        const catalogData = session?.life_skill_catalog as Record<string, unknown> | null;
        const estimatedMinutes = (catalogData?.estimated_duration_minutes as number) || 15;
        const maxMinutes = (catalogData?.max_duration_minutes as number) || estimatedMinutes * 2;
        const elapsedMinutes = (duration_seconds || 0) / 60;
        const shouldPause = elapsedMinutes > estimatedMinutes * 1.2;
        const mustStop = elapsedMinutes >= maxMinutes;

        let ai_message = null;
        if (mustStop) {
          ai_message = "Great work! You've been at this for a while. Let's save your progress and take a nice break! 🌟";
        } else if (shouldPause) {
          ai_message = await generateEncouragement(lovableKey, "pause", session);
        }

        return new Response(
          JSON.stringify({ session, should_pause: shouldPause, must_stop: mustStop, ai_message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "pause_session": {
        const { session_id, pause_reason } = body;
        const { data, error } = await adminClient
          .from("plan_session_logs")
          .update({
            paused_at: new Date().toISOString(),
            pause_reason: pause_reason || "child_request",
            completion_status: "paused",
          })
          .eq("id", session_id)
          .eq("child_id", user.id)
          .select("*")
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ session: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "resume_session": {
        const { session_id } = body;
        const { data, error } = await adminClient
          .from("plan_session_logs")
          .update({
            resumed_at: new Date().toISOString(),
            completion_status: "in_progress",
          })
          .eq("id", session_id)
          .eq("child_id", user.id)
          .select("*")
          .single();
        if (error) throw error;

        const resumeMessage = await generateEncouragement(lovableKey, "resume", data);
        return new Response(
          JSON.stringify({ session: data, ai_message: resumeMessage }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "complete_session": {
        const { session_id, score } = body;
        const { data, error } = await adminClient
          .from("plan_session_logs")
          .update({
            completed_at: new Date().toISOString(),
            completion_status: "completed",
            score: score || null,
          })
          .eq("id", session_id)
          .eq("child_id", user.id)
          .select("*")
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ session: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "skip_session": {
        const { session_id } = body;
        const { data, error } = await adminClient
          .from("plan_session_logs")
          .update({ completion_status: "skipped" })
          .eq("id", session_id)
          .eq("child_id", user.id)
          .select("*")
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ session: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_sessions": {
        const { child_id, date } = body;
        const targetId = child_id || user.id;
        let query = adminClient
          .from("plan_session_logs")
          .select("*, life_skill_catalog(title, skill_domain, item_type)")
          .eq("child_id", targetId);
        if (date) {
          query = query.gte("created_at", `${date}T00:00:00`)
            .lte("created_at", `${date}T23:59:59`);
        }
        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ sessions: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("ai-session-helper error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateEncouragement(
  apiKey: string | undefined,
  type: "pause" | "resume",
  session: Record<string, unknown> | null
): Promise<string> {
  if (!apiKey) {
    return type === "pause"
      ? "You're doing great! Let's take a short break. 🌈"
      : "Welcome back! Ready to continue where we left off? 🚀";
  }

  try {
    const prompt = type === "pause"
      ? `Generate a short, encouraging message (1-2 sentences) for a child with autism who needs to take a break from an activity. They are on step ${session?.current_step || 0} of ${session?.total_steps || 5}. Be warm, use simple language, and include an emoji. Don't mention autism.`
      : `Generate a short, encouraging message (1-2 sentences) for a child resuming an activity after a break. They are on step ${session?.current_step || 0} of ${session?.total_steps || 5}. Be warm, remind them where they left off, use simple language, and include an emoji. Don't mention autism.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a friendly, encouraging companion for children. Keep messages very short, simple, and positive." },
          { role: "user", content: prompt },
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      console.error("AI encouragement error:", response.status);
      return type === "pause"
        ? "You're doing great! Let's take a short break. 🌈"
        : "Welcome back! Ready to continue where we left off? 🚀";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ||
      (type === "pause" ? "Time for a break! 🌈" : "Let's keep going! 🚀");
  } catch {
    return type === "pause"
      ? "You're doing great! Let's take a short break. 🌈"
      : "Welcome back! Ready to continue where we left off? 🚀";
  }
}
