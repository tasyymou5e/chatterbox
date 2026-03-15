/**
 * Unified structured logger following wide event / canonical log line principles.
 * 
 * Replaces: logger.ts, debugLogger.ts, conditionalLogger.ts, parentPortalLogger.ts, secureLogging.ts
 * 
 * Two levels: info and error.
 * All output is JSON-structured with environment context.
 * PII sanitization, rate limiting, and buffering for the Logs Triage dashboard.
 */

// ─── PII Sanitization ───────────────────────────────────────────────────────

const SENSITIVE_FIELDS = new Set([
  'password', 'token', 'accesstoken', 'refreshtoken', 'secret',
  'apikey', 'sessionid', 'email', 'phone', 'ssn', 'creditcard',
]);

const SENSITIVE_KEY_PATTERNS = [
  /password/i, /token/i, /secret/i, /key/i, /auth/i,
  /email/i, /session/i, /cookie/i, /ssn/i, /credit/i,
];

function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 10) return '[MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitize(item, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_FIELDS.has(lower) || SENSITIVE_KEY_PATTERNS.some(p => p.test(key))) {
      out[key] = '[REDACTED]';
    } else {
      out[key] = sanitize(value, depth + 1);
    }
  }
  return out;
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────

class RateLimiter {
  private count = 0;
  private windowStart = Date.now();
  constructor(private maxPerMinute = 60) {}

  allow(): boolean {
    const now = Date.now();
    if (now - this.windowStart > 60_000) {
      this.count = 0;
      this.windowStart = now;
    }
    if (this.count >= this.maxPerMinute) return false;
    this.count++;
    return true;
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WideEvent {
  [key: string]: unknown;
}

export interface LogEntry {
  level: 'info' | 'error';
  timestamp: string;
  event: WideEvent;
}

export interface WideEventBuilder {
  /** Merge additional context into the event */
  add(data: Record<string, unknown>): void;
  /** Emit the event. Call in a `finally` block. */
  emit(): void;
  /** Direct access to the underlying record */
  event: WideEvent;
}

// ─── Environment Context ────────────────────────────────────────────────────

function getEnvContext(): Record<string, unknown> {
  try {
    return {
      environment: import.meta.env.MODE,
      app_version: import.meta.env.VITE_APP_VERSION ?? 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };
  } catch {
    return { environment: 'unknown' };
  }
}

const ENV_CONTEXT = getEnvContext();

// ─── Logger ──────────────────────────────────────────────────────────────────

class WideLogger {
  private isDev = import.meta.env.DEV;
  private buffer: LogEntry[] = [];
  private maxBuffer = 1000;
  private rateLimiter = new RateLimiter(120);

  // ── Core Methods ────────────────────────────────────────────────────────

  info(event: WideEvent): void {
    if (!this.isDev) return; // info only in dev — production uses error-collector
    if (!this.rateLimiter.allow()) return;
    const entry = this.createEntry('info', event);
    this.addToBuffer(entry);
    console.info(JSON.stringify(entry.event));
  }

  error(event: WideEvent): void {
    if (!this.rateLimiter.allow()) return;
    const entry = this.createEntry('error', event);
    this.addToBuffer(entry);

    if (this.isDev) {
      console.error(JSON.stringify(entry.event));
    } else {
      // Production: sanitise and emit minimal
      console.error(JSON.stringify(sanitize(entry.event)));
    }
  }

  /**
   * Security events — always logged, and in production critical/high
   * are sent to the security-monitoring edge function.
   */
  async security(
    eventName: string,
    data?: unknown,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    const secEvent: WideEvent = {
      event_name: eventName,
      severity,
      security: true,
      data: sanitize(data),
      ...ENV_CONTEXT,
      timestamp: new Date().toISOString(),
    };

    if (this.isDev) {
      console.warn(JSON.stringify(secEvent));
    }

    const entry = this.createEntry('error', secEvent);
    this.addToBuffer(entry);

    if (!this.isDev && (severity === 'critical' || severity === 'high')) {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lxuqfgbukrrickanmmic.supabase.co';
        await fetch(`${supabaseUrl}/functions/v1/security-monitoring`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(secEvent),
        });
      } catch {
        // Silent fail — security logging should never break the app
      }
    }
  }

  // ── Wide Event Builder ──────────────────────────────────────────────────

