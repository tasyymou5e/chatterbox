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
      case "list": {
        const { family_id, child_id, status: filterStatus } = body;
        let query = adminClient
          .from("skill_plan_schedules")
          .select("*")
          .eq("family_id", family_id);
        if (child_id) query = query.eq("child_id", child_id);
        if (filterStatus) query = query.eq("status", filterStatus);
        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ plans: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create": {
        const { child_id, family_id, schedule_type, plan_name, plan_items, start_date, end_date, assessment_basis_id } = body;
        // Verify family access
        const { data: access } = await adminClient.rpc("has_family_access", {
          family_id_param: family_id,
          user_id_param: user.id,
        });
        if (!access) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Validate catalog item IDs
        const itemIds = (plan_items || []).map((i: { catalog_item_id: string }) => i.catalog_item_id);
        if (itemIds.length > 0) {
          const { data: validItems } = await adminClient
            .from("life_skill_catalog")
            .select("id")
            .in("id", itemIds)
            .eq("is_active", true);
          const validIds = new Set((validItems || []).map((v: { id: string }) => v.id));
          const invalidIds = itemIds.filter((id: string) => !validIds.has(id));
          if (invalidIds.length > 0) {
            return new Response(JSON.stringify({ error: "Invalid catalog items", invalid_ids: invalidIds }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        const { data, error } = await adminClient
          .from("skill_plan_schedules")
          .insert({
            child_id,
            family_id,
            created_by: user.id,
            schedule_type: schedule_type || "daily",
            plan_name,
            plan_items: plan_items || [],
            status: "draft",
            start_date,
            end_date: end_date || null,
            assessment_basis_id: assessment_basis_id || null,
          })
          .select("*")
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ plan: data }), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update": {
        const { plan_id, plan_items: updateItems, plan_name: updateName, status: updateStatus, approval_notes } = body;
        const updateData: Record<string, unknown> = {};
        if (updateItems !== undefined) updateData.plan_items = updateItems;
        if (updateName !== undefined) updateData.plan_name = updateName;
        if (updateStatus !== undefined) {
          updateData.status = updateStatus;
          if (updateStatus === "approved") {
            updateData.approved_by = user.id;
            updateData.approved_at = new Date().toISOString();
          }
        }
        if (approval_notes !== undefined) updateData.approval_notes = approval_notes;

        const { data, error } = await adminClient
          .from("skill_plan_schedules")
          .update(updateData)
          .eq("id", plan_id)
          .select("*")
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ plan: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        const { plan_id: deleteId } = body;
        const { error } = await adminClient
          .from("skill_plan_schedules")
          .delete()
          .eq("id", deleteId)
          .eq("created_by", user.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_catalog": {
        const { skill_domain, item_type, age_group } = body;
        let query = adminClient
          .from("life_skill_catalog")
          .select("*")
          .eq("is_active", true);
        if (skill_domain) query = query.eq("skill_domain", skill_domain);
        if (item_type) query = query.eq("item_type", item_type);
        if (age_group) query = query.eq("age_group", age_group);
        const { data, error } = await query.order("sort_order");
        if (error) throw error;
        return new Response(JSON.stringify({ items: data }), {
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
    console.error("manage-skill-plan error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
