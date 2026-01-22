# Logging Standards

> **Last Updated**: January 2026  
> **ESLint Enforcement**: `"no-console": "error"` – Direct `console.*` calls are forbidden in application code.

## Quick Reference

| Utility | Import | Use Case | Production |
|---------|--------|----------|------------|
| `secureLog` | `@/utils/secureLogging` | Errors, security, performance | ✅ Logs (sanitized) |
| `cLog/cWarn/cError` | `@/utils/conditionalLogger` | Development debugging | ❌ Suppressed |
| `logger` | `@/utils/logger` | Structured logging with buffer | Partial |

---

## 1. secureLog — Production-Safe Logging

**Purpose**: Logging that runs in production with automatic sensitive data redaction.

### Import

```typescript
import { secureLog } from '@/utils/secureLogging';
```

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `error` | `(message, error?, context?)` | Production errors |
| `security` | `async (event, data?, severity?)` | Security audit events |
| `warn` | `(message, data?, context?)` | Production warnings |
| `info` | `(message, data?, context?)` | Production info |
| `performance` | `(metric, value, context?)` | Performance metrics (dev only) |
| `dev` | `(message, data?)` | Development-only logging |

### Examples

```typescript
// API/Database errors - always visible in production
secureLog.error('Failed to fetch user data', error, 'UserService');

// Security events - high/critical auto-sent to security-monitoring edge function
await secureLog.security('Unauthorized access attempt', { path: '/admin' }, 'high');

// Production warnings
secureLog.warn('Rate limit approaching', { requests: 95 }, 'RateLimiter');

// Performance tracking (dev only)
secureLog.performance('API response time', 245, 'FetchUsers');

// Development-only (equivalent to cLog)
secureLog.dev('Debugging auth flow', { step: 'token-refresh' });
```

### Automatic Redaction

The following fields are automatically redacted from logged data:

- `password`, `token`, `accessToken`, `refreshToken`
- `secret`, `apiKey`, `sessionId`
- `userId`, `email`, `phone`, `ssn`, `creditCard`

```typescript
// Input
secureLog.warn('User data', { email: 'test@example.com', name: 'John' });

// Output in logs
// [WARN] User data { email: '[REDACTED]', name: 'John' }
```

### When to Use

- ✅ Catch blocks where errors should be visible in production
- ✅ Security-related events (login attempts, permission checks)
- ✅ API failures, database errors
- ✅ Performance metrics you want to track
- ✅ Warnings that indicate potential issues

---

## 2. cLog — Conditional (Development) Logging

**Purpose**: Debugging that is completely suppressed in production builds.

### Import

```typescript
import { cLog, cDebug, cInfo, cWarn, cError } from '@/utils/conditionalLogger';
```

### Methods

| Method | Production Behavior | Description |
|--------|---------------------|-------------|
| `cLog` | ❌ Suppressed | General debug logging |
| `cDebug` | ❌ Suppressed | Debug-level details |
| `cInfo` | ❌ Suppressed | Informational messages |
| `cWarn` | ✅ Visible | Warnings (cleaner format) |
| `cError` | ✅ Visible | Errors (cleaner format) |

### Examples

```typescript
// State debugging - won't appear in production
cLog('User authenticated', { userId: user.id });

// Component lifecycle
cDebug('Dialog opened', { familyId });

// Audio/media debugging
cLog('AudioContext not supported');

// Data flow debugging
cInfo('Fetched games', { count: games.length });

// Warnings (visible in production too)
cWarn('Deprecated API used', { endpoint: '/v1/users' });
```

### When to Use

- ✅ Temporary debugging during development
- ✅ State changes you want to trace
- ✅ Component mount/unmount logging
- ✅ Data fetching debugging
- ✅ Audio/media debugging
- ❌ NOT for production error handling (use `secureLog.error`)

---

## 3. logger — Structured Logging with Buffer

**Purpose**: Buffered logging with rich context for debugging complex flows.

### Import

```typescript
import { logger, logAuthEvent, logError, logPerformance } from '@/utils/logger';
```

### Methods

```typescript
// Standard logging with context
logger.debug('Message', { component: 'Auth', userId: '123' });
logger.info('Message', { component: 'API', action: 'fetch' });
logger.warn('Message', { component: 'Cache' });
logger.error('Message', error, { component: 'Database' });

// Convenience functions
logAuthEvent('User signed in', userId, { method: 'oauth' });
logError('Failed to save', error, 'ChoreService');
logPerformance('renderTime', 45, 'Dashboard');

// Buffer access (useful for debugging)
const allLogs = logger.getLogs();
const errorLogs = logger.getLogs('error');
logger.clearLogs();
```

### When to Use

