import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorGroup {
  component_name: string | null;
  error_type: string;
  count: number;
  unresolved: number;
}

interface ErrorTrend {
  date: string;
  count: number;
}

export const ErrorLogAnalysis = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [groups, setGroups] = useState<ErrorGroup[]>([]);
  const [trends, setTrends] = useState<ErrorTrend[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const daysAgo = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : 30;
      const since = new Date(Date.now() - daysAgo * 86400000).toISOString();

      const { data: errors } = await supabase
        .from('system_errors')
        .select('component_name, error_type, resolved, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!errors) { setLoading(false); return; }

      // Group by component + error_type
      const groupMap = new Map<string, ErrorGroup>();
      const trendMap = new Map<string, number>();

      for (const err of errors) {
        const key = `${err.component_name || 'Unknown'}|${err.error_type}`;
        const existing = groupMap.get(key) || { component_name: err.component_name, error_type: err.error_type, count: 0, unresolved: 0 };
        existing.count++;
        if (!err.resolved) existing.unresolved++;
        groupMap.set(key, existing);

        const day = err.created_at.slice(0, 10);
        trendMap.set(day, (trendMap.get(day) || 0) + 1);
      }

      setGroups(Array.from(groupMap.values()).sort((a, b) => b.count - a.count).slice(0, 10));
      setTrends(Array.from(trendMap.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalysis(); }, [timeRange]);

  const barData = groups.map(g => ({
    name: (g.component_name || 'Unknown').slice(0, 20),
    errors: g.count,
    unresolved: g.unresolved,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Error Log Analysis</h3>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">24h</SelectItem>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchAnalysis} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Error Components</CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="errors" fill="hsl(var(--destructive))" name="Total" />
                  <Bar dataKey="unresolved" fill="hsl(var(--primary))" name="Unresolved" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm py-8 text-center">No errors in this period</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Error Frequency Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trends}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm py-8 text-center">No trend data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Unresolved backlog */}
      {groups.filter(g => g.unresolved > 0).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Unresolved Error Backlog
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {groups.filter(g => g.unresolved > 0).map((g, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{g.component_name || 'Unknown'} — {g.error_type}</span>
                  <Badge variant="destructive">{g.unresolved} unresolved</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
