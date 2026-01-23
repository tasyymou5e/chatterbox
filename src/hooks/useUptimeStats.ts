import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type UptimePeriod = '7d' | '30d' | '90d';

export interface UptimeStatsRecord {
  function_name: string;
  total_checks: number;
  healthy_checks: number;
  uptime_percentage: number;
  avg_response_time_ms: number;
  max_response_time_ms: number;
  min_response_time_ms: number;
  total_downtime_minutes: number;
}

export interface DailyUptimeTrend {
  date: string;
  function_name: string;
  uptime_percentage: number;
  avg_response_time_ms: number;
  total_checks: number;
  healthy_checks: number;
}

export interface SLAConfiguration {
  id: string;
  name: string;
  uptime_target: number;
  max_response_time_ms: number;
  is_default: boolean;
}

export type SLAStatus = 'passing' | 'warning' | 'failing';

export interface UptimeStatsWithSLA extends UptimeStatsRecord {
  slaStatus: SLAStatus;
  slaTarget: number;
}

const periodToDays: Record<UptimePeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

function calculateSLAStatus(
  uptimePercentage: number,
  slaTarget: number
): SLAStatus {
  if (uptimePercentage >= slaTarget) return 'passing';
  if (uptimePercentage >= slaTarget - 0.5) return 'warning';
  return 'failing';
}

export function useUptimeStats(period: UptimePeriod) {
  const days = periodToDays[period];

  // Fetch SLA configurations
  const slaQuery = useQuery({
    queryKey: ['sla-configurations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_configurations')
        .select('*')
        .order('uptime_target', { ascending: false });

      if (error) throw error;
      return data as SLAConfiguration[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch uptime stats
  const statsQuery = useQuery({
    queryKey: ['uptime-stats', period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_uptime_stats', {
        p_days: days,
      });

      if (error) throw error;
      return (data || []) as UptimeStatsRecord[];
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Get default SLA target
  const defaultSLA = slaQuery.data?.find((s) => s.is_default);
  const slaTarget = defaultSLA?.uptime_target ?? 99.0;

  // Calculate stats with SLA status
  const statsWithSLA: UptimeStatsWithSLA[] = (statsQuery.data || []).map(
    (stat) => ({
      ...stat,
      slaTarget,
      slaStatus: calculateSLAStatus(stat.uptime_percentage, slaTarget),
    })
  );

  // Calculate system-wide metrics
  const systemUptime =
    statsWithSLA.length > 0
      ? statsWithSLA.reduce((sum, s) => sum + s.uptime_percentage, 0) /
        statsWithSLA.length
      : 100;

  const passingCount = statsWithSLA.filter(
    (s) => s.slaStatus === 'passing'
  ).length;
  const warningCount = statsWithSLA.filter(
    (s) => s.slaStatus === 'warning'
  ).length;
  const failingCount = statsWithSLA.filter(
    (s) => s.slaStatus === 'failing'
  ).length;

  const avgResponseTime =
    statsWithSLA.length > 0
      ? statsWithSLA.reduce((sum, s) => sum + s.avg_response_time_ms, 0) /
        statsWithSLA.length
      : 0;

  const totalDowntime = statsWithSLA.reduce(
    (sum, s) => sum + s.total_downtime_minutes,
    0
  );

  return {
    stats: statsWithSLA,
    systemUptime: Math.round(systemUptime * 100) / 100,
    slaTarget,
    slaConfigurations: slaQuery.data || [],
    metrics: {
      totalFunctions: statsWithSLA.length,
      passingCount,
      warningCount,
      failingCount,
      avgResponseTime: Math.round(avgResponseTime),
      totalDowntime,
    },
    loading: statsQuery.isLoading || slaQuery.isLoading,
    error: statsQuery.error?.message || slaQuery.error?.message || null,
    refetch: () => {
      statsQuery.refetch();
      slaQuery.refetch();
    },
  };
}

export function useUptimeTrend(
  period: UptimePeriod,
  functionName?: string | null
) {
  const days = periodToDays[period];

  return useQuery({
    queryKey: ['uptime-trend', period, functionName],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_uptime_trend', {
        p_days: days,
        p_function_name: functionName ?? undefined,
      });

      if (error) throw error;
      return (data || []) as DailyUptimeTrend[];
    },
    staleTime: 60 * 1000,
  });
}
