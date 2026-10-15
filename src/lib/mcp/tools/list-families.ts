import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_families",
  title: "List my families",
  description: "List the families the signed-in user belongs to, with their role in each.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data: members, error } = await supabase
      .from("family_members")
      .select("family_id, role")
      .eq("user_id", ctx.getUserId() ?? "");
    if (error) throw new ToolError(error.message);
    const ids = (members ?? []).map((m) => m.family_id as string);
    if (ids.length === 0) {
      return { content: [{ type: "text", text: "No families found." }], structuredContent: { families: [] } };
    }
    const { data: fams, error: famErr } = await supabase
      .from("families")
      .select("id, name, display_name")
      .in("id", ids);
    if (famErr) throw new ToolError(famErr.message);
    const families = (fams ?? []).map((f) => ({
      id: String(f.id),
      name: String(f.display_name ?? f.name ?? ""),
      role: String(members?.find((m) => m.family_id === f.id)?.role ?? ""),
    }));
    return { content: [{ type: "text", text: JSON.stringify(families) }], structuredContent: { families } };
  },
});