- ✅ Complex authentication flows
- ✅ When you need to retrieve/analyze logs programmatically
- ✅ Multi-step operations where context matters
- ✅ Performance tracking across components

---

## 4. Decision Flowchart

```
Is this a security event?
├── Yes → secureLog.security(event, data, severity)
└── No ↓

Is this an error that should appear in production?
├── Yes → secureLog.error(message, error, context)
└── No ↓

Is this a warning that should appear in production?
├── Yes → secureLog.warn() or cWarn()
└── No ↓

Is this development debugging only?
├── Yes → cLog(), cDebug(), or secureLog.dev()
└── No ↓

Is this performance tracking?
├── Yes → secureLog.performance(metric, value, context)
└── No → Use cLog() for development
```

---

## 5. ESLint Configuration

### Main Rule

```javascript
// Enforced project-wide
"no-console": "error"
```

### Exempt Files

The following files/directories are exempt from the `no-console` rule:

| Pattern | Reason |
|---------|--------|
| `tests/**/*.ts` | Unit/component tests |
| `tests-e2e/**/*.ts` | E2E tests |
| `scripts/**/*.ts` | CLI tools |
| `supabase/functions/**/*.ts` | Edge functions (Deno) |
| `**/*.stories.tsx` | Storybook files |
| `src/utils/secureLogging.ts` | Logging utility |
| `src/utils/conditionalLogger.ts` | Logging utility |
| `src/utils/logger.ts` | Logging utility |

---

## 6. Migration Guide

### Converting console.* Calls

| Before | After | Notes |
|--------|-------|-------|
| `console.log('Debug:', data)` | `cLog('Debug', data)` | Dev only |
| `console.error('Failed:', err)` | `secureLog.error('Failed', err, 'Component')` | Production visible |
| `console.warn('Warning:', msg)` | `secureLog.warn('Warning', data, 'Context')` | Production visible |
| `console.debug('Info')` | `cDebug('Info')` | Dev only |
| `console.info('Status:', data)` | `cInfo('Status', data)` | Dev only |

### Example Migration

**Before:**
```typescript
try {
  const data = await fetchUser(id);
  console.log('User fetched:', data);
} catch (error) {
  console.error('Failed to fetch user:', error);
}
```

**After:**
```typescript
import { cLog } from '@/utils/conditionalLogger';
import { secureLog } from '@/utils/secureLogging';

try {
  const data = await fetchUser(id);
  cLog('User fetched', data); // Suppressed in production
} catch (error) {
  secureLog.error('Failed to fetch user', error, 'UserService'); // Visible in production
}
```

---

## 7. Best Practices

### Do ✅

1. **Always include context**: Identify the component/service
   ```typescript
   secureLog.error('Query failed', error, 'ChoreStore');
   ```

2. **Use appropriate severity for security events**:
   - `low`: Informational (failed login attempt)
   - `medium`: Suspicious activity (multiple failures)
   - `high`: Potential breach (unauthorized access)
   - `critical`: Active attack (injection attempts)

3. **Use cLog for temporary debugging**: Easy to find and remove
   ```typescript
   cLog('TODO: Remove before PR', debugData);
   ```

4. **Keep error messages actionable**:
   ```typescript
   // Good
   secureLog.error('Database connection failed after 3 retries', error, 'Database');
   
   // Bad
   secureLog.error('Error', error);
   ```

### Don't ❌

1. **Don't use console.* directly** — ESLint will error
2. **Don't log passwords/tokens explicitly** — Even with redaction
3. **Don't use secureLog.dev for errors** — They won't appear in production
4. **Don't forget the context parameter** — It helps with debugging

---

## 8. Related Documentation

- [SECURITY_FRAMEWORK.md](./SECURITY_FRAMEWORK.md) — Security logging requirements
- [UTILS_DOCUMENTATION.md](./UTILS_DOCUMENTATION.md) — Utility function details
- [PROJECT_SECURITY_REVIEW.md](./PROJECT_SECURITY_REVIEW.md) — Security context

---

## 9. Troubleshooting

### "ESLint: Unexpected console statement"

Replace the `console.*` call with the appropriate utility:

```typescript
// Error: console.log(...)
import { cLog } from '@/utils/conditionalLogger';
cLog('message', data);

// Error: console.error(...)
import { secureLog } from '@/utils/secureLogging';
secureLog.error('message', error, 'Context');
```

### "Logs not appearing in production"

- `cLog`, `cDebug`, `cInfo`, `secureLog.dev`, and `secureLog.performance` are **dev-only**
- Use `secureLog.error`, `secureLog.warn`, or `secureLog.info` for production visibility

### "Security events not being tracked"

- Ensure you're using `await secureLog.security(...)` — it's async
- Only `high` and `critical` severity events are sent to the edge function
