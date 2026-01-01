import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Download, RefreshCw, Search, CheckCircle, XCircle, User, LogIn, LogOut, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  created_at: string;
  success: boolean | null;
  failure_reason: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export function ParentActivityLogsTable() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7');

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user, activityFilter, dateRange]);

  const fetchLogs = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Get families created by this parent
      const { data: families, error: familiesError } = await supabase
        .from('families')
        .select('id')
        .eq('created_by', user.id);
      
      if (familiesError) throw familiesError;
      
      if (!families || families.length === 0) {
        setLogs([]);
        setLoading(false);
        return;
      }

      const familyIds = families.map(f => f.id);

      // Get child members from these families
      const { data: childMembers, error: membersError } = await supabase
        .from('family_members')
        .select('user_id')
        .in('family_id', familyIds)
        .eq('role', 'child');

      if (membersError) throw membersError;
      
      if (!childMembers || childMembers.length === 0) {
        setLogs([]);
        setLoading(false);
        return;
      }

      const childUserIds = childMembers.map(m => m.user_id);

      // Calculate date filter
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch activity logs for children only
      let query = supabase
        .from('user_activity_logs')
        .select(`
          id,
          user_id,
          activity_type,
          created_at,
          success,
          failure_reason
        `)
        .in('user_id', childUserIds)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (activityFilter !== 'all') {
        query = query.eq('activity_type', activityFilter);
      }

      const { data: activityLogs, error: logsError } = await query;

      if (logsError) throw logsError;

      // Fetch profiles for the child users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', childUserIds);

      if (profilesError) throw profilesError;

      // Merge profile data with logs
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const logsWithProfiles = (activityLogs || []).map(log => ({
        ...log,
        profiles: profileMap.get(log.user_id) || null
      }));

      setLogs(logsWithProfiles);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'login':
        return <LogIn className="h-4 w-4 text-primary" />;
      case 'logout':
        return <LogOut className="h-4 w-4 text-muted-foreground" />;
      case 'signup':
        return <User className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (success: boolean | null) => {
    if (success === null) return null;
    return success ? (
      <Badge variant="default" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Success
      </Badge>
    ) : (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    );
  };

  const getChildName = (log: ActivityLog) => {
    if (log.profiles?.first_name || log.profiles?.last_name) {
      return `${log.profiles.first_name || ''} ${log.profiles.last_name || ''}`.trim();
    }
    return 'Unknown Child';
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const childName = getChildName(log).toLowerCase();
    return childName.includes(searchTerm.toLowerCase()) ||
           log.activity_type.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const exportLogs = () => {
    const csvContent = [
      ['Child Name', 'Activity', 'Status', 'Timestamp', 'Details'].join(','),
      ...filteredLogs.map(log => [
        getChildName(log),
        log.activity_type,
        log.success === null ? 'N/A' : log.success ? 'Success' : 'Failed',
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.failure_reason || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `children-activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exported successfully');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Children's Activity Logs
        </CardTitle>
        <CardDescription>
          View your children's login and activity history
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by child name or activity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={activityFilter} onValueChange={setActivityFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Activity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="signup">Signup</SelectItem>
              <SelectItem value="page_view">Page View</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchLogs}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={exportLogs} disabled={filteredLogs.length === 0}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-sm text-muted-foreground">
          Showing {filteredLogs.length} activities
        </p>

        {/* Table */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activity logs found for your children</p>
            <p className="text-sm mt-2">Activity will appear here as your children use the app</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {getChildName(log)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActivityIcon(log.activity_type)}
                        <span className="capitalize">{log.activity_type.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(log.success)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {log.failure_reason || '-'}
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
}
