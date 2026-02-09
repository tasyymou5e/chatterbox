import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, Download, User, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cError } from '@/utils/conditionalLogger';
import type { DeviceInfoData, ActivityMetadata } from '@/types/interfaces';

interface UserActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: DeviceInfoData;
  session_id: string | null;
  success: boolean;
  failure_reason: string | null;
  metadata: ActivityMetadata;
  created_at: string;
  timestamp: string;
}

export const UserActivityLogs = () => {
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [successFilter, setSuccessFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      setRefreshing(true);
      
      let query = supabase
        .from('user_activity_logs')
        .select('id, user_id, activity_type, success, failure_reason, ip_address, user_agent, session_id, device_info, metadata, created_at, timestamp')
        .order('created_at', { ascending: false })
        .limit(100);

      if (activityFilter !== 'all') {
        query = query.eq('activity_type', activityFilter);
      }

      if (successFilter !== 'all') {
        query = query.eq('success', successFilter === 'success');
      }

      if (searchTerm) {
        query = query.or(`activity_type.ilike.%${searchTerm}%,user_agent.ilike.%${searchTerm}%,failure_reason.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs((data || []).map(log => ({
        ...log,
        ip_address: log.ip_address as string | null,
        device_info: (log.device_info as DeviceInfoData) || {},
        metadata: (log.metadata as ActivityMetadata) || {}
      })));
    } catch (error: unknown) {
      cError('Error fetching user activity logs', error);
      toast({
        title: "Error",
        description: "Failed to fetch user activity logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Set up real-time subscription
    const channel = supabase
      .channel('user_activity_logs_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'user_activity_logs' },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLogs, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [searchTerm, activityFilter, successFilter]);

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'login':
      case 'signup':
        return <User className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusColor = (success: boolean) => {
    return success 
      ? 'bg-green-500 text-white' 
      : 'bg-red-500 text-white';
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User ID', 'Activity Type', 'Success', 'IP Address', 'User Agent', 'Failure Reason'].join(','),
      ...logs.map(log => [
        new Date(log.created_at).toISOString(),
        log.user_id,
        log.activity_type,
        log.success ? 'Yes' : 'No',
        log.ip_address || '',
        `"${(log.user_agent || '').replace(/"/g, '""')}"`,
        `"${(log.failure_reason || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading user activity logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by activity type, user agent, or failure reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={activityFilter} onValueChange={setActivityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by activity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activities</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="signup">Signup</SelectItem>
            <SelectItem value="logout">Logout</SelectItem>
          </SelectContent>
        </Select>

        <Select value={successFilter} onValueChange={setSuccessFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failure">Failure</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          onClick={fetchLogs}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>

        <Button 
          variant="outline" 
          onClick={exportLogs}
          disabled={logs.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {logs.length === 0 ? 'No user activity found' : `Showing ${logs.length} activit${logs.length !== 1 ? 'ies' : 'y'}`}
      </div>

      {/* Logs Table */}
      {logs.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Timestamp</th>
                  <th className="text-left p-3 font-medium">User ID</th>
                  <th className="text-left p-3 font-medium">Activity</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">IP Address</th>
                  <th className="text-left p-3 font-medium">User Agent</th>
                  <th className="text-left p-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-muted/50">
                    <td className="p-3 font-mono text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {log.user_id.slice(0, 8)}...
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        {getActivityIcon(log.activity_type)}
                        {log.activity_type}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={`flex items-center gap-1 w-fit ${getStatusColor(log.success)}`}>
                        {getStatusIcon(log.success)}
                        {log.success ? 'Success' : 'Failed'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {log.ip_address ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.ip_address}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 max-w-xs">
                      {log.user_agent ? (
                        <div className="truncate text-xs" title={log.user_agent}>
                          {log.user_agent}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {log.failure_reason ? (
                        <Badge variant="destructive" className="text-xs">
                          {log.failure_reason}
                        </Badge>
                      ) : log.session_id ? (
                        <Badge variant="outline" className="text-xs font-mono">
                          Session: {log.session_id.slice(0, 8)}...
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};