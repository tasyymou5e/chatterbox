import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Filter, Download, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

interface DeviceInfo {
  platform?: string;
  screenResolution?: string;
  userAgent?: string;
  timezone?: string;
  language?: string;
}

interface LogMetadata {
  loginTime?: string;
  action?: string;
  target?: string;
  [key: string]: unknown;
}

interface ProfileInfo {
  first_name?: string;
  last_name?: string;
}

interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  timestamp: string;
  ip_address?: unknown;
  user_agent?: string | null;
  device_info: DeviceInfo | Record<string, unknown> | null;
  session_id?: string | null;
  success: boolean;
  failure_reason?: string | null;
  metadata: LogMetadata | Record<string, unknown> | null;
  profiles?: ProfileInfo | null;
}

const ActivityLogsTable = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const fetchLogs = async () => {
    if (!user) {
      setError('Authentication required');
      setLoading(false);
      setIsCheckingAuth(false);
      return;
    }

    // Check if user has admin access
    setIsCheckingAuth(true);

    setLoading(true);
    setError(null);
    
    try {
      // First check admin access
      const { data: hasAdminAccess, error: roleError } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (roleError) {
        console.error('Error checking admin role:', roleError);
        setError('Failed to verify admin access');
        setIsCheckingAuth(false);
        setLoading(false);
        return;
      }

      if (!hasAdminAccess) {
        setError('Admin access required to view activity logs');
        setIsCheckingAuth(false);
        setLoading(false);
        return;
      }

      setIsCheckingAuth(false);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange));

      let query = supabase
        .from('user_activity_logs')
        .select(`
          *,
          profiles (
            first_name,
            last_name
          )
        `)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('activity_type', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching activity logs:', error);
        if (error.message?.includes('permission')) {
          setError('Access denied. Admin privileges required.');
        } else {
          setError(`Failed to fetch activity logs: ${error.message}`);
        }
      } else {
        let filteredData = (data || []) as ActivityLog[];
        
        if (searchTerm) {
          filteredData = filteredData.filter(log => {
            const profile = log.profiles;
            const profileFirstName = profile && 'first_name' in profile ? profile.first_name : undefined;
            const profileLastName = profile && 'last_name' in profile ? profile.last_name : undefined;
            return profileFirstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              profileLastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              log.user_id?.includes(searchTerm) ||
              log.ip_address?.toString().includes(searchTerm) ||
              log.session_id?.includes(searchTerm);
          });
        }
        
        setLogs(filteredData);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError('An unexpected error occurred while fetching logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user, filter, dateRange]);

  const getActivityBadge = (activityType: string, success: boolean) => {
    const baseClasses = "font-medium";
    
    switch (activityType) {
      case 'login':
        return <Badge variant={success ? "default" : "destructive"} className={baseClasses}>
          <CheckCircle className="w-3 h-3 mr-1" />
          Login
        </Badge>;
      case 'logout':
        return <Badge variant="secondary" className={baseClasses}>
          <Eye className="w-3 h-3 mr-1" />
          Logout
        </Badge>;
      case 'signup':
        return <Badge variant={success ? "default" : "destructive"} className={baseClasses}>
          <CheckCircle className="w-3 h-3 mr-1" />
          Signup
        </Badge>;
      case 'failed_login':
        return <Badge variant="destructive" className={baseClasses}>
          <AlertTriangle className="w-3 h-3 mr-1" />
          Failed Login
        </Badge>;
      case 'password_reset':
        return <Badge variant="outline" className={baseClasses}>
          Password Reset
        </Badge>;
      case 'session_expired':
        return <Badge variant="secondary" className={baseClasses}>
          Session Expired
        </Badge>;
      default:
        return <Badge variant="outline" className={baseClasses}>{activityType}</Badge>;
    }
  };

  const getUserName = (log: ActivityLog) => {
    const profile = log.profiles;
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return `User ${log.user_id.slice(0, 8)}...`;
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Activity', 'Success', 'IP Address', 'Device', 'Failure Reason'].join(','),
      ...logs.map(log => [
        format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        getUserName(log),
        log.activity_type,
        log.success ? 'Yes' : 'No',
        log.ip_address?.toString() || 'N/A',
        log.device_info?.platform || 'N/A',
        log.failure_reason || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading || isCheckingAuth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">
              {isCheckingAuth ? 'Verifying admin access...' : 'Loading activity logs...'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Activity Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Access Error</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            {error.includes('Authentication required') && (
              <Button onClick={() => window.location.href = '/admin/login'}>
                Go to Admin Login
              </Button>
            )}
            {error.includes('Admin access required') && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  You need administrator privileges to view activity logs.
                </p>
                <Button onClick={() => window.location.href = '/admin/login'}>
                  Sign in as Admin
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Activity Logs
        </CardTitle>
        <div className="flex flex-wrap gap-4 mt-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="signup">Signup</SelectItem>
              <SelectItem value="failed_login">Failed Login</SelectItem>
              <SelectItem value="password_reset">Password Reset</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Search users, IP, session..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />

          <Button onClick={exportLogs} variant="outline" className="ml-auto">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8">
            <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Activity Logs Found</h3>
            <p className="text-muted-foreground mb-4">
              No activity logs found for the selected criteria.
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Try adjusting the date range or filters</p>
              <p>• Activity logs are created when users sign in/out</p>
              <p>• Showing logs from the last {dateRange} day{parseInt(dateRange) !== 1 ? 's' : ''}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Session ID</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{getUserName(log)}</div>
                      <div className="text-sm text-muted-foreground">User ID: {log.user_id}</div>
                    </TableCell>
                    <TableCell>
                      {getActivityBadge(log.activity_type, log.success)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{(log.device_info as DeviceInfo | null)?.platform || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">
                        {(log.device_info as DeviceInfo | null)?.screenResolution || ''}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.ip_address?.toString() || 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.session_id || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.failure_reason ? (
                        <div className="text-destructive">{log.failure_reason}</div>
                      ) : (
                        <div className="text-muted-foreground">
                          {(() => {
                            const meta = log.metadata as LogMetadata | null;
                            return meta?.loginTime ? format(new Date(meta.loginTime), 'HH:mm:ss') : '';
                          })()}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityLogsTable;