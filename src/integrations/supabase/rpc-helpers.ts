/**
 * Typed RPC Helper Functions
 * 
 * @description Provides type-safe wrappers for Supabase RPC calls that aren't
 * auto-generated in the types file yet.
 * 
 * @module integrations/supabase/rpc-helpers
 */
import { supabase } from './client';
import type { SupabaseRPCResult, ChildGameAssignmentRow } from '@/types/analytics';

interface RPCError {
  code?: string;
  message: string;
  hint?: string;
}

/**
 * Delete a child game assignment
 */
export async function deleteChildGameAssignment(
  childId: string,
  familyId: string,
  contentItemId: string
): Promise<{ error: RPCError | null }> {
  const result = await supabase.rpc('delete_child_game_assignment', {
    p_child_id: childId,
    p_family_id: familyId,
    p_content_item_id: contentItemId,
  });
  return { error: result.error as RPCError | null };
}

/**
 * Upsert a child game assignment
 */
export async function upsertChildGameAssignment(params: {
  childId: string;
  contentItemId: string;
  familyId: string;
  assignedBy: string;
  isRequired: boolean;
  difficultyOverride?: string | null;
  dueDate?: string | null;
}): Promise<{ error: RPCError | null }> {
  const result = await supabase.rpc('upsert_child_game_assignment', {
    p_child_id: params.childId,
    p_content_item_id: params.contentItemId,
    p_family_id: params.familyId,
    p_assigned_by: params.assignedBy,
    p_is_required: params.isRequired,
    p_difficulty_override: params.difficultyOverride ?? undefined,
    p_due_date: params.dueDate ?? undefined,
  });
  return { error: result.error as RPCError | null };
}

/**
 * Get child game assignments
 */
export async function getChildGameAssignments(
  childId: string,
  familyId: string
): Promise<SupabaseRPCResult<ChildGameAssignmentRow[]>> {
  const result = await supabase.rpc('get_child_game_assignments', {
    p_child_id: childId,
    p_family_id: familyId,
  });
  return result as SupabaseRPCResult<ChildGameAssignmentRow[]>;
}
