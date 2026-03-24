import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export interface QuotaResult {
  limit: number;
  remaining: number;
  role: string;
  exceeded: boolean;
}

/**
 * Check AI usage quota for a user based on their role.
 * Returns limit=-1 and remaining=-1 when quotas are unlimited.
 */
export async function checkQuota(
  userId: string,
  serviceClient: SupabaseClient
): Promise<QuotaResult> {
  // Look up user's role
  const { data: roleData } = await serviceClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .limit(1)
    .single();

  const userRole = roleData?.role || 'user';

  // Look up quota for this role
  const { data: quotaData } = await serviceClient
    .from('ai_usage_quotas')
    .select('daily_message_limit, enabled')
    .eq('role', userRole)
    .single();

  if (!quotaData || !quotaData.enabled || quotaData.daily_message_limit === -1) {
    return { limit: -1, remaining: -1, role: userRole, exceeded: false };
  }

  const limit = quotaData.daily_message_limit;

  // Count today's messages
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: userConvs } = await serviceClient
    .from('ai_conversations')
    .select('id')
    .eq('user_id', userId);

  const convIds = userConvs?.map((c: { id: string }) => c.id) || [];

  if (convIds.length === 0) {
    return { limit, remaining: limit, role: userRole, exceeded: false };
  }

  const { count: todayCount } = await serviceClient
    .from('ai_messages')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'user')
    .gte('created_at', todayStart.toISOString())
    .in('conversation_id', convIds);

  const usedToday = todayCount || 0;
  const remaining = Math.max(0, limit - usedToday);

  return { limit, remaining, role: userRole, exceeded: usedToday >= limit };
}
