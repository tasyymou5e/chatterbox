import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listFamiliesTool from "./tools/list-families";
import listChoresTool from "./tools/list-chores";
import createChoreTool from "./tools/create-chore";

// Vite inlines the stable ref; the issuer must be the direct supabase.co host.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "chatterboxlife",
  title: "chatterboxlife",
  version: "0.2.0",
  instructions:
    "Tools for Chatterbox. List your families, list active chores, and (for parents/admins) create chores. Always preview a new chore and get the user's confirmation before saving it.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listFamiliesTool, listChoresTool, createChoreTool],
});
