/**
 * Test Coverage Types
 * 
 * @description Type definitions for E2E test coverage tracking and reporting
 */

export type TestStatus = 'passed' | 'failed' | 'pending' | 'running' | 'skipped';
export type CoveragePriority = 'high' | 'medium' | 'low';
export type CoverageStatus = 'covered' | 'partial' | 'not-covered';

export interface TestCategory {
  name: string;
  tests: number;
  description: string;
}

export interface TestSuite {
  id: string;
  name: string;
  fileName: string;
  testCount: number;
  categories: TestCategory[];
  status: TestStatus;
  lastRun?: string;
  duration?: number;
  passedCount?: number;
  failedCount?: number;
}

export interface ComponentCoverage {
  componentName: string;
  componentPath: string;
  testFiles: string[];
  testCount: number;
  coverageStatus: CoverageStatus;
  categories: string[];
}

export interface HookCoverage {
  hookName: string;
  hookPath: string;
  hasUnitTests: boolean;
  hasE2ECoverage: boolean;
  testFiles: string[];
  description: string;
}

export interface StoreCoverage {
  storeName: string;
  storePath: string;
  hasUnitTests: boolean;
  hasE2ECoverage: boolean;
  testFiles: string[];
  description: string;
}

export interface EdgeFunctionCoverage {
  functionName: string;
  testMethod: 'direct' | 'mocked' | 'indirect' | 'not-tested';
  testFiles: string[];
  scenarios: string[];
}

export interface CoverageGap {
  id: string;
  title: string;
  description: string;
  priority: CoveragePriority;
  category: 'e2e' | 'unit' | 'integration' | 'visual';
  recommendation: string;
  effort: 'low' | 'medium' | 'high';
}

export interface TestCoverageMetrics {
  totalTests: number;
  totalSuites: number;
  passRate: number;
  coverageByCategory: {
    category: string;
    tests: number;
    percentage: number;
  }[];
}

export interface TestCoverageReport {
  generatedAt: string;
  metrics: TestCoverageMetrics;
  suites: TestSuite[];
  componentCoverage: ComponentCoverage[];
  hookCoverage: HookCoverage[];
  storeCoverage: StoreCoverage[];
  edgeFunctionCoverage: EdgeFunctionCoverage[];
  gapAnalysis: CoverageGap[];
}

export interface TestRunResult {
  suiteId: string;
  suiteName: string;
  status: TestStatus;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  duration: number;
  timestamp: string;
  errors?: string[];
}

export interface TestRunSummary {
  runId: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  results: TestRunResult[];
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
}