  /**
   * Create a wide event that accumulates context, emitted in a `finally` block.
   *
   * ```ts
   * const we = logger.createWideEvent({ component: 'ParentDashboard', action: 'load' });
   * try {
   *   we.add({ families: families.length });
   *   // ...
   * } catch (e) {
   *   we.add({ outcome: 'error', error: { message: e.message } });
   *   throw e;
   * } finally {
   *   we.emit();
   * }
   * ```
   */
  createWideEvent(base: Record<string, unknown> = {}): WideEventBuilder {
    const event: WideEvent = {
      request_id: crypto.randomUUID(),
      start_time: Date.now(),
      ...base,
    };

    return {
      event,
      add: (data: Record<string, unknown>) => {
        Object.assign(event, data);
      },
      emit: () => {
        event.duration_ms = Date.now() - (event.start_time as number);
        delete event.start_time;
        if (!event.outcome) event.outcome = 'success';
        this.info(event);
      },
    };
  }

  // ── Buffer (for Logs Triage dashboard) ──────────────────────────────────

  getBuffer(level?: 'info' | 'error'): LogEntry[] {
    if (!level) return [...this.buffer];
    return this.buffer.filter(e => e.level === level);
  }

  clearBuffer(): void {
    this.buffer = [];
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private createEntry(level: 'info' | 'error', event: WideEvent): LogEntry {
    return {
      level,
      timestamp: new Date().toISOString(),
      event: { ...ENV_CONTEXT, ...event, timestamp: new Date().toISOString() },
    };
  }

  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBuffer) this.buffer.shift();
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

export const logger = new WideLogger();

// ─── Convenience Helpers (backward compat) ───────────────────────────────────

/** Log an auth-related event */
export const logAuthEvent = (message: string, userId?: string, metadata?: Record<string, unknown>) => {
  logger.info({ message, component: 'Auth', user_id: userId, ...metadata });
};

/** Log an error with component context */
export const logError = (message: string, error?: Error, component?: string) => {
  logger.error({
    message,
    component,
    error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
  });
};

/** Log a performance measurement */
export const logPerformance = (action: string, duration: number, component?: string) => {
  logger.info({ message: `Performance: ${action}`, component, action, duration_ms: duration });
};

/** Log a Supabase query result (replaces parentPortalLogger) */
export const logSupabaseQuery = (
  context: { component: string; operation: string; userId?: string; familyId?: string; table?: string; metadata?: Record<string, unknown> },
  result: { success: boolean; rowCount?: number; error?: { message?: string; code?: string; details?: string; hint?: string } | Error | null; duration?: number }
) => {
  const event: WideEvent = {
    component: `ParentPortal.${context.component}`,
    action: context.operation,
    user_id: context.userId,
    table: context.table,
    family_id: context.familyId,
    outcome: result.success ? 'success' : 'error',
    row_count: result.rowCount,
    duration_ms: result.duration,
    ...context.metadata,
  };

  if (result.success) {
    logger.info(event);
  } else {
    const err = result.error instanceof Error ? result.error : result.error;
    event.error = err ? { message: (err as { message?: string }).message, code: (err as { code?: string }).code, details: (err as { details?: string }).details, hint: (err as { hint?: string }).hint } : undefined;
    logger.error(event);
  }
};

/** Log a data access issue (replaces parentPortalLogger.logDataAccessIssue) */
export const logDataAccessIssue = (
  component: string,
  issue: string,
  context: { userId?: string; familyId?: string; expectedData?: string; actualResult?: string; possibleCause?: string }
) => {
  logger.info({
    message: `Data access issue: ${issue}`,
    component: `ParentPortal.${component}`,
    action: 'data_access_check',
    user_id: context.userId,
    family_id: context.familyId,
    expected: context.expectedData,
    actual: context.actualResult,
    possible_cause: context.possibleCause,
  });
};

/** Log a successful data fetch with summary (replaces parentPortalLogger.logDataFetchSuccess) */
export const logDataFetchSuccess = (
  component: string,
  summary: { familyCount?: number; memberCount?: number; recordCount?: number; userId?: string; duration?: number }
) => {
  logger.info({
    message: 'Data fetch completed',
    component: `ParentPortal.${component}`,
    action: 'data_fetch_complete',
    user_id: summary.userId,
    family_count: summary.familyCount,
    member_count: summary.memberCount,
    record_count: summary.recordCount,
    duration_ms: summary.duration,
  });
};

/** Create a query timer (replaces parentPortalLogger.createQueryTimer) */
export const createQueryTimer = () => {
  const startTime = performance.now();
  return { elapsed: () => performance.now() - startTime };
};

// ─── Production Console Override ─────────────────────────────────────────────

/**
 * Override console.log in production to prevent accidental data leakage.
 * Call once at app startup.
 */
export const initSecureLogging = () => {
  if (import.meta.env.PROD) {
    const original = { ...console };
    console.log = (message?: unknown, ...args: unknown[]) => {
      if (typeof message === 'string' && message.startsWith('[SAFE]')) {
        original.log(message.replace('[SAFE]', ''), ...args.map(sanitize));
      }
    };
    console.warn = original.warn;
    console.error = original.error;
    console.info = original.info;
  }
};
