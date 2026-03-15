/**
 * SkillPlanReports - Progress reporting for skill plans
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Clock, TrendingUp, CheckCircle } from 'lucide-react';
import { useActivitySession } from '@/hooks/useActivitySession';
import { getDomainInfo } from '@/types/skillPlan';
import type { SessionLog } from '@/types/skillPlan';

interface SkillPlanReportsProps {
  childId: string;
}

export function SkillPlanReports({ childId }: SkillPlanReportsProps) {
  const { fetchSessions } = useActivitySession();
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchSessions(childId);
    setSessions(data);
    setIsLoading(false);
  }, [childId, fetchSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Calculate stats
  const completedSessions = sessions.filter(s => s.completion_status === 'completed');
  const totalTime = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
  const avgTime = completedSessions.length > 0
    ? Math.round(totalTime / completedSessions.length / 60)
    : 0;

  // Domain breakdown
  const domainStats: Record<string, { completed: number; total: number }> = {};
  sessions.forEach(s => {
    const domain = s.life_skill_catalog?.skill_domain || 'unknown';
    if (!domainStats[domain]) domainStats[domain] = { completed: 0, total: 0 };
    domainStats[domain].total++;
    if (s.completion_status === 'completed') domainStats[domain].completed++;
  });

  if (isLoading) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Loading reports...</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<CheckCircle className="h-5 w-5 text-secondary" />} label="Completed" value={completedSessions.length} />
        <StatCard icon={<Clock className="h-5 w-5 text-primary" />} label="Avg Time" value={`${avgTime}m`} />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-accent" />} label="Total Sessions" value={sessions.length} />
        <StatCard icon={<BarChart3 className="h-5 w-5 text-primary" />} label="Total Time" value={`${Math.round(totalTime / 60)}m`} />
      </div>

      {/* Domain Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skill Domain Progress</CardTitle>
          <CardDescription>Completion rates across autism skill areas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(domainStats).map(([domain, stats]) => {
            const info = getDomainInfo(domain);
            const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
            return (
              <div key={domain} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <Badge variant="outline" className={info.color}>{info.label}</Badge>
                  <span className="text-muted-foreground">{stats.completed}/{stats.total} ({pct}%)</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
          {Object.keys(domainStats).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No session data yet. Start some activities!</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sessions.slice(0, 10).map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={
                    s.completion_status === 'completed' ? 'bg-green-100 text-green-800' :
                    s.completion_status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-muted text-muted-foreground'
                  }>
                    {s.completion_status}
                  </Badge>
                  <span>{s.life_skill_catalog?.title || 'Activity'}</span>
                </div>
                <span className="text-muted-foreground">
                  {Math.round((s.duration_seconds || 0) / 60)}m
                </span>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No sessions recorded yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        {icon}
        <div>
          <p className="text-lg font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default SkillPlanReports;
