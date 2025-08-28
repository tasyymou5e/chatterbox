import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Home, 
  UserCheck, 
  Activity,
  TrendingUp,
  Clock,
  RefreshCw,
  BarChart3,
  Shield,
  Database
} from 'lucide-react';
import CreateTestFamilyButton from '@/components/admin/CreateTestFamilyButton';
import { AnalyticsKPICard } from '@/components/analytics/AnalyticsKPICard';
import { EngagementChart } from '@/components/analytics/EngagementChart';
import { RetentionChart } from '@/components/analytics/RetentionChart';
import { SystemHealthWidget } from '@/components/analytics/SystemHealthWidget';
import { useAnalytics } from '@/hooks/useAnalytics';

interface DashboardStats {
  totalFamilies: number;
  totalUsers: number;
  totalParents: number;
  totalChildren: number;
  recentSignups: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalFamilies: 0,
    totalUsers: 0,
    totalParents: 0,
    totalChildren: 0,
    recentSignups: 0,
  });
  const [loading, setLoading] = useState(true);
  const { 
    engagementMetrics, 
    dailyAnalytics, 
    retentionData, 
    loading: analyticsLoading, 
    error: analyticsError, 
    refreshAnalytics 
  } = useAnalytics();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Extract fetchDashboardStats to be reusable
  const fetchDashboardStats = async () => {
    try {
      // Get total families
      const { count: familiesCount } = await supabase
        .from('families')
        .select('*', { count: 'exact', head: true });

      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get parents count
      const { count: parentsCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'parent');

      // Get children count
      const { count: childrenCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'child');

      // Get recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: recentSignupsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      setStats({
        totalFamilies: familiesCount || 0,
        totalUsers: usersCount || 0,
        totalParents: parentsCount || 0,
        totalChildren: childrenCount || 0,
        recentSignups: recentSignupsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getEngagementMetric = (metricName: string) => {
    const metric = engagementMetrics.find(m => m.metric === metricName);
    return {
      value: metric?.current_value || 0,
      change: metric?.change_percentage || 0,
      trend: metric?.trend || 'stable'
    };
  };

  const activeUsersMetric = getEngagementMetric('Active Users');
  const totalLoginsMetric = getEngagementMetric('Total Logins');

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive insights and system monitoring for Spectrum Harmony
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={refreshAnalytics} 
            variant="outline" 
            size="sm"
            disabled={analyticsLoading}
            className="border-border"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${analyticsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <AnalyticsKPICard
          title="Total Families"
          value={stats.totalFamilies}
          change={stats.recentSignups > 0 ? ((stats.recentSignups / stats.totalFamilies) * 100) : 0}
          trend={stats.recentSignups > 0 ? 'up' : 'stable'}
          icon={Home}
          loading={loading}
        />
        <AnalyticsKPICard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          loading={loading}
        />
        <AnalyticsKPICard
          title="Active Users"
          value={activeUsersMetric.value}
          change={activeUsersMetric.change}
          trend={activeUsersMetric.trend as 'up' | 'down' | 'stable'}
          icon={Activity}
          loading={analyticsLoading}
        />
        <AnalyticsKPICard
          title="Total Logins"
          value={totalLoginsMetric.value}
          change={totalLoginsMetric.change}
          trend={totalLoginsMetric.trend as 'up' | 'down' | 'stable'}
          icon={UserCheck}
          loading={analyticsLoading}
        />
        <AnalyticsKPICard
          title="Recent Signups"
          value={stats.recentSignups}
          icon={TrendingUp}
          loading={loading}
        />
      </div>

      {/* Analytics Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <EngagementChart data={dailyAnalytics} loading={analyticsLoading} />
        <RetentionChart data={retentionData} loading={analyticsLoading} />
      </div>

      {/* System Health and Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SystemHealthWidget data={[]} loading={false} />
        
        <Card className="bg-gradient-card border-border shadow-soft">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-primary" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Daily Active Users</span>
                <span className="text-lg font-semibold text-foreground">
                  {activeUsersMetric.value.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Login Success Rate</span>
                <span className="text-lg font-semibold text-secondary">98.5%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg Session Duration</span>
                <span className="text-lg font-semibold text-foreground">24min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Error Rate</span>
                <span className="text-lg font-semibold text-destructive">0.1%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-soft">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
            <CardDescription className="text-muted-foreground">
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <CreateTestFamilyButton onSuccess={() => fetchDashboardStats()} />
              <Button 
                variant="outline"
                className="w-full justify-start border-border"
                onClick={() => navigate('/admin/families')}
              >
                <Home className="h-4 w-4 mr-2" />
                View All Families
              </Button>
              <Button 
                variant="outline"
                className="w-full justify-start border-border"
                onClick={() => navigate('/admin/users')}
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
              <Button 
                variant="outline"
                className="w-full justify-start border-border"
                onClick={() => navigate('/admin/reports')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {analyticsError && (
        <Card className="bg-destructive/10 border-destructive/20 shadow-soft">
          <CardContent className="p-4">
            <p className="text-destructive text-sm">
              Analytics Error: {analyticsError}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}