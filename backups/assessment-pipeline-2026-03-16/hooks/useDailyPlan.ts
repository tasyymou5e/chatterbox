import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DailyPlanItem {
  id: string;
  plan_id: string;
  catalog_item_id: string | null;
  title: string;
  description: string | null;
  category: string;
  priority: number;
  status: string;
  ai_reasoning: string | null;
  completed_at: string | null;
}

export interface DailyPlan {
  plan_id: string;
  summary?: string;
  items: DailyPlanItem[];
  already_exists: boolean;
}

export function useDailyPlan() {
  const { user, sessionReady } = useAuth();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-daily-plan', {
        body: {},
      });

      if (fnError) {
        setError(fnError.message || 'Failed to generate plan');
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      setPlan(data as DailyPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateItemStatus = useCallback(async (itemId: string, status: string) => {
    const updates: Record<string, unknown> = { status };
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('user_daily_plan_items' as any)
      .update(updates)
      .eq('id', itemId) as any;

    if (!updateError && plan) {
      setPlan({
        ...plan,
        items: plan.items.map(item =>
          item.id === itemId
            ? { ...item, status, completed_at: status === 'completed' ? new Date().toISOString() : item.completed_at }
            : item
        ),
      });
    }

    return { error: updateError };
  }, [plan]);

  // Auto-generate on login
  useEffect(() => {
    if (sessionReady && user && !plan && !loading) {
      generatePlan();
    }
  }, [sessionReady, user, plan, loading, generatePlan]);

  return { plan, loading, error, generatePlan, updateItemStatus };
}
