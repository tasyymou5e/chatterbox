import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_chores",
  title: "List chores",
  description: "List active chores in one of the signed-in user's families.",
  inputSchema: {
    family_id: z.string().uuid().describe("Family ID from list_my_families."),
    limit: z.number().int().min(1).max(100).optional().describe("Max chores to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ family_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("chores")
      .select("id, title, description, difficulty, base_points, estimated_duration")
      .eq("family_id", family_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) throw new ToolError(error.message);
    const chores = (data ?? []).map((c) => ({
      id: String(c.id),
      title: String(c.title ?? ""),
      description: c.description ? String(c.description) : null,
      difficulty: c.difficulty ? String(c.difficulty) : null,
      points: typeof c.base_points === "number" ? c.base_points : null,
      minutes: typeof c.estimated_duration === "number" ? c.estimated_duration : null,
    }));
    return { content: [{ type: "text", text: JSON.stringify(chores) }], structuredContent: { chores } };
  },
});
