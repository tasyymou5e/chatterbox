/**
 * Type definitions for system logs and monitoring
 */

export interface PostgresLog {
  id: string;
  timestamp: number;
  identifier: string;
  event_message: string;
  error_severity: 'LOG' | 'INFO' | 'WARNING' | 'ERROR';
}

export interface AuthLog {
  id: string;
  timestamp: number;
  event_message: string;
  level: 'info' | 'warning' | 'error';
  status: number;
  path: string;
  msg: string;
  error: string | null;
}

export type DatabaseLog = PostgresLog | AuthLog;

export interface AuthDebugInfo {
  hasUser: boolean;
  hasSession: boolean;
  userId: string | undefined;
  userEmail: string | undefined;
  isAdmin: boolean;
  authUid: string | null;
  status?: string;
  error?: string;
}

export interface CircuitBreakerState {
  consecutiveFailures: number;
  lastFailureTime: number;
  isCircuitOpen: boolean;
  nextRetryTime: number;
  backoffMultiplier: number;
}

export interface CallFrequencyTracker {
  lastRefresh: number;
  refreshCount: number;
  windowStart: number;
}

// Type guards for database logs
export function isPostgresLog(log: DatabaseLog): log is PostgresLog {
  return 'error_severity' in log && 'identifier' in log;
}

export function isAuthLog(log: DatabaseLog): log is AuthLog {
  return 'level' in log && 'status' in log;
}
