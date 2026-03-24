import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { cError } from '@/utils/wideLogger';

interface BehavioralSummary {
  child_user_id: string;
  total_sessions: number;
  avg_session_duration: number;
  most_used_features: string[];
  last_activity_date: string;
}

export const useSecureBehavioralSummary = (familyId?: string) => {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<BehavioralSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBehavioralSummary = async (targetFamilyId: string) => {
    if (!user || !targetFamilyId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_family_behavioral_summary', { 
          p_family_id: targetFamilyId 
        });

      if (rpcError) {
        setError(rpcError.message);
        cError('Error fetching behavioral summary:', rpcError);
        return;
      }

      setSummaries(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch behavioral summary';
      setError(errorMessage);
      cError('Error in behavioral summary hook:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (familyId) {
      fetchBehavioralSummary(familyId);
    }
  }, [familyId, user]);

  return {
    summaries,
    loading,
    error,
    refetch: () => familyId && fetchBehavioralSummary(familyId)
  };
};