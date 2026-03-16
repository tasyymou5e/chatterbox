/**
 * DailyProgressReport - Per-child daily progress for parent portal
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Clock, SkipForward, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDomainInfo } from '@/types/skillPlan';
import type { SessionLog } from '@/types/skillPlan';

interface DailyProgressReportProps {
  childId: string;
  childName: string;
}

export function DailyProgressReport({ childId, childName }: DailyProgressReportProps) {
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-session-helper', {
        body: { action: 'get_sessions', child_id: childId, date: selectedDate },
      });
      if (error) throw error;
      setSessions(data?.sessions || []);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [childId, selectedDate]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const completed = sessions.filter(s => s.completion_status === 'completed');
  const paused = sessions.filter(s => s.completion_status === 'paused');
  const skipped = sessions.filter(s => s.completion_status === 'skipped');
  const totalTimeMinutes = Math.round(sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0) / 60);
  const completionRate = sessions.length > 0 ? Math.round((completed.length / sessions.length) * 100) : 0;

  // Last 7 days for date selector
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {childName}'s Daily Progress
            </CardTitle>
            <CardDescription>Activity completion and time tracking</CardDescription>
          </div>
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateOptions.map(date => (
                <SelectItem key={date} value={date}>
                  {date === new Date().toISOString().split('T')[0] ? 'Today' : new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-4">Loading...</p>
        ) : sessions.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No activities recorded for this day.</p>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg bg-secondary/10">
                <p className="text-lg font-bold text-foreground">{completed.length}</p>
                <p className="text-xs text-muted-foreground">Done</p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-100/50">
                <p className="text-lg font-bold text-foreground">{paused.length}</p>
                <p className="text-xs text-muted-foreground">Paused</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-foreground">{skipped.length}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <p className="text-lg font-bold text-foreground">{totalTimeMinutes}m</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>

            {/* Completion bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Completion Rate</span>
                <span>{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>

            {/* Session list */}
            <div className="space-y-2">
              {sessions.map(s => {
                const domain = getDomainInfo(s.life_skill_catalog?.skill_domain || '');
                const statusIcon = s.completion_status === 'completed' ? <CheckCircle className="h-3 w-3 text-secondary" /> :
                  s.completion_status === 'skipped' ? <SkipForward className="h-3 w-3 text-muted-foreground" /> :
                  <Clock className="h-3 w-3 text-yellow-600" />;
                return (
                  <div key={s.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30">
                    {statusIcon}
                    <span className="flex-1 truncate">{s.life_skill_catalog?.title || 'Activity'}</span>
                    <Badge variant="outline" className={`text-xs ${domain.color}`}>{domain.label}</Badge>
                    <span className="text-xs text-muted-foreground">{Math.round((s.duration_seconds || 0) / 60)}m</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default DailyProgressReport;
