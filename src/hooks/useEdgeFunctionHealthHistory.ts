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
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface HealthSummary {
  functionName: string;
  currentStatus: 'healthy' | 'unhealthy' | 'timeout' | 'unknown';
  avgResponseTime: number;
  successRate: number;
  lastChecked: string | null;
  consecutiveFailures: number;
}

interface UseEdgeFunctionHealthHistoryResult {
  logs: HealthLog[];
  summaries: HealthSummary[];
  alertConfigs: AlertConfig[];
  loading: boolean;
  error: string | null;
  fetchLogs: (functionName?: string, hours?: number) => Promise<void>;
  fetchSummaries: () => Promise<void>;
  updateAlertConfig: (functionName: string, config: Partial<AlertConfig>) => Promise<void>;
  triggerHealthCheck: (functions?: string[]) => Promise<void>;
  isCheckRunning: boolean;
}

export function useEdgeFunctionHealthHistory(): UseEdgeFunctionHealthHistoryResult {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [summaries, setSummaries] = useState<HealthSummary[]>([]);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
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

      const newSummaries: HealthSummary[] = [];
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
        });
      });

      setSummaries(newSummaries.sort((a, b) => a.functionName.localeCompare(b.functionName)));
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

      toast({
        title: 'Health check complete',
        description: `Checked ${data?.summary?.total || 0} functions. ${data?.summary?.healthy || 0} healthy.`,
      });

      // Refresh data
      await Promise.all([fetchLogs(), fetchSummaries()]);
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
  }, [toast, fetchLogs, fetchSummaries]);

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchLogs(),
        fetchSummaries(),
        fetchAlertConfigs(),
      ]);
      setLoading(false);
    };

    loadData();

    // Set up real-time subscription
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs, fetchSummaries, fetchAlertConfigs]);

  return {
    logs,
    summaries,
    alertConfigs,
    loading,
    error,
    fetchLogs,
    fetchSummaries,
    updateAlertConfig,
    triggerHealthCheck,
    isCheckRunning,
  };
}
