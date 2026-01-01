import { logger } from './logger';

interface QueryContext {
  component: string;
  operation: string;
  userId?: string;
  familyId?: string;
  table?: string;
  metadata?: Record<string, unknown>;
}

interface QueryResult {
  success: boolean;
  rowCount?: number;
  error?: Error | { message: string; code?: string; details?: string; hint?: string };
  duration?: number;
}

/**
 * Log Supabase query with full context for debugging
 */
export const logSupabaseQuery = (
  context: QueryContext, 
  result: QueryResult
) => {
  const logContext = {
    component: `ParentPortal.${context.component}`,
    action: context.operation,
    userId: context.userId,
    metadata: {
      table: context.table,
      familyId: context.familyId,
      rowCount: result.rowCount,
      duration: result.duration ? `${result.duration.toFixed(2)}ms` : undefined,
      ...context.metadata
    }
  };

  if (result.success) {
    logger.debug(`Query successful: ${context.operation}`, logContext);
  } else {
    const errorDetails = result.error instanceof Error 
      ? result.error 
      : new Error(result.error?.message || 'Unknown error');
    
    logger.error(
      `Query failed: ${context.operation}`,
      errorDetails,
      {
        ...logContext,
        metadata: {
          ...logContext.metadata,
          errorCode: (result.error as any)?.code,
          errorDetails: (result.error as any)?.details,
          errorHint: (result.error as any)?.hint
        }
      }
    );
  }
};

/**
 * Log data access issues (empty results that might indicate RLS problems)
 */
export const logDataAccessIssue = (
  component: string,
  issue: string,
  context: {
    userId?: string;
    familyId?: string;
    expectedData?: string;
    actualResult?: string;
    possibleCause?: string;
  }
) => {
  logger.warn(`Data access issue: ${issue}`, {
    component: `ParentPortal.${component}`,
    action: 'data_access_check',
    userId: context.userId,
    metadata: {
      familyId: context.familyId,
      expected: context.expectedData,
      actual: context.actualResult,
      possibleCause: context.possibleCause
    }
  });
};

/**
 * Log successful data fetch with summary
 */
export const logDataFetchSuccess = (
  component: string,
  summary: {
    familyCount?: number;
    memberCount?: number;
    recordCount?: number;
    userId?: string;
    duration?: number;
  }
) => {
  logger.info(`Data fetch completed`, {
    component: `ParentPortal.${component}`,
    action: 'data_fetch_complete',
    userId: summary.userId,
    metadata: {
      familyCount: summary.familyCount,
      memberCount: summary.memberCount,
      recordCount: summary.recordCount,
      duration: summary.duration ? `${summary.duration.toFixed(2)}ms` : undefined
    }
  });
};

/**
 * Create a query timer for measuring query duration
 */
export const createQueryTimer = () => {
  const startTime = performance.now();
  return {
    elapsed: () => performance.now() - startTime
  };
};
