import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ParentNavigation } from '@/components/parent/ParentNavigation';
import { ParentActivityLogsTable } from '@/components/reports/ParentActivityLogsTable';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';

interface FamilyStats {
  totalChildren: number;
  activeToday: number;
  totalActivities: number;
}

export default function ParentReports() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<FamilyStats>({
    totalChildren: 0,
    activeToday: 0,
    totalActivities: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user?.id) return;
    
    try {
      // Get families created by this parent
      const { data: families } = await supabase
        .from('families')
        .select('id')
        .eq('created_by', user.id);
      
      if (!families || families.length === 0) {
        setLoading(false);
        return;
      }

      const familyIds = families.map(f => f.id);

      // Get child count
      const { count: childCount } = await supabase
        .from('family_members')
        .select('*', { count: 'exact', head: true })
        .in('family_id', familyIds)
        .eq('role', 'child');

      // Get child user IDs for activity queries
      const { data: childMembers } = await supabase
        .from('family_members')
        .select('user_id')
        .in('family_id', familyIds)
        .eq('role', 'child');

      const childUserIds = childMembers?.map(m => m.user_id) || [];

      if (childUserIds.length === 0) {
        setStats({
          totalChildren: childCount || 0,
          activeToday: 0,
          totalActivities: 0,
        });
        setLoading(false);
        return;
      }

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get active children today
      const { data: todayActivity } = await supabase
        .from('user_activity_logs')
        .select('user_id')
        .in('user_id', childUserIds)
        .gte('created_at', today.toISOString());

      const activeToday = new Set(todayActivity?.map(a => a.user_id) || []).size;

      // Get total activities (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: totalActivities } = await supabase
        .from('user_activity_logs')
        .select('*', { count: 'exact', head: true })
        .in('user_id', childUserIds)
        .gte('created_at', thirtyDaysAgo.toISOString());

      setStats({
        totalChildren: childCount || 0,
        activeToday,
        totalActivities: totalActivities || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ParentNavigation />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Family Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your children's activity and progress
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Children
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '-' : stats.totalChildren}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Active Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '-' : stats.activeToday}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activities (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '-' : stats.totalActivities}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activity">Activity Logs</TabsTrigger>
            <TabsTrigger value="progress">Progress Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <ParentActivityLogsTable />
          </TabsContent>

          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>Progress Summary</CardTitle>
                <CardDescription>
                  Overview of your children's learning progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Progress tracking is coming soon!</p>
                  <p className="text-sm mt-2">
                    View detailed progress on each child's learning journey
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
