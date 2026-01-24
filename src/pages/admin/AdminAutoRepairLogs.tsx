import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfDay } from 'date-fns';
import {
  AutoRepairStatsCards,
  RepairTrendsChart,
  RepairedFieldsChart,
  AutoRepairLogsTable,
  type RepairStats,
  type DailyRepairData,
  type FieldDistribution,
  type AutoRepairLog,
} from '@/components/admin/auto-repair';

type DateRange = '7d' | '30d' | '90d';

export default function AdminAutoRepairLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AutoRepairLog[]>([]);
  const [stats, setStats] = useState<RepairStats>({
    totalRepairs: 0,
    successfulRepairs: 0,
    failedRepairs: 0,
    profileRepairs: 0,
    roleRepairs: 0,
    familyRepairs: 0,
    uniqueUsers: 0,
  });
  const [dailyTrends, setDailyTrends] = useState<DailyRepairData[]>([]);
  const [fieldDistribution, setFieldDistribution] = useState<FieldDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('7d');

  const getDateRangeStart = useCallback((range: DateRange): Date => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    return startOfDay(subDays(new Date(), days));
  }, []);

  const processLogsData = useCallback((rawLogs: AutoRepairLog[]) => {
    // Calculate statistics
    const successfulRepairs = rawLogs.filter(log => log.success).length;
    const failedRepairs = rawLogs.filter(log => !log.success).length;
    const profileRepairs = rawLogs.filter(log => log.profile_repair_details).length;
    const roleRepairs = rawLogs.filter(log => log.role_repair_details).length;
    const familyRepairs = rawLogs.filter(log => log.family_repair_details).length;
    const uniqueUsers = new Set(rawLogs.map(log => log.user_id)).size;

    setStats({
      totalRepairs: rawLogs.length,
      successfulRepairs,
      failedRepairs,
      profileRepairs,
      roleRepairs,
      familyRepairs,
      uniqueUsers,
    });

    // Calculate daily trends
    const dailyMap = new Map<string, { successful: number; failed: number }>();
    rawLogs.forEach(log => {
      const date = format(new Date(log.timestamp), 'MMM dd');
      const existing = dailyMap.get(date) || { successful: 0, failed: 0 };
      if (log.success) {
        existing.successful++;
      } else {
        existing.failed++;
      }
      dailyMap.set(date, existing);
    });

    const trends: DailyRepairData[] = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        successful: data.successful,
        failed: data.failed,
        total: data.successful + data.failed,
      }))
      .reverse();
    setDailyTrends(trends);

    // Calculate field distribution
    const totalFields = profileRepairs + roleRepairs + familyRepairs;
    const distribution: FieldDistribution[] = [
      { 
        field: 'profile', 
        count: profileRepairs, 
        percentage: totalFields > 0 ? (profileRepairs / totalFields) * 100 : 0 
      },
      { 
        field: 'role', 
        count: roleRepairs, 
        percentage: totalFields > 0 ? (roleRepairs / totalFields) * 100 : 0 
      },
      { 
        field: 'family', 
        count: familyRepairs, 
        percentage: totalFields > 0 ? (familyRepairs / totalFields) * 100 : 0 
      },
    ];
    setFieldDistribution(distribution);
  }, []);

  const fetchLogs = useCallback(async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const dateStart = getDateRangeStart(dateRange);
      
      const { data, error } = await supabase
        .from('auto_repair_logs')
        .select('*')
        .gte('timestamp', dateStart.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const rawLogs = (data || []) as AutoRepairLog[];
      setLogs(rawLogs);
      processLogsData(rawLogs);

      if (showRefreshToast) {
        toast({
          title: 'Data refreshed',
          description: `Loaded ${rawLogs.length} auto-repair events`,
        });
      }
    } catch (error) {
      console.error('Error fetching auto-repair logs:', error);
      toast({
        title: 'Error loading logs',
        description: 'Failed to fetch auto-repair logs. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, getDateRangeStart, processLogsData, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = () => {
    if (logs.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no logs to export.',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Timestamp', 'User ID', 'Status', 'Trigger', 'Fields Repaired', 'Failure Reason'];
    const rows = logs.map(log => [
      log.timestamp,
      log.user_id,
      log.success ? 'Success' : 'Failed',
      log.trigger_source,
      log.total_fields_repaired || '0',
      log.failure_reason || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auto-repair-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export complete',
      description: `Exported ${logs.length} log entries to CSV`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Wrench className="h-8 w-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Auto-Repair Monitoring</h1>
            <p className="text-gray-400 text-sm">Track and analyze automatic data repair events</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              <SelectItem value="7d" className="text-white hover:bg-gray-600">Last 7 days</SelectItem>
              <SelectItem value="30d" className="text-white hover:bg-gray-600">Last 30 days</SelectItem>
              <SelectItem value="90d" className="text-white hover:bg-gray-600">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <AutoRepairStatsCards statistics={stats} loading={loading} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RepairTrendsChart data={dailyTrends} loading={loading} />
        <RepairedFieldsChart data={fieldDistribution} loading={loading} />
      </div>

      {/* Logs Table */}
      <AutoRepairLogsTable logs={logs} loading={loading} onExport={handleExport} />
    </div>
  );
}
