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
  RefreshCw,
  BarChart3
} from 'lucide-react';
import CreateTestFamilyButton from '@/components/admin/CreateTestFamilyButton';
import { AnalyticsKPICard } from '@/components/analytics/AnalyticsKPICard';
import { EngagementChart } from '@/components/analytics/EngagementChart';
import { RetentionChart } from '@/components/analytics/RetentionChart';
import { SystemHealthWidget } from '@/components/analytics/SystemHealthWidget';
import { useAnalyticsWithSession } from '@/hooks/useAnalyticsWithSession';
import { useUIStore } from '@/stores/uiStore';
import { useAdminStore } from '@/stores/adminStore';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuthStore } from '@/stores/authStore';
import EnhancedSecurityDashboard from '@/components/admin/EnhancedSecurityDashboard';
import AdminSiteSettings from '@/components/admin/AdminSiteSettings';
import AdminAPIIntegrations from '@/components/admin/AdminAPIIntegrations';

interface DashboardStats {
  totalFamilies: number;
  totalUsers: number;
  totalParents: number;
  totalChildren: number;
  recentSignups: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { sessionReady, isAdmin } = useAuthStore();
  const { 
    getLoading, 
    setLoading
  } = useUIStore();
  const {
    systemMetrics,
    fetchSystemMetrics
  } = useAdminStore();
  
  const dashboardLoading = getLoading('adminDashboard');
  const [stats, setStats] = useState<DashboardStats>({
    totalFamilies: 0,
    totalUsers: 0,
    totalParents: 0,
    totalChildren: 0,
    recentSignups: 0,
  });
  const { 
    engagementMetrics, 
    dailyAnalytics, 
    retentionData, 
    loading: analyticsLoading, 
    error: analyticsError, 
    refreshAnalytics,
    waitForSessionAndRefresh 
  } = useAnalyticsWithSession();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Load system health data on mount
  useEffect(() => {
    if (sessionReady && isAdmin) {
      fetchSystemMetrics();
    }
  }, [sessionReady, isAdmin, fetchSystemMetrics]);

  // Extract fetchDashboardStats to be reusable
  const fetchDashboardStats = async () => {
    setLoading('adminDashboard', true);
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
      setLoading('adminDashboard', false);
    }
  };

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
    <ErrorBoundary componentName="AdminDashboard">
      <div className="p-6 space-y-8">
        {/* Session Status Indicator */}
        {!sessionReady && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin text-warning" />
              <span className="text-warning">Initializing admin session...</span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive insights and system monitoring for Chatterbox
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={sessionReady ? refreshAnalytics : waitForSessionAndRefresh} 
            variant="outline" 
            size="sm"
            disabled={analyticsLoading}
            className="border-border"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${analyticsLoading ? 'animate-spin' : ''}`} />
            {sessionReady ? 'Refresh' : 'Initialize'}
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
          loading={dashboardLoading}
        />
        <AnalyticsKPICard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          loading={dashboardLoading}
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
          loading={dashboardLoading}
        />
      </div>

      {/* Analytics Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <EngagementChart data={dailyAnalytics} loading={analyticsLoading} />
        <RetentionChart data={retentionData} loading={analyticsLoading} />
      </div>

      {/* System Health, Settings, API Integrations, and Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SystemHealthWidget data={systemMetrics || []} loading={!sessionReady} />
        <AdminSiteSettings />
      </div>

      {/* API Integrations and Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminAPIIntegrations />
        
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
              <Button 
                variant="outline"
                className="w-full justify-start border-border"
                onClick={() => navigate('/admin/llm-monitoring')}
              >
                <Activity className="h-4 w-4 mr-2" />
                LLM Monitoring
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Security Dashboard */}
      <EnhancedSecurityDashboard />

        {/* Error Display */}
        {analyticsError && (
          <Card className="bg-destructive/10 border-destructive/20 shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-destructive text-sm">
                  Analytics Error: {analyticsError}
                </p>
                <Button 
                  onClick={waitForSessionAndRefresh}
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/20 hover:bg-destructive/10"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ErrorBoundary>
  );
}