/**
 * SkillPlanReports - Progress reporting for skill plans
 * Includes game scores, accuracy per skill domain, and time-series charts
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3, Clock, TrendingUp, CheckCircle, Gamepad2, Target,
  Star, CalendarDays,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  BarChart, Bar, CartesianGrid,
} from 'recharts';
import { useActivitySession } from '@/hooks/useActivitySession';
import { getDomainInfo, SKILL_DOMAINS } from '@/types/skillPlan';
import type { SessionLog } from '@/types/skillPlan';
import { format, subDays, startOfDay, isAfter } from 'date-fns';

interface SkillPlanReportsProps {
  childId: string;
}

// Domain color map for chart lines
const DOMAIN_CHART_COLORS: Record<string, string> = {
  communication: 'hsl(217, 91%, 60%)',
  social: 'hsl(271, 91%, 65%)',
  sensory: 'hsl(45, 93%, 47%)',
  executive_function: 'hsl(239, 84%, 67%)',
  daily_living: 'hsl(142, 76%, 36%)',
  emotional_regulation: 'hsl(330, 81%, 60%)',
  motor_skills: 'hsl(25, 95%, 53%)',
  academic: 'hsl(174, 72%, 40%)',
};

export function SkillPlanReports({ childId }: SkillPlanReportsProps) {
  const { fetchSessions } = useActivitySession();
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(14);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchSessions(childId);
    setSessions(data);
    setIsLoading(false);
  }, [childId, fetchSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Filter by time range
  const cutoff = useMemo(() => startOfDay(subDays(new Date(), timeRange)), [timeRange]);
  const filteredSessions = useMemo(
    () => sessions.filter(s => isAfter(new Date(s.started_at), cutoff)),
    [sessions, cutoff]
  );

  // Game sessions only (have a score)
  const gameSessions = useMemo(
    () => filteredSessions.filter(s => s.score !== null && s.life_skill_catalog?.item_type === 'game'),
    [filteredSessions]
  );

  // All completed
  const completedSessions = filteredSessions.filter(s => s.completion_status === 'completed');
  const totalTime = filteredSessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
  const avgTime = completedSessions.length > 0
    ? Math.round(totalTime / completedSessions.length / 60)
    : 0;

  // Domain breakdown with scoring
  const domainStats = useMemo(() => {
    const stats: Record<string, {
      completed: number;
      total: number;
      gameScores: number[];
      totalDuration: number;
    }> = {};

    filteredSessions.forEach(s => {
      const domain = s.life_skill_catalog?.skill_domain || 'unknown';
      if (!stats[domain]) stats[domain] = { completed: 0, total: 0, gameScores: [], totalDuration: 0 };
      stats[domain].total++;
      stats[domain].totalDuration += s.duration_seconds || 0;
      if (s.completion_status === 'completed') stats[domain].completed++;
      if (s.score !== null) stats[domain].gameScores.push(s.score);
    });

    return stats;
  }, [filteredSessions]);

  // Time-series data: daily scores per domain
  const timeSeriesData = useMemo(() => {
    const dayMap: Record<string, Record<string, number[]>> = {};

    // Initialize days
    for (let i = 0; i < timeRange; i++) {
      const day = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dayMap[day] = {};
    }

    gameSessions.forEach(s => {
      const day = format(new Date(s.started_at), 'yyyy-MM-dd');
      const domain = s.life_skill_catalog?.skill_domain || 'unknown';
      if (!dayMap[day]) dayMap[day] = {};
      if (!dayMap[day][domain]) dayMap[day][domain] = [];
      dayMap[day][domain].push(s.score!);
    });

    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, domains]) => {
        const point: Record<string, string | number | null> = {
          date: format(new Date(day), 'MMM d'),
        };
        SKILL_DOMAINS.forEach(d => {
          const scores = domains[d.value];
          point[d.value] = scores && scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null;
        });
        return point;
      });
  }, [gameSessions, timeRange]);

  // Domain accuracy bar chart data
  const domainAccuracyData = useMemo(() => {
    return Object.entries(domainStats)
      .filter(([, s]) => s.gameScores.length > 0)
      .map(([domain, s]) => {
        const info = getDomainInfo(domain);
        const avg = Math.round(s.gameScores.reduce((a, b) => a + b, 0) / s.gameScores.length);
        return {
          domain: info.label,
          accuracy: avg,
          sessions: s.gameScores.length,
          fill: DOMAIN_CHART_COLORS[domain] || 'hsl(var(--primary))',
        };
      })
      .sort((a, b) => b.accuracy - a.accuracy);
  }, [domainStats]);

  // Active domains in chart
  const activeDomains = useMemo(() => {
    const active = new Set<string>();
    gameSessions.forEach(s => {
      const d = s.life_skill_catalog?.skill_domain;
      if (d) active.add(d);
    });
    return SKILL_DOMAINS.filter(d => active.has(d.value));
  }, [gameSessions]);

  // Overall game accuracy
  const overallAccuracy = gameSessions.length > 0
    ? Math.round(gameSessions.reduce((a, s) => a + (s.score || 0), 0) / gameSessions.length)
    : 0;

  if (isLoading) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Loading reports...</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Time Range Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Skill Progress Report
        </h3>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {([7, 14, 30] as const).map(d => (
            <button
              key={d}
              onClick={() => setTimeRange(d)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === d
                  ? 'bg-background text-foreground shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<CheckCircle className="h-5 w-5 text-green-600" />} label="Completed" value={completedSessions.length} />
        <StatCard icon={<Gamepad2 className="h-5 w-5 text-purple-600" />} label="Games Played" value={gameSessions.length} />
        <StatCard icon={<Target className="h-5 w-5 text-blue-600" />} label="Avg Accuracy" value={gameSessions.length > 0 ? `${overallAccuracy}%` : '—'} />
        <StatCard icon={<Clock className="h-5 w-5 text-primary" />} label="Avg Time" value={`${avgTime}m`} />
        <StatCard icon={<Star className="h-5 w-5 text-yellow-500" />} label="Total Time" value={`${Math.round(totalTime / 60)}m`} />
      </div>

      <Tabs defaultValue="scores" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scores">Game Scores</TabsTrigger>
          <TabsTrigger value="domains">By Domain</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        {/* ── Game Scores Over Time ── */}
        <TabsContent value="scores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Game Accuracy Over Time
              </CardTitle>
              <CardDescription>
                Average score per skill domain ({timeRange}-day view)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gameSessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Gamepad2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No game sessions in this period.</p>
                  <p className="text-sm">Play some SkillQuest games to see scores here!</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                      formatter={(value) => value != null ? [`${value}%`, ''] : ['—', '']}
                    />
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                      formatter={(value: number | null) => value !== null ? [`${value}%`, ''] : ['—', '']}
                    />
                    <Legend />
                    {activeDomains.map(d => (
                      <Line
                        key={d.value}
                        type="monotone"
                        dataKey={d.value}
                        name={d.label}
                        stroke={DOMAIN_CHART_COLORS[d.value]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Domain Accuracy Bar Chart */}
          {domainAccuracyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Accuracy by Domain
                </CardTitle>
                <CardDescription>
                  Average game score across skill domains
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, domainAccuracyData.length * 50)}>
                  <BarChart
                    data={domainAccuracyData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, bottom: 5, left: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="domain"
                      width={90}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, _name: string, props: { payload: { sessions: number } }) => [
                        `${value}% (${props.payload.sessions} games)`,
                        'Accuracy',
                      ]}
                    />
                    <Bar dataKey="accuracy" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Domain Progress ── */}
        <TabsContent value="domains" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skill Domain Progress</CardTitle>
              <CardDescription>Completion rates and game scores across autism skill areas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {Object.entries(domainStats).map(([domain, stats]) => {
                const info = getDomainInfo(domain);
                const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                const avgScore = stats.gameScores.length > 0
                  ? Math.round(stats.gameScores.reduce((a, b) => a + b, 0) / stats.gameScores.length)
                  : null;
                return (
                  <div key={domain} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="outline" className={info.color}>{info.label}</Badge>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{stats.completed}/{stats.total} done ({pct}%)</span>
                        {avgScore !== null && (
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <Target className="h-3 w-3" /> {avgScore}%
                          </span>
                        )}
                        <span className="text-xs">{Math.round(stats.totalDuration / 60)}m</span>
                      </div>
                    </div>
                    <Progress value={pct} className="h-2" />
                    {stats.gameScores.length > 0 && (
                      <div className="flex gap-1 ml-1">
                        {stats.gameScores.slice(-10).map((sc, i) => (
                          <div
                            key={i}
                            className={`w-2 h-6 rounded-sm ${
                              sc >= 80 ? 'bg-green-400' : sc >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                            }`}
                            style={{ height: `${Math.max(8, sc * 0.24)}px` }}
                            title={`${sc}%`}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1 self-end">
                          last {Math.min(stats.gameScores.length, 10)} games
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              {Object.keys(domainStats).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No session data yet. Start some activities!</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Recent Sessions ── */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredSessions.slice(0, 20).map(s => {
                  const info = getDomainInfo(s.life_skill_catalog?.skill_domain || '');
                  const isGame = s.life_skill_catalog?.item_type === 'game';
                  return (
                    <div key={s.id} className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge variant="outline" className={
                          s.completion_status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          s.completion_status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-muted text-muted-foreground'
                        }>
                          {s.completion_status}
                        </Badge>
                        {isGame && <Gamepad2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />}
                        <span className="truncate">{s.life_skill_catalog?.title || 'Activity'}</span>
                        <Badge variant="outline" className={`text-xs ${info.color}`}>{info.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        {s.score !== null && (
                          <span className={`font-semibold text-xs px-1.5 py-0.5 rounded ${
                            s.score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : s.score >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {s.score}%
                          </span>
                        )}
                        <span className="text-muted-foreground text-xs">
                          {Math.round((s.duration_seconds || 0) / 60)}m
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {format(new Date(s.started_at), 'MMM d')}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {filteredSessions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No sessions in this period.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
