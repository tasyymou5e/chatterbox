import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  IntegrityBreakdown,
  RepairBreakdown,
  SystemBreakdown,
  ImpactingFactor,
  HealthScoreHistoryPoint,
  HealthGrade
} from '@/types/dataHealth';

interface UseDataHealthScoreResult {
  // Current scores
  overallScore: number;
  integrityScore: number;
  repairScore: number;
  systemScore: number;
  grade: HealthGrade;
  
  // Breakdown details
  integrityDetails: IntegrityBreakdown | null;
  repairDetails: RepairBreakdown | null;
  systemDetails: SystemBreakdown | null;
  
  // Historical data (7 days)
  scoreHistory: HealthScoreHistoryPoint[];
  
  // Factors impacting score
  impactingFactors: ImpactingFactor[];
  
  // State
  loading: boolean;
  calculating: boolean;
  error: string | null;
  lastCalculated: Date | null;
  
  // Actions
  recalculateScore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_INTEGRITY: IntegrityBreakdown = {
  critical_issues: 0,
  high_issues: 0,
  medium_issues: 0,
  low_issues: 0,
  pending_fixes: 0,
  fixed_24h: 0,
  last_check_status: 'never',
  last_check_time: null
};

const DEFAULT_REPAIR: RepairBreakdown = {
  total_repairs_7d: 0,
  successful_repairs_7d: 0,
  failed_repairs_7d: 0,
  success_rate: 100,
  last_repair_time: null,
  trending: 'stable'
};

const DEFAULT_SYSTEM: SystemBreakdown = {
  services_healthy: 0,
  services_degraded: 0,
  services_down: 0,
  average_uptime: 100,
  average_response_time: 0,
  error_rate_24h: 0
};

export function useDataHealthScore(): UseDataHealthScoreResult {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [overallScore, setOverallScore] = useState(100);
  const [integrityScore, setIntegrityScore] = useState(100);
  const [repairScore, setRepairScore] = useState(100);
  const [systemScore, setSystemScore] = useState(100);
  const [grade, setGrade] = useState<HealthGrade>('excellent');
  
  const [integrityDetails, setIntegrityDetails] = useState<IntegrityBreakdown | null>(null);
  const [repairDetails, setRepairDetails] = useState<RepairBreakdown | null>(null);
  const [systemDetails, setSystemDetails] = useState<SystemBreakdown | null>(null);
  const [impactingFactors, setImpactingFactors] = useState<ImpactingFactor[]>([]);
  const [scoreHistory, setScoreHistory] = useState<HealthScoreHistoryPoint[]>([]);
  const [lastCalculated, setLastCalculated] = useState<Date | null>(null);

  // Fetch historical scores
  const fetchHistory = useCallback(async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error: fetchError } = await supabase
        .from('data_health_scores')
        .select('overall_score, integrity_score, repair_score, system_score, calculated_at')
        .gte('calculated_at', sevenDaysAgo.toISOString())
        .order('calculated_at', { ascending: true });
      
      if (fetchError) throw fetchError;
      
      // Group by day and get last score of each day
      const dailyScores: Record<string, HealthScoreHistoryPoint> = {};
      (data || []).forEach(row => {
        const date = new Date(row.calculated_at).toLocaleDateString('en-US', { 
          weekday: 'short' 
        });
        dailyScores[date] = {
          date,
          overall: row.overall_score,
          integrity: row.integrity_score,
          repair: row.repair_score,
          system: row.system_score
        };
      });
      
      setScoreHistory(Object.values(dailyScores));
    } catch (err) {
      console.error('Failed to fetch score history:', err);
    }
  }, []);

  // Fetch latest calculated score from history
  const fetchLatestScore = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('data_health_scores')
        .select('*')
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      
      if (data) {
        setOverallScore(data.overall_score);
        setIntegrityScore(data.integrity_score);
        setRepairScore(data.repair_score);
        setSystemScore(data.system_score);
        setGrade(data.grade as HealthGrade);
        setIntegrityDetails((data.integrity_details as unknown as IntegrityBreakdown) || DEFAULT_INTEGRITY);
        setRepairDetails((data.repair_details as unknown as RepairBreakdown) || DEFAULT_REPAIR);
        setSystemDetails((data.system_details as unknown as SystemBreakdown) || DEFAULT_SYSTEM);
        setImpactingFactors((data.factors_impacting as unknown as ImpactingFactor[]) || []);
        setLastCalculated(new Date(data.calculated_at));
      }
    } catch (err) {
      console.error('Failed to fetch latest score:', err);
    }
  }, []);

  // Calculate and store new score
  const recalculateScore = useCallback(async () => {
    setCalculating(true);
    setError(null);
    
    try {
      // Call the RPC function
      const { data, error: rpcError } = await supabase
        .rpc('calculate_data_health_score');
      
      if (rpcError) throw rpcError;
      
      if (data && data.length > 0) {
        const result = data[0];
        
        // Store the calculated score
        const { error: insertError } = await supabase
          .from('data_health_scores')
          .insert({
            overall_score: result.overall_score,
            integrity_score: result.integrity_score,
            repair_score: result.repair_score,
            system_score: result.system_score,
            grade: result.grade,
            integrity_details: result.integrity_details,
            repair_details: result.repair_details,
            system_details: result.system_details,
            factors_impacting: result.factors_impacting,
            calculated_at: result.calculated_at
          });
        
        if (insertError) {
          console.warn('Failed to store score:', insertError);
        }
        
        // Update state
        setOverallScore(result.overall_score);
        setIntegrityScore(result.integrity_score);
        setRepairScore(result.repair_score);
        setSystemScore(result.system_score);
        setGrade(result.grade as HealthGrade);
        setIntegrityDetails((result.integrity_details as unknown as IntegrityBreakdown) || DEFAULT_INTEGRITY);
        setRepairDetails((result.repair_details as unknown as RepairBreakdown) || DEFAULT_REPAIR);
        setSystemDetails((result.system_details as unknown as SystemBreakdown) || DEFAULT_SYSTEM);
        setImpactingFactors((result.factors_impacting as unknown as ImpactingFactor[]) || []);
        setLastCalculated(new Date(result.calculated_at));
        
        toast({
          title: 'Health Score Updated',
          description: `Overall score: ${result.overall_score}/100 (${result.grade})`,
        });
        
        // Refresh history
        await fetchHistory();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to calculate score';
      setError(message);
      toast({
        title: 'Calculation Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setCalculating(false);
    }
  }, [toast, fetchHistory]);

  // Refresh all data
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchLatestScore(), fetchHistory()]);
    } finally {
      setLoading(false);
    }
  }, [fetchLatestScore, fetchHistory]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Real-time subscription for score updates
  useEffect(() => {
    const channel = supabase
      .channel('health-score-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'data_health_scores' },
        () => {
          fetchLatestScore();
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLatestScore, fetchHistory]);

  return {
    overallScore,
    integrityScore,
    repairScore,
    systemScore,
    grade,
    integrityDetails,
    repairDetails,
    systemDetails,
    scoreHistory,
    impactingFactors,
    loading,
    calculating,
    error,
    lastCalculated,
    recalculateScore,
    refresh
  };
}
