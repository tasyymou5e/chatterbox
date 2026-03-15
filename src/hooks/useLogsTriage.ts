import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SystemError {
  id: string;
  error_type: string;
  message: string;
  stack_trace: string | null;
  component_name: string | null;
  route_path: string | null;
  severity: string;
  user_id: string | null;
  session_id: string | null;
  browser_info: Record<string, unknown> | null;
  device_info: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  resolved: boolean | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface LogFilters {
  severity: string;
  component: string;
  keyword: string;
  resolved: 'all' | 'resolved' | 'unresolved';
  dateRange: 'day' | 'week' | 'month' | 'all';
}

const DEFAULT_FILTERS: LogFilters = {
  severity: 'all',
  component: 'all',
  keyword: '',
  resolved: 'all',
  dateRange: 'week',
};

export const useLogsTriage = () => {
  const [logs, setLogs] = useState<SystemError[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LogFilters>(DEFAULT_FILTERS);
  const [stats, setStats] = useState({ total: 0, critical: 0, unresolved: 0 });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('system_errors')
        .select('id, error_type, message, stack_trace, component_name, route_path, severity, user_id, session_id, browser_info, device_info, metadata, resolved, resolved_at, resolved_by, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters.severity !== 'all') {
        query = query.eq('severity', filters.severity);
      }
      if (filters.component !== 'all') {
        query = query.eq('component_name', filters.component);
      }
      if (filters.keyword) {
        query = query.ilike('message', `%${filters.keyword}%`);
      }
      if (filters.resolved === 'resolved') {
        query = query.eq('resolved', true);
      } else if (filters.resolved === 'unresolved') {
        query = query.or('resolved.is.null,resolved.eq.false');
      }
      if (filters.dateRange !== 'all') {
        const days = filters.dateRange === 'day' ? 1 : filters.dateRange === 'week' ? 7 : 30;
        query = query.gte('created_at', new Date(Date.now() - days * 86400000).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const typed = (data ?? []) as unknown as SystemError[];
      setLogs(typed);
      setStats({
        total: typed.length,
        critical: typed.filter((l) => l.severity === 'critical').length,
        unresolved: typed.filter((l) => !l.resolved).length,
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const resolveErrors = async (ids: string[]) => {
    const { error } = await supabase
      .from('system_errors')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .in('id', ids);
    if (!error) fetchLogs();
    return { error };
  };

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-triage-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { logs, loading, filters, setFilters, stats, resolveErrors, exportLogs, refetch: fetchLogs };
};
