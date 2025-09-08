import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProgressAnalyticsStore } from '@/stores/progressAnalyticsStore';
import { useAuthStore } from '@/stores/authStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, Award, Zap } from 'lucide-react';

interface FamilyProgressDashboardProps {
  familyId: string;
}

export const FamilyProgressDashboard: React.FC<FamilyProgressDashboardProps> = ({ familyId }) => {
  const { user } = useAuthStore();
  const {
    familyProgress,
    progressTrends,
    milestones,
    loading,
    error,
    fetchFamilyProgressSummary,
    calculateProgressTrends,
    fetchMilestones
  } = useProgressAnalyticsStore();

  useEffect(() => {
    if (familyId && user) {
      fetchFamilyProgressSummary(familyId);
      calculateProgressTrends(familyId);
      fetchMilestones(familyId);
    }
  }, [familyId, user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Error loading progress data: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {familyProgress && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{familyProgress.total_members}</div>
              <p className="text-xs text-muted-foreground">
                {familyProgress.active_members} active today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{familyProgress.total_points.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Family achievement</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Achievements</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{familyProgress.total_achievements}</div>
              <p className="text-xs text-muted-foreground">Unlocked this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Level</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{familyProgress.average_level.toFixed(1)}</div>
              <Progress value={(familyProgress.average_level / 10) * 100} className="h-1 mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trends">Progress Trends</TabsTrigger>
          <TabsTrigger value="leaderboard">Top Performers</TabsTrigger>
          <TabsTrigger value="milestones">Recent Milestones</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Family Progress Over Time</CardTitle>
              <CardDescription>Points and XP trends for the past 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="xp" stroke="hsl(var(--secondary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Family Leaderboard</CardTitle>
              <CardDescription>Top performers this week</CardDescription>
            </CardHeader>
            <CardContent>
              {familyProgress?.top_performers.length ? (
                <div className="space-y-4">
                  {familyProgress.top_performers.map((performer, index) => (
                    <div key={performer.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          #{index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{performer.name}</p>
                          <p className="text-sm text-muted-foreground">Level {performer.level}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{performer.points.toLocaleString()} pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No performance data available yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Milestones</CardTitle>
              <CardDescription>Latest achievements and progress markers</CardDescription>
            </CardHeader>
            <CardContent>
              {milestones.length ? (
                <div className="space-y-3">
                  {milestones.slice(0, 10).map((milestone) => (
                    <div key={milestone.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{milestone.milestone_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {milestone.milestone_type} • {new Date(milestone.achieved_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge>{milestone.milestone_value}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No recent milestones</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};