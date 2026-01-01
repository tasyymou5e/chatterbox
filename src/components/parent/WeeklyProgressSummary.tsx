import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Star, CheckCircle, Flame } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { logSupabaseQuery, logDataAccessIssue, logDataFetchSuccess, createQueryTimer } from '@/utils/parentPortalLogger';

interface WeeklyStats {
  pointsThisWeek: number;
  pointsLastWeek: number;
  choresThisWeek: number;
  choresLastWeek: number;
  activeChildrenThisWeek: number;
  currentStreak: number;
}

export function WeeklyProgressSummary() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWeeklyStats();
    }
  }, [user]);

  const fetchWeeklyStats = async () => {
    if (!user?.id) return;
    const timer = createQueryTimer();

    try {
      // Get families where this user is a parent member (not just creator)
      const { data: familyMemberships, error: familiesError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .eq('role', 'parent');

      logSupabaseQuery(
        { component: 'WeeklyProgress', operation: 'fetchFamilyMemberships', userId: user.id, table: 'family_members' },
        { success: !familiesError, error: familiesError || undefined, rowCount: familyMemberships?.length || 0 }
      );

      if (!familyMemberships || familyMemberships.length === 0) {
        logDataAccessIssue('WeeklyProgress', 'No family memberships found', {
          userId: user.id,
          expectedData: 'at least 1 family membership',
          actualResult: '0 memberships',
          possibleCause: 'User is not a parent in any family'
        });
        setLoading(false);
        return;
      }

      const familyIds = familyMemberships.map(fm => fm.family_id);

      // Get child members
      const { data: childMembers, error: membersError } = await supabase
        .from('family_members')
        .select('user_id')
        .in('family_id', familyIds)
        .eq('role', 'child');

      logSupabaseQuery(
        { component: 'WeeklyProgress', operation: 'fetchChildMembers', userId: user.id, table: 'family_members', metadata: { familyIds } },
        { success: !membersError, error: membersError || undefined, rowCount: childMembers?.length || 0 }
      );

      const childUserIds = childMembers?.map(m => m.user_id) || [];

      // Date ranges
      const now = new Date();
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - now.getDay());
      thisWeekStart.setHours(0, 0, 0, 0);

      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setMilliseconds(-1);

      // Get chore completions this week
      const { data: thisWeekCompletions, error: thisWeekError } = await supabase
        .from('chore_completions')
        .select('user_id, points_earned')
        .in('family_id', familyIds)
        .gte('completion_date', thisWeekStart.toISOString().split('T')[0]);

      logSupabaseQuery(
        { component: 'WeeklyProgress', operation: 'fetchThisWeekCompletions', userId: user.id, table: 'chore_completions' },
        { success: !thisWeekError, error: thisWeekError || undefined, rowCount: thisWeekCompletions?.length || 0 }
      );

      // Get chore completions last week
      const { data: lastWeekCompletions, error: lastWeekError } = await supabase
        .from('chore_completions')
        .select('user_id, points_earned')
        .in('family_id', familyIds)
        .gte('completion_date', lastWeekStart.toISOString().split('T')[0])
        .lt('completion_date', thisWeekStart.toISOString().split('T')[0]);

      logSupabaseQuery(
        { component: 'WeeklyProgress', operation: 'fetchLastWeekCompletions', userId: user.id, table: 'chore_completions' },
        { success: !lastWeekError, error: lastWeekError || undefined, rowCount: lastWeekCompletions?.length || 0 }
      );

      // Calculate stats
      const pointsThisWeek = thisWeekCompletions?.reduce((sum, c) => sum + (c.points_earned || 0), 0) || 0;
      const pointsLastWeek = lastWeekCompletions?.reduce((sum, c) => sum + (c.points_earned || 0), 0) || 0;
      const choresThisWeek = thisWeekCompletions?.length || 0;
      const choresLastWeek = lastWeekCompletions?.length || 0;
      const activeChildrenThisWeek = new Set(thisWeekCompletions?.map(c => c.user_id) || []).size;

      // Get longest current streak
      let currentStreak = 0;
      if (childUserIds.length > 0) {
        const { data: streaks, error: streaksError } = await supabase
          .from('daily_streaks')
          .select('current_streak')
          .in('user_id', childUserIds)
          .order('current_streak', { ascending: false })
          .limit(1);

        logSupabaseQuery(
          { component: 'WeeklyProgress', operation: 'fetchStreaks', userId: user.id, table: 'daily_streaks' },
          { success: !streaksError, error: streaksError || undefined, rowCount: streaks?.length || 0 }
        );

        currentStreak = streaks?.[0]?.current_streak || 0;
      }

      logDataFetchSuccess('WeeklyProgress', {
        familyCount: familyMemberships.length,
        memberCount: childMembers?.length || 0,
        recordCount: (thisWeekCompletions?.length || 0) + (lastWeekCompletions?.length || 0),
        userId: user.id,
        duration: timer.elapsed()
      });

      setStats({
        pointsThisWeek,
        pointsLastWeek,
        choresThisWeek,
        choresLastWeek,
        activeChildrenThisWeek,
        currentStreak,
      });
    } catch (error) {
      logSupabaseQuery(
        { component: 'WeeklyProgress', operation: 'fetchWeeklyStats', userId: user.id },
        { success: false, error: error as Error, duration: timer.elapsed() }
      );
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getPercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Weekly Progress
        </CardTitle>
        <CardDescription>
          Comparing this week to last week
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Points */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Star className="h-4 w-4" />
              Points Earned
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-foreground">
                {stats.pointsThisWeek}
              </span>
              <div className="flex items-center gap-1 text-sm">
                {getTrendIcon(stats.pointsThisWeek, stats.pointsLastWeek)}
                <span className="text-muted-foreground">
                  {getPercentChange(stats.pointsThisWeek, stats.pointsLastWeek)}
                </span>
              </div>
            </div>
          </div>

          {/* Chores */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <CheckCircle className="h-4 w-4" />
              Tasks Done
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-foreground">
                {stats.choresThisWeek}
              </span>
              <div className="flex items-center gap-1 text-sm">
                {getTrendIcon(stats.choresThisWeek, stats.choresLastWeek)}
                <span className="text-muted-foreground">
                  {getPercentChange(stats.choresThisWeek, stats.choresLastWeek)}
                </span>
              </div>
            </div>
          </div>

          {/* Active Children */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Active Children
            </div>
            <span className="text-xl font-bold text-foreground">
              {stats.activeChildrenThisWeek}
            </span>
          </div>

          {/* Streak */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
              Best Streak
            </div>
            <span className="text-xl font-bold text-foreground">
              {stats.currentStreak} days
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
