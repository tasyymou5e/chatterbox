/**
 * Playwright Results Parser
 * 
 * @description Parses Playwright JSON reporter output into dashboard-compatible format
 */

import type {
  PlaywrightJSONReport,
  PlaywrightSuiteResult,
  PlaywrightSpec,
  PlaywrightTestResult,
  ParsedTestRun,
  SuiteRunResult,
  FailedTestDetail,
  TestStatus,
} from '@/types/testCoverage';

/**
 * Maps test file names to suite IDs
 */
const FILE_TO_SUITE_MAP: Record<string, { id: string; name: string }> = {
  'signin-flow.spec.ts': { id: 'signin-flow', name: 'Sign-In Flow' },
  'child-signup-flow.spec.ts': { id: 'child-signup', name: 'Child Signup' },
  'parent-signup-flow.spec.ts': { id: 'parent-signup', name: 'Parent Signup' },
  'admin-auth.spec.ts': { id: 'admin-auth', name: 'Admin Auth' },
  'admin-login-flow.spec.ts': { id: 'admin-login', name: 'Admin Login Flow' },
  'auth.spec.ts': { id: 'general-auth', name: 'General Auth' },
  'auth-visual.spec.ts': { id: 'visual-regression', name: 'Visual Regression' },
};

/**
 * Validates Playwright JSON structure
 */
export function validatePlaywrightJSON(data: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return { valid: false, errors };
  }

  const report = data as Record<string, unknown>;

  if (!Array.isArray(report.suites)) {
    errors.push('Missing or invalid "suites" array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extracts file name from a file path
 */
function extractFileName(filePath: string): string {
  const parts = filePath.split('/');
  return parts[parts.length - 1] || filePath;
}

/**
 * Maps file name to suite info
 */
function mapFileToSuite(fileName: string): { id: string; name: string } {
  const baseName = extractFileName(fileName);
  return FILE_TO_SUITE_MAP[baseName] || { 
    id: baseName.replace('.spec.ts', '').replace('.test.ts', ''),
    name: baseName.replace('.spec.ts', '').replace('.test.ts', '').replace(/-/g, ' ')
  };
}

/**
 * Determines test status from result
 */
function getTestStatus(result: PlaywrightTestResult): 'passed' | 'failed' | 'skipped' {
  if (result.status === 'skipped') return 'skipped';
  if (result.ok || result.status === 'passed' || result.status === 'expected') return 'passed';
  return 'failed';
}

/**
 * Flattens nested suites into a flat list of specs
 */
function flattenSuites(
  suites: PlaywrightSuiteResult[],
  parentFile?: string
): { file: string; specs: PlaywrightSpec[] }[] {
  const result: { file: string; specs: PlaywrightSpec[] }[] = [];

  for (const suite of suites) {
    const file = suite.file || parentFile || 'unknown';
    
    if (suite.specs && suite.specs.length > 0) {
      const existingEntry = result.find(r => r.file === file);
      if (existingEntry) {
        existingEntry.specs.push(...suite.specs);
      } else {
        result.push({ file, specs: [...suite.specs] });
      }
    }

    if (suite.suites && suite.suites.length > 0) {
      const nestedResults = flattenSuites(suite.suites, file);
      for (const nested of nestedResults) {
        const existingEntry = result.find(r => r.file === nested.file);
        if (existingEntry) {
          existingEntry.specs.push(...nested.specs);
        } else {
          result.push(nested);
        }
      }
    }
  }

  return result;
}

/**
 * Parses Playwright JSON report into dashboard format
 */
export function parsePlaywrightJSON(
  data: Record<string, unknown>,
  fileName: string
): ParsedTestRun {
  const report = data as unknown as PlaywrightJSONReport;
  const runId = crypto.randomUUID();
  const importedAt = new Date().toISOString();

  // Flatten all suites
  const flatSuites = flattenSuites(report.suites);

  // Aggregate stats
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalDuration = 0;

  const suiteResults: SuiteRunResult[] = [];
  const failedTests: FailedTestDetail[] = [];
  let testCounter = 0;

  for (const { file, specs } of flatSuites) {
    const suiteInfo = mapFileToSuite(file);
    let suitePassed = 0;
    let suiteFailed = 0;
    let suiteSkipped = 0;
    let suiteDuration = 0;
    let suiteTotal = 0;

    for (const spec of specs) {
      for (const test of spec.tests) {
        testCounter++;
        suiteTotal++;
        totalTests++;
        suiteDuration += test.duration || 0;
        totalDuration += test.duration || 0;

        const status = getTestStatus(test);

        if (status === 'passed') {
          suitePassed++;
          totalPassed++;
        } else if (status === 'failed') {
          suiteFailed++;
          totalFailed++;

          // Collect failed test details
          const errorMessage = test.errors?.[0]?.message || 'Unknown error';
          const stackTrace = test.errors?.[0]?.stack;

          failedTests.push({
            testId: `${suiteInfo.id}-${testCounter}`,
            title: test.title,
            fullTitle: `${spec.title} > ${test.title}`,
            file,
            line: spec.line || 0,
            duration: test.duration || 0,
            error: errorMessage,
            stack: stackTrace,
            retries: test.retry || 0,
          });
        } else {
          suiteSkipped++;
          totalSkipped++;
        }
      }
    }

    if (suiteTotal > 0) {
      const suiteStatus: TestStatus = 
        suiteFailed > 0 ? 'failed' : 
        suiteSkipped === suiteTotal ? 'skipped' : 'passed';

      suiteResults.push({
        suiteId: suiteInfo.id,
        suiteName: suiteInfo.name,
        fileName: extractFileName(file),
        total: suiteTotal,
        passed: suitePassed,
        failed: suiteFailed,
        skipped: suiteSkipped,
        duration: suiteDuration,
        status: suiteStatus,
      });
    }
  }

  // Use stats from report if available
  const stats = report.stats;

  return {
    id: runId,
    importedAt,
    fileName,
    stats: {
      total: stats?.expected !== undefined ? (stats.expected + (stats.unexpected || 0) + (stats.skipped || 0)) : totalTests,
      passed: totalPassed,
      failed: stats?.unexpected ?? totalFailed,
      skipped: stats?.skipped ?? totalSkipped,
      flaky: stats?.flaky ?? 0,
      duration: stats?.duration ?? totalDuration,
    },
    suiteResults,
    failedTests,
  };
}

/**
 * Formats duration in milliseconds to human readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
