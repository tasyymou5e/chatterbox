/**
 * TestResultsDashboard Component
 * 
 * @description Main container for real-time E2E test results with Playwright import
 */

import { useTestResultsStore } from '@/stores/testResultsStore';
import { ResultsImportPanel } from './ResultsImportPanel';
import { TestRunSummaryCards } from './TestRunSummaryCards';
import { TestResultsTable } from './TestResultsTable';
import { PassFailChart } from './PassFailChart';
import { FailedTestsDetail } from './FailedTestsDetail';
import { RunHistorySelector } from './RunHistorySelector';
import { Card, CardContent } from '@/components/ui/card';
import { FileJson } from 'lucide-react';

export function TestResultsDashboard() {
  const {
    currentRun,
    runHistory,
    isLoading,
    error,
    importResults,
    selectHistoricalRun,
    deleteHistoricalRun,
    clearAllHistory,
  } = useTestResultsStore();

  const lastImport = currentRun
    ? { fileName: currentRun.fileName, timestamp: currentRun.importedAt }
    : undefined;

  return (
    <div className="space-y-6">
      {/* Import Panel */}
      <ResultsImportPanel
        onImport={importResults}
        isLoading={isLoading}
        lastImport={lastImport}
        error={error}
      />

      {/* Results Display */}
      {currentRun ? (
        <>
          {/* Summary Cards */}
          <TestRunSummaryCards stats={currentRun.stats} />

          {/* Charts */}
          <PassFailChart 
            stats={currentRun.stats} 
            suiteResults={currentRun.suiteResults} 
          />

          {/* Results Table */}
          <TestResultsTable results={currentRun.suiteResults} />

          {/* Failed Tests Details */}
          {currentRun.failedTests.length > 0 && (
            <FailedTestsDetail tests={currentRun.failedTests} />
          )}
        </>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileJson className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Results Imported</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Import a Playwright JSON report to view test coverage metrics, 
              pass/fail status, and detailed error information.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Run History */}
      <RunHistorySelector
        history={runHistory}
        currentRunId={currentRun?.id}
        onSelectRun={selectHistoricalRun}
        onDeleteRun={deleteHistoricalRun}
        onClearAll={clearAllHistory}
      />
    </div>
  );
}
