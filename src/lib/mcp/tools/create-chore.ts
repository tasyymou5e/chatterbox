import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_chore",
  title: "Create chore",
  description:
    "Create a chore in a family. Only that family's parents or admins may do this. Call first with confirm=false to preview, show the preview to the user, and only call again with confirm=true after they approve.",
  inputSchema: {
    family_id: z.string().uuid().describe("Family ID from list_my_families."),
    title: z.string().trim().min(1).max(200).describe("Chore title."),
    description: z.string().trim().max(2000).optional().describe("Optional details."),
    difficulty: z.enum(["easy", "medium", "hard"]).optional().describe("Defaults to medium."),
    points: z.number().int().min(0).max(1000).optional().describe("Points awarded (default 10)."),
    minutes: z.number().int().min(1).max(600).optional().describe("Estimated minutes (default 15)."),
    confirm: z.boolean().describe("false = preview only; true = save after the user approved the preview."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ family_id, title, description, difficulty, points, minutes, confirm }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);

    // Permission pre-check: parent in this family, or admin. RLS enforces the same rule on insert.
    const [{ data: member }, { data: isAdmin }] = await Promise.all([
      supabase.from("family_members").select("role").eq("family_id", family_id).eq("user_id", userId).maybeSingle(),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    ]);
    if (!isAdmin && member?.role !== "parent") {
      throw new ToolError("Only parents in this family or admins can create chores.");
    }

    const chore = {
      family_id,
      title,
      description: description ?? null,
      difficulty: difficulty ?? "medium",
      points: points ?? 10,
      minutes: minutes ?? 15,
    };

    if (!confirm) {
      return {
        content: [{
          type: "text",
          text: `Preview — not saved yet:\n${JSON.stringify(chore, null, 2)}\nAsk the user to confirm, then call again with confirm=true.`,
        }],
        structuredContent: { saved: false, preview: chore },
      };
    }

    const { data, error } = await supabase
      .from("chores")
      .insert({
        family_id,
        title,
        description: chore.description,
        difficulty: chore.difficulty,
        base_points: chore.points,
        estimated_duration: chore.minutes,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: `Chore "${title}" created.` }],
      structuredContent: { saved: true, id: String(data.id), chore },
    };
  },
});
