import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HealthLog {
  id: string;
  function_name: string;
  status: 'healthy' | 'unhealthy' | 'timeout' | 'unknown';
  response_time_ms: number | null;
  error_message: string | null;
  check_type: 'scheduled' | 'manual';
  previous_status: string | null;
  http_status_code: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AlertConfig {
  id: string;
  function_name: string;
  response_time_threshold_ms: number;
  consecutive_failures_threshold: number;
  warmup_threshold: number;
  critical_threshold: number;
  max_recovery_attempts: number;
  recovery_cooldown_minutes: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecoveryAttempt {
  id: string;
  function_name: string;
  attempt_number: number;
  attempt_type: 'warmup' | 'retry' | 'escalation';
  status: 'pending' | 'success' | 'failed';
  response_time_ms: number | null;
  error_message: string | null;
  triggered_by: 'scheduled' | 'manual' | 'auto_recovery';
  consecutive_failures_before: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface HealthSummary {
  functionName: string;
  currentStatus: 'healthy' | 'unhealthy' | 'timeout' | 'unknown';
  avgResponseTime: number;
  successRate: number;
  lastChecked: string | null;
  consecutiveFailures: number;
  isCritical: boolean;
  recoveryAttemptsToday: number;
}

interface UseEdgeFunctionHealthHistoryResult {
  logs: HealthLog[];
  summaries: HealthSummary[];
  alertConfigs: AlertConfig[];
  recoveryAttempts: RecoveryAttempt[];
  criticalFunctions: string[];
  loading: boolean;
  error: string | null;
  fetchLogs: (functionName?: string, hours?: number) => Promise<void>;
  fetchSummaries: () => Promise<void>;
  fetchRecoveryAttempts: () => Promise<void>;
  updateAlertConfig: (functionName: string, config: Partial<AlertConfig>) => Promise<void>;
  triggerHealthCheck: (functions?: string[]) => Promise<void>;
  triggerManualRecovery: (functionName: string) => Promise<void>;
  isCheckRunning: boolean;
}

export function useEdgeFunctionHealthHistory(): UseEdgeFunctionHealthHistoryResult {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [summaries, setSummaries] = useState<HealthSummary[]>([]);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
  const [recoveryAttempts, setRecoveryAttempts] = useState<RecoveryAttempt[]>([]);
  const [criticalFunctions, setCriticalFunctions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckRunning, setIsCheckRunning] = useState(false);
  const { toast } = useToast();

  const fetchLogs = useCallback(async (functionName?: string, hours = 24) => {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from('edge_function_health_logs')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500);

      if (functionName) {
        query = query.eq('function_name', functionName);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setLogs((data || []) as HealthLog[]);
    } catch (err) {
      console.error('Error fetching health logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    }
  }, []);

  const fetchSummaries = useCallback(async () => {
    try {
      // Get the latest status for each function
      const { data: latestLogs, error: logsError } = await supabase
        .from('edge_function_health_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (logsError) throw logsError;

      // Group by function and calculate summaries
      const functionMap = new Map<string, HealthLog[]>();
      (latestLogs || []).forEach((log) => {
        const typedLog: HealthLog = {
          ...log,
          status: log.status as HealthLog['status'],
          check_type: log.check_type as HealthLog['check_type'],
          metadata: log.metadata as Record<string, unknown>,
        };
        const existing = functionMap.get(typedLog.function_name) || [];
        existing.push(typedLog);
        functionMap.set(typedLog.function_name, existing);
      });

      // Get recovery attempts for today to calculate recoveryAttemptsToday
      const { data: todayRecoveries } = await supabase
        .from('edge_function_recovery_attempts')
        .select('function_name')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const recoveryCountMap = new Map<string, number>();
      (todayRecoveries || []).forEach((r: { function_name: string }) => {
        recoveryCountMap.set(r.function_name, (recoveryCountMap.get(r.function_name) || 0) + 1);
      });

      const newSummaries: HealthSummary[] = [];
      const newCriticalFunctions: string[] = [];

      functionMap.forEach((funcLogs, functionName) => {
        const latestLog = funcLogs[0];
        const responseTimes = funcLogs
          .filter(l => l.response_time_ms !== null)
          .map(l => l.response_time_ms!);
        const healthyCount = funcLogs.filter(l => l.status === 'healthy').length;

        // Count consecutive failures
        let consecutiveFailures = 0;
        for (const log of funcLogs) {
          if (log.status === 'unhealthy' || log.status === 'timeout') {
            consecutiveFailures++;
          } else {
            break;
          }
        }

        const isCritical = consecutiveFailures >= 5;
        if (isCritical) {
          newCriticalFunctions.push(functionName);
        }

        newSummaries.push({
          functionName,
          currentStatus: latestLog.status,
          avgResponseTime: responseTimes.length > 0 
            ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
            : 0,
          successRate: funcLogs.length > 0 
            ? Math.round((healthyCount / funcLogs.length) * 100)
            : 0,
          lastChecked: latestLog.created_at,
          consecutiveFailures,
          isCritical,
          recoveryAttemptsToday: recoveryCountMap.get(functionName) || 0,
        });
      });

      setSummaries(newSummaries.sort((a, b) => a.functionName.localeCompare(b.functionName)));
      setCriticalFunctions(newCriticalFunctions);
    } catch (err) {
      console.error('Error fetching summaries:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch summaries');
    }
  }, []);

  const fetchAlertConfigs = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('edge_function_alert_config')
        .select('*')
        .order('function_name');

      if (fetchError) throw fetchError;
      setAlertConfigs((data || []) as AlertConfig[]);
    } catch (err) {
      console.error('Error fetching alert configs:', err);
    }
  }, []);

  const updateAlertConfig = useCallback(async (functionName: string, config: Partial<AlertConfig>) => {
    try {
      const { error: updateError } = await supabase
        .from('edge_function_alert_config')
        .upsert({
          function_name: functionName,
          ...config,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'function_name',
        });

      if (updateError) throw updateError;

      toast({
        title: 'Configuration updated',
        description: `Alert settings for ${functionName} have been saved.`,
      });

      await fetchAlertConfigs();
    } catch (err) {
      console.error('Error updating alert config:', err);
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Failed to update configuration',
        variant: 'destructive',
      });
    }
  }, [toast, fetchAlertConfigs]);

  const fetchRecoveryAttempts = useCallback(async () => {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error: fetchError } = await supabase
        .from('edge_function_recovery_attempts')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;
      
      const typedData: RecoveryAttempt[] = (data || []).map((item) => ({
        ...item,
        attempt_type: item.attempt_type as RecoveryAttempt['attempt_type'],
        status: item.status as RecoveryAttempt['status'],
        triggered_by: item.triggered_by as RecoveryAttempt['triggered_by'],
        metadata: item.metadata as Record<string, unknown>,
      }));
      
      setRecoveryAttempts(typedData);
    } catch (err) {
      console.error('Error fetching recovery attempts:', err);
    }
  }, []);

  const triggerHealthCheck = useCallback(async (functions?: string[]) => {
    setIsCheckRunning(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('edge-function-health-check', {
        body: {
          checkType: 'manual',
          functions: functions || null,
        },
      });

      if (invokeError) throw invokeError;

      const recoveryInfo = data?.recoveryAttempts?.length > 0 
        ? ` Recovery attempted for ${data.recoveryAttempts.length} function(s).`
        : '';

      toast({
        title: 'Health check complete',
        description: `Checked ${data?.summary?.total || 0} functions. ${data?.summary?.healthy || 0} healthy.${recoveryInfo}`,
      });

      // Refresh data
      await Promise.all([fetchLogs(), fetchSummaries(), fetchRecoveryAttempts()]);
    } catch (err) {
      console.error('Error triggering health check:', err);
      toast({
        title: 'Health check failed',
        description: err instanceof Error ? err.message : 'Failed to run health check',
        variant: 'destructive',
      });
    } finally {
      setIsCheckRunning(false);
    }
  }, [toast, fetchLogs, fetchSummaries, fetchRecoveryAttempts]);

  const triggerManualRecovery = useCallback(async (functionName: string) => {
    setIsCheckRunning(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('edge-function-health-check', {
        body: {
          checkType: 'manual',
          functions: [functionName],
          skipRecovery: false,
        },
      });

      if (invokeError) throw invokeError;

      const wasRecovered = data?.recoveries?.includes(functionName);
      
      toast({
        title: wasRecovered ? 'Recovery successful' : 'Recovery attempted',
        description: wasRecovered 
          ? `${functionName} is now healthy.`
          : `Recovery attempted for ${functionName}. Check status for results.`,
        variant: wasRecovered ? 'default' : 'destructive',
      });

      await Promise.all([fetchLogs(), fetchSummaries(), fetchRecoveryAttempts()]);
    } catch (err) {
      console.error('Error triggering manual recovery:', err);
      toast({
        title: 'Recovery failed',
        description: err instanceof Error ? err.message : 'Failed to trigger recovery',
        variant: 'destructive',
      });
    } finally {
      setIsCheckRunning(false);
    }
  }, [toast, fetchLogs, fetchSummaries, fetchRecoveryAttempts]);

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchLogs(),
        fetchSummaries(),
        fetchAlertConfigs(),
        fetchRecoveryAttempts(),
      ]);
      setLoading(false);
    };

    loadData();

    // Set up real-time subscriptions
    const healthChannel = supabase
      .channel('health-logs-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'edge_function_health_logs' },
        () => {
          fetchLogs();
          fetchSummaries();
        }
      )
      .subscribe();

    const recoveryChannel = supabase
      .channel('recovery-attempts-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'edge_function_recovery_attempts' },
        () => {
          fetchRecoveryAttempts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(healthChannel);
      supabase.removeChannel(recoveryChannel);
    };
  }, [fetchLogs, fetchSummaries, fetchAlertConfigs, fetchRecoveryAttempts]);

  return {
    logs,
    summaries,
    alertConfigs,
    recoveryAttempts,
    criticalFunctions,
    loading,
    error,
    fetchLogs,
    fetchSummaries,
    fetchRecoveryAttempts,
    updateAlertConfig,
    triggerHealthCheck,
    triggerManualRecovery,
    isCheckRunning,
  };
}
