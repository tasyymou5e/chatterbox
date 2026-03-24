import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  BarChart, 
  Download,
  Activity,
  Users,
  TrendingUp,
  CheckCircle,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ActivityLogsTable from '@/components/reports/ActivityLogsTable';
import FamilyActivityReport from '@/components/reports/FamilyActivityReport';
import { AdvancedAnalyticsDashboard } from '@/components/analytics/AdvancedAnalyticsDashboard';
import { getErrorMessage } from '@/utils/getErrorMessage';
interface SystemStats {
  totalUsers: number;
  totalFamilies: number;
  dailySignups: number;
  weeklySignups: number;
  monthlySignups: number;
  activeUsers: number;
}

interface ActivitySummary {
  date: string;
  logins: number;
  signups: number;
  familyCreations: number;
}

export default function AdminReports() {
  const { user, isAdmin, loading: authLoading } = useAdminAuth();
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalFamilies: 0,
    dailySignups: 0,
    weeklySignups: 0,
    monthlySignups: 0,
    activeUsers: 0
  });
  const [activitySummary, setActivitySummary] = useState<ActivitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReportsData = useCallback(async () => {
    try {
      // Get basic stats
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: totalFamilies } = await supabase
        .from('families')
        .select('*', { count: 'exact', head: true });

      // Get signup trends
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const { count: dailySignups } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo.toISOString());

      const { count: weeklySignups } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString());

      const { count: monthlySignups } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneMonthAgo.toISOString());

      // Get active users (users with recent activity)
      const { count: activeUsers } = await supabase
        .from('user_activity_logs')
        .select('user_id', { count: 'exact', head: true })
        .gte('timestamp', oneWeekAgo.toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        totalFamilies: totalFamilies || 0,
        dailySignups: dailySignups || 0,
        weeklySignups: weeklySignups || 0,
        monthlySignups: monthlySignups || 0,
        activeUsers: activeUsers || 0
      });

      // Get activity summary for the last 7 days
      const { data: activityData } = await supabase
        .from('user_activity_logs')
        .select('activity_type, timestamp')
        .gte('timestamp', oneWeekAgo.toISOString())
        .order('timestamp', { ascending: false });

      // Process activity data by date
      const activityByDate = new Map<string, { logins: number; signups: number; familyCreations: number }>();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        activityByDate.set(dateStr, { logins: 0, signups: 0, familyCreations: 0 });
      }

      activityData?.forEach(log => {
        const dateStr = log.timestamp.split('T')[0];
        const dayData = activityByDate.get(dateStr);
        if (dayData) {
          if (log.activity_type === 'login') dayData.logins++;
          if (log.activity_type === 'signup') dayData.signups++;
        }
      });

      const summaryArray = Array.from(activityByDate.entries()).map(([date, data]) => ({
        date,
        ...data
      })).reverse();

      setActivitySummary(summaryArray);

    } catch (error: unknown) {
      cError('Error fetching reports data:', getErrorMessage(error));
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(error)
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // useEffect MUST be called before any conditional returns
  useEffect(() => {
    if (user && isAdmin) {
      fetchReportsData();
    }
  }, [user, isAdmin, fetchReportsData]);

  // Now we can do early returns for loading/auth states
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Admin Access Required</CardTitle>
            <CardDescription>
              You need administrator privileges to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Please sign in with an admin account to view reports.
            </p>
            <Button onClick={() => window.location.href = '/admin/login'} className="w-full">
              Go to Admin Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend 
  }: { 
    title: string; 
    value: number; 
    description: string; 
    icon: React.ElementType; 
    trend?: string;
  }) => (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-300">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-blue-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">
          {loading ? '...' : value.toLocaleString()}
        </div>
        <p className="text-xs text-gray-400">
          {description}
        </p>
        {trend && (
          <p className="text-xs text-green-400 mt-1">
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <BarChart className="h-8 w-8 mr-3 text-blue-400" />
            Admin Reports
          </h1>
          <p className="text-gray-400 mt-1">
            System analytics and comprehensive reports
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          description="All registered users"
          icon={Users}
          trend={`+${stats.monthlySignups} this month`}
        />
        <StatCard
          title="Total Families"
          value={stats.totalFamilies}
          description="Registered family groups"
          icon={Activity}
        />
        <StatCard
          title="Daily Signups"
          value={stats.dailySignups}
          description="New users today"
          icon={TrendingUp}
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          description="Active this week"
          icon={CheckCircle}
        />
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
          <TabsTrigger value="overview" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-700">
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-700">
            Activity Logs
          </TabsTrigger>
          <TabsTrigger value="families" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-700">
            Family Reports
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-700">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6">
            {/* Growth Trends */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Growth Trends</CardTitle>
                <CardDescription className="text-gray-400">
                  User registration and activity trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">{stats.dailySignups}</div>
                    <div className="text-sm text-gray-400">Daily Signups</div>
                  </div>
                  <div className="text-center p-4 bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">{stats.weeklySignups}</div>
                    <div className="text-sm text-gray-400">Weekly Signups</div>
                  </div>
                  <div className="text-center p-4 bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">{stats.monthlySignups}</div>
                    <div className="text-sm text-gray-400">Monthly Signups</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Summary */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">7-Day Activity Summary</CardTitle>
                <CardDescription className="text-gray-400">
                  Daily breakdown of user activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300">Date</TableHead>
                      <TableHead className="text-gray-300">Logins</TableHead>
                      <TableHead className="text-gray-300">Signups</TableHead>
                      <TableHead className="text-gray-300">Total Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activitySummary.map((day) => (
                      <TableRow key={day.date} className="border-gray-700">
                        <TableCell className="text-white">
                          {new Date(day.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-white">{day.logins}</TableCell>
                        <TableCell className="text-white">{day.signups}</TableCell>
                        <TableCell className="text-white">
                          {day.logins + day.signups + day.familyCreations}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <ActivityLogsTable />
        </TabsContent>

        <TabsContent value="families">
          <FamilyActivityReport />
        </TabsContent>

        <TabsContent value="analytics">
          <AdvancedAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}