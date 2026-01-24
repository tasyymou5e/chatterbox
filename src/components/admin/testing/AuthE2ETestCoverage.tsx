/**
 * AuthE2ETestCoverage Component
 * 
 * @description Main dashboard for authentication E2E test coverage
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TestTube2, 
  FileCheck,
  PieChart,
  BarChart3
} from 'lucide-react';
import { useAuthE2ECoverage } from '@/hooks/useAuthE2ECoverage';
import { TestSuiteSummaryCards } from './TestSuiteSummaryCards';
import { TestCoverageMatrix } from './TestCoverageMatrix';
import { RunTestsPanel } from './RunTestsPanel';
import { CoverageGapAnalysis } from './CoverageGapAnalysis';

export function AuthE2ETestCoverage() {
  const coverage = useAuthE2ECoverage();

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TestTube2 className="h-4 w-4" />
              Total Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{coverage.metrics.totalTests}</div>
            <p className="text-xs text-muted-foreground">Across all auth suites</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Test Suites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{coverage.metrics.totalSuites}</div>
            <p className="text-xs text-muted-foreground">E2E spec files</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Components
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{coverage.componentCoverage.length}</div>
            <p className="text-xs text-muted-foreground">With E2E coverage</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Coverage Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent-foreground">
              {coverage.gapAnalysis.length}
            </div>
            <p className="text-xs text-muted-foreground">Identified improvements</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Coverage by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {coverage.metrics.coverageByCategory.map((cat) => (
              <div 
                key={cat.category}
                className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg"
              >
                <span className="text-sm font-medium">{cat.category}</span>
                <Badge variant="secondary">{cat.tests}</Badge>
                <span className="text-xs text-muted-foreground">({cat.percentage}%)</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Suite Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Test Suites</h3>
        <TestSuiteSummaryCards suites={coverage.suites} />
      </div>

      {/* Coverage Matrix */}
      <TestCoverageMatrix
        componentCoverage={coverage.componentCoverage}
        hookCoverage={coverage.hookCoverage}
        storeCoverage={coverage.storeCoverage}
        edgeFunctionCoverage={coverage.edgeFunctionCoverage}
      />

      {/* Gap Analysis */}
      <CoverageGapAnalysis gaps={coverage.gapAnalysis} />

      {/* Run Tests Panel */}
      <RunTestsPanel suites={coverage.suites} />
    </div>
  );
}
