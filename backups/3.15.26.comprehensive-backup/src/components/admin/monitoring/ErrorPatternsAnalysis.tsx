/**
 * ErrorPatternsAnalysis Component
 * 
 * @description Analyzes and displays patterns in system errors including
 * frequency by type, hotspots by component, and trend analysis.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  RefreshCw, 
  AlertTriangle, 
  Bug, 
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2
} from 'lucide-react';

interface ErrorPattern {
  error_type: string;
  component_name: string | null;
  error_count: number;
  first_seen: string;
  last_seen: string;
  severity: string;
}

interface ErrorTrend {
  period: string;
  count: number;
}

export const ErrorPatternsAnalysis = () => {
  const [patterns, setPatterns] = useState<ErrorPattern[]>([]);
  const [trends, setTrends] = useState<ErrorTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPatterns = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch error patterns grouped by type and component
      const { data: patternData, error: patternError } = await supabase
        .from('system_errors')
        .select('error_type, component_name, severity, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (patternError) throw patternError;

      // Aggregate patterns
      const patternMap = new Map<string, ErrorPattern>();
      patternData?.forEach(err => {
        const key = `${err.error_type}-${err.component_name || 'unknown'}`;
        const existing = patternMap.get(key);
        if (existing) {
          existing.error_count++;
          if (new Date(err.created_at) < new Date(existing.first_seen)) {
            existing.first_seen = err.created_at;
          }
          if (new Date(err.created_at) > new Date(existing.last_seen)) {
            existing.last_seen = err.created_at;
          }
        } else {
          patternMap.set(key, {
            error_type: err.error_type,
            component_name: err.component_name,
            error_count: 1,
            first_seen: err.created_at,
            last_seen: err.created_at,
            severity: err.severity
          });
        }
      });

      const sortedPatterns = Array.from(patternMap.values())
        .sort((a, b) => b.error_count - a.error_count)
        .slice(0, 10);

      setPatterns(sortedPatterns);

      // Calculate daily trends
      const trendMap = new Map<string, number>();
      patternData?.forEach(err => {
        const day = new Date(err.created_at).toLocaleDateString();
        trendMap.set(day, (trendMap.get(day) || 0) + 1);
      });

      const trendData = Array.from(trendMap.entries())
        .map(([period, count]) => ({ period, count }))
        .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime())
        .slice(-7);

      setTrends(trendData);

    } catch (err) {
      console.error('Error fetching patterns:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch error patterns');
      toast({
        title: 'Error',
        description: 'Failed to load error patterns',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  const getTrendIndicator = () => {
    if (trends.length < 2) return null;
    const recent = trends[trends.length - 1]?.count || 0;
    const previous = trends[trends.length - 2]?.count || 0;
    const diff = recent - previous;
    
    if (diff > 0) {
      return (
        <div className="flex items-center text-destructive">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span className="text-sm">+{diff} from yesterday</span>
        </div>
      );
    } else if (diff < 0) {
      return (
        <div className="flex items-center text-green-600">
          <TrendingDown className="h-4 w-4 mr-1" />
          <span className="text-sm">{diff} from yesterday</span>
        </div>
      );
    }
    return (
      <div className="flex items-center text-muted-foreground">
        <Minus className="h-4 w-4 mr-1" />
        <span className="text-sm">No change</span>
      </div>
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500/90 text-primary-foreground';
      case 'medium': return 'bg-yellow-500/90 text-primary-foreground';
      case 'low': return 'bg-blue-500/90 text-primary-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const maxCount = Math.max(...patterns.map(p => p.error_count), 1);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Error Patterns Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Error Patterns Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchPatterns} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trend Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Error Trends (7 Days)
              </CardTitle>
              <CardDescription>
                Daily error frequency over the past week
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getTrendIndicator()}
              <Button onClick={fetchPatterns} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {trends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No error data in the past 7 days
            </div>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {trends.map((trend, idx) => {
                const maxTrend = Math.max(...trends.map(t => t.count), 1);
                const height = (trend.count / maxTrend) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">{trend.count}</span>
                    <div 
                      className="w-full bg-primary/80 rounded-t transition-colors hover:bg-primary"
                      style={{ height: `${height}%`, minHeight: trend.count > 0 ? '4px' : '0' }}
                    />
                    <span className="text-xs text-muted-foreground truncate w-full text-center">
                      {new Date(trend.period).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Hotspots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Error Hotspots
          </CardTitle>
          <CardDescription>
            Most frequent error patterns by type and component
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patterns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No error patterns detected in the past 7 days
            </div>
          ) : (
            <div className="space-y-4">
              {patterns.map((pattern, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(pattern.severity)}>
                        {pattern.severity}
                      </Badge>
                      <span className="font-medium">{pattern.error_type}</span>
                      {pattern.component_name && (
                        <Badge variant="outline">{pattern.component_name}</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {pattern.error_count} occurrence{pattern.error_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Progress value={(pattern.error_count / maxCount) * 100} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>First: {new Date(pattern.first_seen).toLocaleString()}</span>
                    <span>Last: {new Date(pattern.last_seen).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
