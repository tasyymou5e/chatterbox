import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, TestTube2, BarChart3, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ErrorLogAnalysis } from './ErrorLogAnalysis';
import { TestSuggestionsPanel } from './TestSuggestionsPanel';
import { invokeEdgeFunction } from '@/utils/secureEdgeFunctionInvoke';

interface TestResult {
  run_type: string;
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  results: Record<string, unknown>;
  created_at: string;
}

export const DiagnosticsPanel = () => {
  const { toast } = useToast();
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [vitestLoading, setVitestLoading] = useState(false);
  const [safetyResults, setSafetyResults] = useState<TestResult | null>(null);
  const [vitestResults, setVitestResults] = useState<TestResult | null>(null);
  const [recentRuns, setRecentRuns] = useState<TestResult[]>([]);
  const [errorComponents, setErrorComponents] = useState<string[]>([]);

  const storeTestResult = async (result: { run_type: string; total_tests: number; passed: number; failed: number; skipped?: number; duration_ms: number; results: Record<string, unknown> }) => {
    // Use RPC or raw insert via supabase - cast to bypass generated types not yet reflecting new table
    const { error } = await (supabase as unknown as { from: (table: string) => { insert: (data: Record<string, unknown>) => Promise<{ error: unknown }> } })
      .from('test_run_results')
      .insert({
        run_type: result.run_type,
        total_tests: result.total_tests,
        passed: result.passed,
        failed: result.failed,
        skipped: result.skipped || 0,
        duration_ms: result.duration_ms,
        results: result.results,
      });
    if (error) console.warn('Failed to store test result:', error);
  };

  const runSafetyChecks = async () => {
    setSafetyLoading(true);
    try {
      const { data, error } = await invokeEdgeFunction('security-testing', { action: 'run_all' });
      
      if (error) throw error;

      const result: TestResult = {
        run_type: 'security',
        total_tests: (data as Record<string, number>)?.totalTests || 0,
        passed: (data as Record<string, number>)?.passedTests || 0,
        failed: (data as Record<string, number>)?.failedTests || 0,
        skipped: 0,
        duration_ms: (data as Record<string, number>)?.durationMs || 0,
        results: (data as Record<string, unknown>) || {},
        created_at: new Date().toISOString(),
      };

      setSafetyResults(result);
      await storeTestResult(result);

      toast({
        title: 'Safety Checks Complete',
        description: `${result.passed}/${result.total_tests} passed`,
      });
    } catch (err: unknown) {
      toast({ title: 'Safety Check Failed', description: String(err), variant: 'destructive' });
    } finally {
      setSafetyLoading(false);
    }
  };

  const runVitestSuite = async () => {
    setVitestLoading(true);
    try {
      const { data, error } = await invokeEdgeFunction('run-vitest', { filter: '' });
      
      if (error) throw error;

      const result: TestResult = {
        run_type: 'vitest',
        total_tests: (data as Record<string, number>)?.totalTests || 0,
        passed: (data as Record<string, number>)?.passed || 0,
        failed: (data as Record<string, number>)?.failed || 0,
        skipped: (data as Record<string, number>)?.skipped || 0,
        duration_ms: (data as Record<string, number>)?.durationMs || 0,
        results: (data as Record<string, unknown>) || {},
        created_at: new Date().toISOString(),
      };

      setVitestResults(result);
      await storeTestResult(result);

      toast({
        title: 'Vitest Suite Complete',
        description: `${result.passed}/${result.total_tests} passed`,
      });
    } catch (err: unknown) {
      toast({ title: 'Vitest Run Failed', description: String(err), variant: 'destructive' });
    } finally {
      setVitestLoading(false);
    }
  };

  const loadRecentRuns = async () => {
    const { data } = await (supabase as unknown as { from: (table: string) => { select: (cols: string) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: TestResult[] | null }> } } } })
      .from('test_run_results')
      .select('run_type, total_tests, passed, failed, skipped, duration_ms, results, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setRecentRuns(data);

    // Load top error components for suggestions
    const { data: errors } = await supabase
      .from('system_errors')
      .select('component_name')
      .eq('resolved', false)
      .not('component_name', 'is', null)
      .limit(500);

    if (errors) {
      const counts = new Map<string, number>();
      for (const e of errors) {
        if (e.component_name) counts.set(e.component_name, (counts.get(e.component_name) || 0) + 1);
      }
      setErrorComponents(
        Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name)
      );
    }
  };

  useEffect(() => { loadRecentRuns(); }, []);

  const ResultCard = ({ label, result }: { label: string; result: TestResult | null }) => {
    if (!result) return null;
    const allPassed = result.failed === 0;
    return (
      <Card className="border-border">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-foreground">{label}</span>
            <Badge variant={allPassed ? 'default' : 'destructive'}>
              {allPassed ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
              {allPassed ? 'All Passed' : `${result.failed} Failed`}
            </Badge>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
            <div>Total: {result.total_tests}</div>
            <div className="text-primary">Passed: {result.passed}</div>
            <div className="text-destructive">Failed: {result.failed}</div>
            <div>Duration: {(result.duration_ms / 1000).toFixed(1)}s</div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Safety Checks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Run RLS, auth, and security validation tests</p>
            <Button onClick={runSafetyChecks} disabled={safetyLoading} size="sm" className="w-full">
              {safetyLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
              Run Safety Checks
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TestTube2 className="h-4 w-4 text-primary" />
              Vitest Suite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Execute validation checks and get CLI commands</p>
            <Button onClick={runVitestSuite} disabled={vitestLoading} size="sm" className="w-full">
              {vitestLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube2 className="h-4 w-4 mr-2" />}
              Run Vitest
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Error Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">View error groupings, trends, and backlog</p>
            <Button onClick={loadRecentRuns} size="sm" variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <ResultCard label="Safety Check Results" result={safetyResults} />
      <ResultCard label="Vitest Results" result={vitestResults} />

      {/* Sub-tabs */}
      <Tabs defaultValue="analysis">
        <TabsList>
          <TabsTrigger value="analysis">Error Analysis</TabsTrigger>
          <TabsTrigger value="suggestions">Test Suggestions</TabsTrigger>
          <TabsTrigger value="history">Run History</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis">
          <ErrorLogAnalysis />
        </TabsContent>

        <TabsContent value="suggestions">
          <TestSuggestionsPanel errorComponents={errorComponents} />
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-2">
            {recentRuns.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No test runs recorded yet</p>
            ) : (
              recentRuns.map((run, i) => (
                <Card key={i} className="border-border">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{run.run_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(run.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-primary">✓ {run.passed}</span>
                        <span className="text-destructive">✗ {run.failed}</span>
                        <span className="text-muted-foreground">{(run.duration_ms / 1000).toFixed(1)}s</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
