import { useState, useEffect, useCallback } from 'react';
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
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import CreateTestFamilyButton from '@/components/admin/CreateTestFamilyButton';
import { AnalyticsKPICard } from '@/components/analytics/AnalyticsKPICard';
import { LazyEngagementChart, LazyRetentionChart } from '@/components/analytics/lazy';
import { SystemHealthWidget } from '@/components/analytics/SystemHealthWidget';
import { useAnalyticsWithSession } from '@/hooks/useAnalyticsWithSession';
import { useUIStore } from '@/stores/uiStore';
import { useAdminStore } from '@/stores/adminStore';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuthStore } from '@/stores/authStore';
import EnhancedSecurityDashboard from '@/components/admin/EnhancedSecurityDashboard';
import AdminSiteSettings from '@/components/admin/AdminSiteSettings';
import AdminAPIIntegrations from '@/components/admin/AdminAPIIntegrations';
import { DashboardErrorBoundary } from '@/components/admin/DashboardErrorBoundary';
import { FallbackCard, DEFAULT_KPI_DATA, DEFAULT_SYSTEM_HEALTH } from '@/components/admin/DashboardFallback';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DashboardStats {
  totalFamilies: number;
  totalUsers: number;
  totalParents: number;
  totalChildren: number;
  recentSignups: number;
}

// Default stats when fetch fails
const DEFAULT_STATS: DashboardStats = DEFAULT_KPI_DATA;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { sessionReady, isAdmin, isHydrated } = useAuthStore();
  const { 
    getLoading, 
    setLoading
  } = useUIStore();
  const {
    systemMetrics,
    fetchSystemMetrics
  } = useAdminStore();
  
  const dashboardLoading = getLoading('adminDashboard');
  
  // Show loading state until hydration and session are ready
  const isInitializing = !isHydrated || !sessionReady;
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

  // Only fetch dashboard stats when session is ready
  useEffect(() => {
    if (sessionReady && isAdmin && isHydrated) {
      fetchDashboardStats();
    }
  }, [sessionReady, isAdmin, isHydrated]);

  // Load system health data when session is ready
  useEffect(() => {
    if (sessionReady && isAdmin && isHydrated) {
      fetchSystemMetrics();
    }
  }, [sessionReady, isAdmin, isHydrated, fetchSystemMetrics]);

  // State for tracking fetch errors
  const [statsError, setStatsError] = useState<string | null>(null);

  // Extract fetchDashboardStats to be reusable with error handling
  const fetchDashboardStats = useCallback(async () => {
    setLoading('adminDashboard', true);
    setStatsError(null);
    
    try {
      // Get total families with timeout
      const familiesPromise = supabase
        .from('families')
        .select('*', { count: 'exact', head: true });

      // Get total users
      const usersPromise = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get parents count
      const parentsPromise = supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'parent');

      // Get children count
      const childrenPromise = supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'child');

      // Get recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentSignupsPromise = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      // Execute all queries in parallel with timeout
      const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 10000)
      );

      const [families, users, parents, children, recentSignups] = await Promise.race([
        Promise.all([familiesPromise, usersPromise, parentsPromise, childrenPromise, recentSignupsPromise]),
        timeout.then(() => { throw new Error('timeout'); })
      ]) as Awaited<typeof familiesPromise>[];

      setStats({
        totalFamilies: families.count || 0,
        totalUsers: users.count || 0,
        totalParents: parents.count || 0,
        totalChildren: children.count || 0,
        recentSignups: recentSignups.count || 0,
      });
    } catch (error) {
      console.error('[AdminDashboard] Error fetching stats:', error);
      setStatsError('Unable to load dashboard statistics');
      // Keep showing previous stats or defaults - don't clear data
      if (stats.totalFamilies === 0 && stats.totalUsers === 0) {
        setStats(DEFAULT_STATS);
      }
    } finally {
      setLoading('adminDashboard', false);
    }
  }, [setLoading, stats.totalFamilies, stats.totalUsers]);

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

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {!isHydrated ? 'Restoring session...' : 'Loading dashboard...'}
          </p>
        </div>
      </div>
    );
  }

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

      {/* Stats Error Alert */}
      {statsError && (
        <Alert variant="destructive" className="bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Data Loading Issue</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{statsError}</span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fetchDashboardStats}
              disabled={dashboardLoading}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${dashboardLoading ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Analytics Charts Section - Lazy loaded with error boundaries */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardErrorBoundary componentName="Engagement Chart">
          <LazyEngagementChart data={dailyAnalytics} loading={analyticsLoading} />
        </DashboardErrorBoundary>
        <DashboardErrorBoundary componentName="Retention Chart">
          <LazyRetentionChart data={retentionData} loading={analyticsLoading} />
        </DashboardErrorBoundary>
      </div>

      {/* System Health, Settings, API Integrations, and Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardErrorBoundary 
          componentName="System Health"
          fallbackComponent={
            <FallbackCard 
              title="System Health" 
              description="Health metrics temporarily unavailable"
              onRetry={fetchSystemMetrics}
            />
          }
        >
          <SystemHealthWidget data={systemMetrics?.length ? systemMetrics : DEFAULT_SYSTEM_HEALTH} loading={!sessionReady} />
        </DashboardErrorBoundary>
        <DashboardErrorBoundary componentName="Site Settings">
          <AdminSiteSettings />
        </DashboardErrorBoundary>
      </div>

      {/* API Integrations and Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardErrorBoundary componentName="API Integrations">
          <AdminAPIIntegrations />
        </DashboardErrorBoundary>
        
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

      {/* Enhanced Security Dashboard with Error Boundary */}
      <DashboardErrorBoundary 
        componentName="Security Dashboard"
        fallbackComponent={
          <FallbackCard 
            title="Security Dashboard" 
            description="Security metrics temporarily unavailable"
          />
        }
      >
        <EnhancedSecurityDashboard />
      </DashboardErrorBoundary>

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