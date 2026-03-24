# Utility Functions Documentation

> **Last Updated:** 2026-03-24  
> **Total Utility Files:** 17  
> **Location:** `src/utils/`

## Overview

This document provides comprehensive documentation for all utility functions in the Chatterbox platform. Utilities are organized by functional category and include usage examples, type signatures, and best practices.

---

## Table of Contents

1. [Caching Utilities](#caching-utilities)
2. [Error Handling](#error-handling)
3. [Logging Utilities](#logging-utilities)
4. [Security Utilities](#security-utilities)
5. [Privacy Utilities](#privacy-utilities)
6. [Validation Utilities](#validation-utilities)

---

## Caching Utilities

### `CacheManager.ts`

Multi-level caching system with memory and localStorage support.

```typescript
interface CacheConfig {
  ttl: number;           // Time-to-live in milliseconds
  maxSize: number;       // Maximum cache entries
  storage: 'memory' | 'local' | 'both';
}

class CacheManager<T> {
  constructor(namespace: string, config?: Partial<CacheConfig>);
  
  /**
   * Get cached value
   */
  get(key: string): T | null;
  
  /**
   * Set cache value
   */
  set(key: string, value: T, customTtl?: number): void;
  
  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean;
  
  /**
   * Remove specific key
   */
  delete(key: string): void;
  
  /**
   * Clear all cache entries
   */
  clear(): void;
  
  /**
   * Get cache statistics
   */
  getStats(): { hits: number; misses: number; size: number };
}
```

**Usage:**
```typescript
import { CacheManager } from '@/utils/CacheManager';

const contentCache = new CacheManager<ContentItem[]>('content', {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  storage: 'both',
});

// Get with fallback
const content = contentCache.get('catalog') ?? await fetchContent();
if (!contentCache.has('catalog')) {
  contentCache.set('catalog', content);
}
```

---

## Error Handling

### `getErrorMessage.ts`

Type-safe error message extraction.

```typescript
/**
 * Extract a user-friendly error message from an unknown error type
 * Handles Error objects, strings, objects with message/error properties,
 * and Supabase-style error_description
 */
export function getErrorMessage(error: unknown): string;

/**
 * Type guard to check if error has a message property
 */
export function isErrorWithMessage(error: unknown): error is { message: string };

/**
 * Type guard for errors with code property (PostgreSQL/Supabase)
 */
export function isErrorWithCode(error: unknown): error is { code: string; message: string };

/**
 * Extract error code if available
 */
export function getErrorCode(error: unknown): string | null;
```

**Usage:**
```typescript
import { getErrorMessage, getErrorCode } from '@/utils/getErrorMessage';

try {
  await riskyOperation();
} catch (error) {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  
  if (code === '23505') {
    // Handle unique constraint violation
  }
  
  toast.error(message);
}
```

---

### `errorHandling.ts`

Centralized error handling utilities.

```typescript
/**
 * Error classification
 */
export enum ErrorType {
  NETWORK = 'network',
  AUTH = 'auth',
  VALIDATION = 'validation',
  DATABASE = 'database',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown',
}

/**
 * Classify error by type
 */
export function classifyError(error: unknown): ErrorType;

/**
 * Get user-friendly message for error type
 */
export function getUserMessage(type: ErrorType): string;

/**
 * Handle error with appropriate action
 */
export function handleError(error: unknown, context?: string): void;

/**
 * Create error boundary fallback
 */
export function createFallbackComponent(error: Error, resetFn: () => void): React.ReactNode;
```

---

### `asyncErrorHandler.ts`

Async operation error wrapper.

```typescript
/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  options?: {
    onError?: (error: Error) => void;
    fallback?: T;
    retries?: number;
  }
): (...args: Args) => Promise<T>;

/**
 * Execute with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    delay?: number;
    backoff?: 'linear' | 'exponential';
  }
): Promise<T>;
```

**Usage:**
```typescript
import { withErrorHandling, withRetry } from '@/utils/asyncErrorHandler';

const fetchDataSafe = withErrorHandling(fetchData, {
  onError: (error) => toast.error(getErrorMessage(error)),
  fallback: [],
});

const result = await withRetry(fetchDataSafe, {
  maxRetries: 3,
  delay: 1000,
  backoff: 'exponential',
});
```

---

### `productionErrorReporter.ts`

Production error reporting utilities.

```typescript
interface ErrorReport {
  message: string;
  stack?: string;
  componentName?: string;
  routePath?: string;
  userId?: string;
  sessionId?: string;
  browserInfo: BrowserInfo;
  deviceInfo: DeviceInfo;
  timestamp: string;
}

/**
 * Report error to backend
 */
export async function reportError(
  error: Error,
  context?: Partial<ErrorReport>
): Promise<void>;

/**
 * Batch error reporting
 */
export function createErrorBatcher(
  flushInterval?: number
): {
  add: (error: Error, context?: Partial<ErrorReport>) => void;
  flush: () => Promise<void>;
};
```

---

## Logging Utilities

### `conditionalLogger.ts`

Environment-aware logging.

```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  userId?: string;
  sessionId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

class ConditionalLogger {
  /**
   * Debug level logging (dev only)
   */
  debug(message: string, context?: LogContext | unknown): void;
  
  /**
   * Info level logging (dev only)
   */
  info(message: string, context?: LogContext | unknown): void;
  
  /**
   * Warning level logging (always)
   */
  warn(message: string, context?: LogContext | unknown): void;
  
  /**
   * Error level logging (always)
   */
  error(message: string, error?: Error | unknown, context?: LogContext | unknown): void;
  
  /**
   * General logging (dev only)
   */
  log(message: string, data?: unknown): void;
}

export const conditionalLogger: ConditionalLogger;

// Shorthand exports
export const cLog: typeof conditionalLogger.log;
export const cDebug: typeof conditionalLogger.debug;
export const cInfo: typeof conditionalLogger.info;
export const cWarn: typeof conditionalLogger.warn;
export const cError: typeof conditionalLogger.error;
```

**Usage:**
```typescript
import { cLog, cError, cWarn } from '@/utils/conditionalLogger';

// Development only - won't appear in production
cLog('Component mounted');
cLog(`Fetched ${items.length} items`);

// Always logged
cWarn('Deprecated API usage', { component: 'OldFeature' });
cError('Failed to save', error, { action: 'save' });
```

---

### `debugLogger.ts`

Debug logging utilities.

```typescript
/**
 * Create namespaced debug logger
 */
export function createDebugLogger(namespace: string): {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  time: (label: string) => void;
  timeEnd: (label: string) => void;
};

/**
 * Enable/disable debug namespaces
 */
export function setDebugNamespaces(namespaces: string[]): void;
```

---

### `logger.ts`

Base logging implementation.

```typescript
export interface Logger {
  log: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

export const logger: Logger;
```

---

### `parentPortalLogger.ts`

Parent portal specific logging.

```typescript
/**
 * Log parent portal events
 */
export function logParentAction(
  action: string,
  details?: Record<string, unknown>
): void;

/**
 * Log child-related operations
 */
export function logChildOperation(
  childId: string,
  operation: string,
  details?: Record<string, unknown>
): void;
```

---

### `secureLogging.ts`

Security-aware logging that sanitizes sensitive data.

```typescript
/**
 * Sensitive fields that should be redacted
 */
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apiKey', 'ssn'];

/**
 * Log with sensitive data redaction
 */
export function secureLog(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): void;

/**
 * Redact sensitive fields from object
 */
export function redactSensitive(obj: Record<string, unknown>): Record<string, unknown>;
```

---

## Security Utilities

### `enhancedChildAccountSecurity.ts`

Child account security measures.

```typescript
/**
 * Validate child account access
 */
export async function validateChildAccess(
  userId: string,
  childId: string
): Promise<boolean>;

/**
 * Check if user is parent of child
 */
export async function isParentOfChild(
  parentId: string,
  childId: string
): Promise<boolean>;

/**
 * Enforce child data restrictions
 */
export function enforceChildDataRestrictions(
  data: Record<string, unknown>
): Record<string, unknown>;
```

---

### `secureChildAccountAccess.ts`

Secure child account access utilities.

```typescript
/**
 * Get child accounts for parent
 */
export async function getChildAccountsForParent(
  parentId: string
): Promise<ChildAccount[]>;

/**
 * Verify parent-child relationship
 */
export async function verifyParentChildRelationship(
  parentId: string,
  childId: string
): Promise<boolean>;
```

---

### `secureFamilyAccess.ts`

Family data access control.

```typescript
/**
 * Check family membership
 */
export async function isFamilyMember(
  userId: string,
  familyId: string
): Promise<boolean>;

/**
 * Get user's family ID
 */
export async function getUserFamilyId(userId: string): Promise<string | null>;

/**
 * Verify family creator
 */
export async function isFamilyCreator(
  userId: string,
  familyId: string
): Promise<boolean>;
```

---

### `secureProfileAccess.ts`

Profile access control.

```typescript
/**
 * Get profile with security check
 */
export async function getSecureProfile(
  requesterId: string,
  targetUserId: string
): Promise<Profile | null>;

/**
 * Check if user can view profile
 */
export async function canViewProfile(
  viewerId: string,
  targetUserId: string
): Promise<boolean>;
```

---

## Privacy Utilities

### `privacyCompliance.ts`

GDPR/COPPA compliance utilities.

```typescript
/**
 * Check if user is a minor (COPPA)
 */
export function isMinor(dateOfBirth: string | Date): boolean;

/**
 * Get required consent types for user
 */
export function getRequiredConsents(
  userAge: number,
  region: string
): ConsentType[];

/**
 * Export user data (GDPR Article 20)
 */
export async function exportUserData(userId: string): Promise<UserDataExport>;

/**
 * Delete user data (GDPR Article 17)
 */
export async function deleteUserData(
  userId: string,
  options?: { keepAuditLogs?: boolean }
): Promise<void>;

/**
 * Anonymize user data
 */
export function anonymizeData(
  data: Record<string, unknown>
): Record<string, unknown>;
```

---

### `privacySettings.ts`

Privacy preference management.

```typescript
interface PrivacySettings {
  dataCollection: boolean;
  behavioralTracking: boolean;
  analyticsSharing: boolean;
  marketingEmails: boolean;
}

/**
 * Get user privacy settings
 */
export async function getPrivacySettings(userId: string): Promise<PrivacySettings>;

/**
 * Update privacy settings
 */
export async function updatePrivacySettings(
  userId: string,
  settings: Partial<PrivacySettings>
): Promise<void>;

/**
 * Check if specific tracking is allowed
 */
export async function isTrackingAllowed(
  userId: string,
  trackingType: keyof PrivacySettings
): Promise<boolean>;
```

---

## Validation Utilities

### `enhancedInputValidation.ts`

Enhanced input validation with Zod.

```typescript
import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character');

/**
 * Name validation schema
 */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in name');

/**
 * Sanitize HTML input
 */
export function sanitizeHtml(input: string): string;

/**
 * Validate and sanitize input
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; errors: string[] };
```

**Usage:**
```typescript
import { validateInput, emailSchema, passwordSchema } from '@/utils/enhancedInputValidation';
import { z } from 'zod';

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password required'),
});

const result = validateInput(loginSchema, formData);
if (!result.success) {
  setErrors(result.errors);
  return;
}

// result.data is typed correctly
await signIn(result.data.email, result.data.password);
```

---

## Best Practices

### Error Handling Pattern

```typescript
// ✅ Good: Use utility functions
import { getErrorMessage } from '@/utils/getErrorMessage';
import { cError } from '@/utils/conditionalLogger';

try {
  await operation();
} catch (error) {
  cError('Operation failed', error);
  toast.error(getErrorMessage(error));
}

// ❌ Bad: Direct any casting
try {
  await operation();
} catch (error: any) {
  console.error(error.message);
}
```

### Logging Pattern

```typescript
// ✅ Good: Use conditional logger
import { cLog, cError } from '@/utils/conditionalLogger';

cLog(`Component mounted with ${props.items.length} items`);

// ❌ Bad: Direct console.log
console.log('Component mounted', props.items.length);
```

### Validation Pattern

```typescript
// ✅ Good: Use Zod schemas
import { validateInput, emailSchema } from '@/utils/enhancedInputValidation';

const result = validateInput(emailSchema, input);
if (!result.success) return;

// ❌ Bad: Manual regex validation
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
  return 'Invalid email';
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-21 | Initial documentation |
