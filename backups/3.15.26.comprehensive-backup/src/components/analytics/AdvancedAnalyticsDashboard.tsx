import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  RefreshCw,
  Calendar,
  Download
} from 'lucide-react';
import { useAnalyticsWithSession } from '@/hooks/useAnalyticsWithSession';
import { AnalyticsKPICard } from './AnalyticsKPICard';
import { LazyEngagementChart, LazyRetentionChart, LazyFamilyGrowthChart } from './lazy';
import { SystemHealthMonitor } from './SystemHealthMonitor';
import { supabase } from '@/integrations/supabase/client';
import { cError } from '@/utils/wideLogger';

interface FamilyGrowthData {
  date: string;
  new_families: number;
  cumulative_families: number;
  avg_family_size: number;
  active_families: number;
}

export const AdvancedAnalyticsDashboard = () => {
  const analytics = useAnalyticsWithSession();
  const [timeRange, setTimeRange] = useState('30');
  const [familyGrowthData, setFamilyGrowthData] = useState<FamilyGrowthData[]>([]);
  const [loadingFamilyData, setLoadingFamilyData] = useState(true);

  const fetchFamilyGrowthData = useCallback(async () => {
    try {
      setLoadingFamilyData(true);
      const { data, error } = await supabase.rpc('get_family_growth_metrics', { 
        days_back: parseInt(timeRange) 
      });
      if (error) {
        throw error;
      }
      
      const transformedData = (data || []).map(item => ({
        ...item,
        date: item.date.toString()
      }));
      
      setFamilyGrowthData(transformedData);
    } catch (error) {
      cError('Error fetching family growth data:', error);
    } finally {
      setLoadingFamilyData(false);
    }
  }, [timeRange]);

  useEffect(() => {
    if (analytics.sessionReady && analytics.isAdmin) {
      fetchFamilyGrowthData();
    }
  }, [analytics.sessionReady, analytics.isAdmin, fetchFamilyGrowthData]);

  const refreshAllData = async () => {
    await Promise.all([
      analytics.refreshAnalytics(),
      fetchFamilyGrowthData()
    ]);
  };

  if (!analytics.sessionReady || !analytics.isAdmin) {
    return (
      <Card className="bg-gradient-card border-border shadow-soft">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Advanced Analytics
          </h2>
          <p className="text-muted-foreground">
            Comprehensive insights into system performance and user engagement
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={refreshAllData}
            disabled={analytics.loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${analytics.loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {analytics.engagementMetrics.slice(0, 4).map((metric, index) => {
          const icons = [TrendingUp, Users, Activity, BarChart3];
          return (
            <AnalyticsKPICard
              key={metric.metric}
              title={metric.metric}
              value={metric.current_value}
              change={metric.change_percentage}
              trend={metric.trend as 'up' | 'down' | 'stable'}
              icon={icons[index] || Activity}
              loading={analytics.loading}
            />
          );
        })}
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="engagement" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="engagement" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="families" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Family Growth
          </TabsTrigger>
          <TabsTrigger value="retention" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Retention
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            System Health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <LazyEngagementChart 
              data={analytics.dailyAnalytics} 
              loading={analytics.loading} 
            />
            <Card className="bg-gradient-card border-border shadow-soft">
              <CardHeader>
                <CardTitle className="text-foreground">Engagement Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.engagementMetrics.map((metric) => (
                    <div key={metric.metric} className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                      <div>
                        <p className="font-medium text-foreground">{metric.metric}</p>
                        <p className="text-sm text-muted-foreground">
                          Current: {metric.current_value.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          metric.trend === 'up' ? 'text-green-600' : 
                          metric.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {metric.change_percentage > 0 ? '+' : ''}{metric.change_percentage}%
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{metric.trend}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="families" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <LazyFamilyGrowthChart 
                data={familyGrowthData} 
                loading={loadingFamilyData} 
              />
            </div>
            <Card className="bg-gradient-card border-border shadow-soft">
              <CardHeader>
                <CardTitle className="text-foreground">Family Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {familyGrowthData.length > 0 && (
                    <>
                      <div className="text-center p-4 rounded-lg bg-card/50">
                        <div className="text-2xl font-bold text-foreground">
                          {familyGrowthData[familyGrowthData.length - 1]?.avg_family_size || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Average Family Size</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-card/50">
                        <div className="text-2xl font-bold text-foreground">
                          {familyGrowthData.reduce((sum, day) => sum + day.new_families, 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">New Families ({timeRange} days)</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-card/50">
                        <div className="text-2xl font-bold text-foreground">
                          {Math.round(familyGrowthData.reduce((sum, day) => sum + day.active_families, 0) / familyGrowthData.length)}
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Active Families/Day</div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="retention" className="space-y-6">
          <LazyRetentionChart 
            data={analytics.retentionData} 
            loading={analytics.loading} 
          />
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SystemHealthMonitor />
            <Card className="bg-gradient-card border-border shadow-soft">
              <CardHeader>
                <CardTitle className="text-foreground">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                    <div>
                      <p className="font-medium text-foreground">Response Time</p>
                      <p className="text-sm text-muted-foreground">Average API response time</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">~150ms</p>
                      <p className="text-xs text-green-600">Excellent</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                    <div>
                      <p className="font-medium text-foreground">Uptime</p>
                      <p className="text-sm text-muted-foreground">System availability</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">99.9%</p>
                      <p className="text-xs text-green-600">Excellent</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                    <div>
                      <p className="font-medium text-foreground">Cache Hit Rate</p>
                      <p className="text-sm text-muted-foreground">Data caching efficiency</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">85%</p>
                      <p className="text-xs text-green-600">Good</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};