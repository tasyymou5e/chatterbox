import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Users, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ParentNavigation } from '@/components/parent/ParentNavigation';
import { ParentActivityLogsTable } from '@/components/reports/ParentActivityLogsTable';
import { ChildrenAchievementsPanel } from '@/components/parent/ChildrenAchievementsPanel';
import { ChildrenContentUsage } from '@/components/parent/ChildrenContentUsage';
import { ProgressReportExport } from '@/components/parent/ProgressReportExport';
import { DailyProgressReport } from '@/components/parent/DailyProgressReport';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { logSupabaseQuery, logDataAccessIssue, logDataFetchSuccess, createQueryTimer } from '@/utils/parentPortalLogger';

interface ChildMember {
  user_id: string;
  first_name?: string;
}

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
  const [childMembers, setChildMembers] = useState<ChildMember[]>([]);

  const fetchStats = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    const timer = createQueryTimer();
    
    try {
      // Get families where this user is a parent member (not just creator)
      const { data: familyMemberships, error: familiesError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .eq('role', 'parent');

      logSupabaseQuery(
        { component: 'Reports', operation: 'fetchFamilyMemberships', userId: user.id, table: 'family_members' },
        { success: !familiesError, error: familiesError || undefined, rowCount: familyMemberships?.length || 0 }
      );
      
      if (!familyMemberships || familyMemberships.length === 0) {
        logDataAccessIssue('Reports', 'No family memberships found', {
          userId: user.id,
          expectedData: 'at least 1 family membership',
          actualResult: '0 memberships',
          possibleCause: 'User is not a parent in any family'
        });
        setLoading(false);
        return;
      }

      const familyIds = familyMemberships.map(fm => fm.family_id);

      // Get child count
      const { count: childCount, error: countError } = await supabase
        .from('family_members')
        .select('*', { count: 'exact', head: true })
        .in('family_id', familyIds)
        .eq('role', 'child');

      logSupabaseQuery(
        { component: 'Reports', operation: 'fetchChildCount', userId: user.id, table: 'family_members' },
        { success: !countError, error: countError || undefined, rowCount: childCount || 0 }
      );

      // Get child user IDs for activity queries
      const { data: childMembers, error: membersError } = await supabase
        .from('family_members')
        .select('user_id')
        .in('family_id', familyIds)
        .eq('role', 'child');

      logSupabaseQuery(
        { component: 'Reports', operation: 'fetchChildMembers', userId: user.id, table: 'family_members', metadata: { familyIds } },
        { success: !membersError, error: membersError || undefined, rowCount: childMembers?.length || 0 }
      );

      const childUserIds = childMembers?.map(m => m.user_id) || [];

      // Store child members for Daily Progress tab
      if (childMembers && childMembers.length > 0) {
        // Fetch profile names for children
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name')
          .in('user_id', childUserIds);
        
        setChildMembers(profiles?.map(p => ({ user_id: p.user_id, first_name: p.first_name || undefined })) || []);
      }

      if (childUserIds.length === 0) {
        logDataAccessIssue('Reports', 'No child members found', {
          userId: user.id,
          expectedData: 'at least 1 child member',
          actualResult: '0 children',
          possibleCause: 'No children have been added to the family yet'
        });
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
      const { data: todayActivity, error: todayError } = await supabase
        .from('user_activity_logs')
        .select('user_id')
        .in('user_id', childUserIds)
        .gte('created_at', today.toISOString());

      logSupabaseQuery(
        { component: 'Reports', operation: 'fetchTodayActivity', userId: user.id, table: 'user_activity_logs' },
        { success: !todayError, error: todayError || undefined, rowCount: todayActivity?.length || 0 }
      );

      const activeToday = new Set(todayActivity?.map(a => a.user_id) || []).size;

      // Get total activities (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: totalActivities, error: activitiesError } = await supabase
        .from('user_activity_logs')
        .select('*', { count: 'exact', head: true })
        .in('user_id', childUserIds)
        .gte('created_at', thirtyDaysAgo.toISOString());

      logSupabaseQuery(
        { component: 'Reports', operation: 'fetchTotalActivities', userId: user.id, table: 'user_activity_logs' },
        { success: !activitiesError, error: activitiesError || undefined, rowCount: totalActivities || 0 }
      );

      logDataFetchSuccess('Reports', {
        familyCount: familyMemberships.length,
        memberCount: childMembers?.length || 0,
        recordCount: totalActivities || 0,
        userId: user.id,
        duration: timer.elapsed()
      });

      setStats({
        totalChildren: childCount || 0,
        activeToday,
        totalActivities: totalActivities || 0,
      });
    } catch (error) {
      logSupabaseQuery(
        { component: 'Reports', operation: 'fetchStats', userId: user.id },
        { success: false, error: error as Error, duration: timer.elapsed() }
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, fetchStats]);

  return (
    <div className="min-h-screen bg-background">
      <ParentNavigation />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Family Reports
              </h1>
              <p className="text-muted-foreground mt-1">
                Track your children's activity and progress
              </p>
            </div>
            <ProgressReportExport />
          </div>
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
            <TabsTrigger value="daily">Daily Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <ParentActivityLogsTable />
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <ChildrenAchievementsPanel />
            <ChildrenContentUsage />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
