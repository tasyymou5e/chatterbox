# Error Recovery Patterns
**Last Updated: 2026-03-24**

This document outlines error handling patterns used in this application to ensure reliability and proper error reporting.

---

## 📋 Quick Reference

### Instead of Silent Catches

```typescript
// ❌ BAD: Silent catch or console-only
try {
  await fetchData();
} catch (error) {
  console.error('Error:', error);
}

// ✅ GOOD: Proper error handling with reporting
import { withErrorReporting } from '@/utils/productionErrorReporter';

await withErrorReporting(
  () => fetchData(),
  'DataFetcher',
  { severity: 'medium', fallback: [] }
);
```

### Type-Safe Error Handling (NEW)

```typescript
// ❌ BAD: Using 'any' type
catch (error: any) {
  console.error('Error:', error.message);
}

// ✅ GOOD: Type-safe with getErrorMessage
import { getErrorMessage } from '@/utils/getErrorMessage';

catch (error) {
  const message = getErrorMessage(error);
  console.error('Error:', message);
  toast.error(message);
}
```

---

## 🛠️ Available Tools

### 1. `getErrorMessage` Utility (NEW)

Type-safe error message extraction that replaces `catch (error: any)` patterns.

**Location:** `src/utils/getErrorMessage.ts`

```typescript
import { getErrorMessage } from '@/utils/getErrorMessage';

// Works with any error type
catch (error) {
  const message = getErrorMessage(error);
  // Returns string: Error.message, string itself, or 'An unexpected error occurred'
}
```

**Supported Error Types:**
| Input Type | Output |
|------------|--------|
| `Error` instance | `error.message` |
| `string` | The string itself |
| Object with `message` | `String(error.message)` |
| Anything else | `'An unexpected error occurred'` |

---

### 2. `debugLog` Utility (NEW)

Environment-aware logging that prevents information disclosure in production.

**Location:** `src/utils/debugLogger.ts`

```typescript
import { debugLog } from '@/utils/debugLogger';

// Component-prefixed logging
debugLog.info('AuthStore', 'User logged in', { userId });
debugLog.warn('API', 'Slow response detected', { duration: 3500 });
debugLog.error('Payment', 'Transaction failed', error);
debugLog.debug('Cache', 'Cache miss', { key });
```

**Behavior by Environment:**
| Method | Development | Production |
|--------|-------------|------------|
| `info` | Full logging with data | Suppressed |
| `warn` | Full logging with data | Suppressed |
| `error` | Full with stack trace | Minimal (no stack) |
| `debug` | Full logging with data | Suppressed |
| `trace` | Full logging with trace | Suppressed |

**Rate-Limited Error Logging:**
```typescript
import { rateLimitedLogger } from '@/utils/debugLogger';

// Prevents log flooding (max 10 errors per minute)
rateLimitedLogger.log('Component', 'Error occurred', error);

// Check remaining capacity
const remaining = rateLimitedLogger.getRemainingCapacity();
```

---

### 3. `useAsyncOperation` Hook

A hook for handling async operations with automatic retry logic.

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxRetries` | number | 3 | Maximum retry attempts |
| `retryDelay` | number | 1000 | Initial delay in ms (exponential backoff) |
| `showErrorToast` | boolean | true | Show toast on final failure |
| `context` | string | 'Operation' | Name for logging |
| `onSuccess` | function | - | Callback on success |
| `onError` | function | - | Callback on final failure |

**Returns:**
| Property | Type | Description |
|----------|------|-------------|
| `data` | T \| null | Successful result |
| `error` | Error \| null | Error if failed |
| `isLoading` | boolean | Currently executing |
| `isRetrying` | boolean | Currently in retry attempt |
| `retryCount` | number | Current retry count |
| `execute` | function | Trigger the operation |
| `reset` | function | Reset state |
| `canRetry` | boolean | Whether more retries available |

**Usage:**
```typescript
import { useAsyncOperation } from '@/hooks/useAsyncOperation';

function MyComponent() {
  const { execute, isLoading, error, isRetrying, canRetry } = useAsyncOperation(
    async (id: string) => fetchItem(id),
    { 
      maxRetries: 3, 
      context: 'FetchItem',
      showErrorToast: true 
    }
  );

  return (
    <button onClick={() => execute('123')} disabled={isLoading}>
      {isRetrying ? 'Retrying...' : isLoading ? 'Loading...' : 'Fetch Item'}
    </button>
  );
}
```

---

### 4. `AsyncErrorBoundary` Component

Error boundary with built-in retry UI for async operations.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `componentName` | string | 'Unknown' | Name for logging |
| `showRetry` | boolean | true | Show retry button |
| `fallback` | ReactNode | - | Custom fallback UI |
| `onReset` | function | - | Callback after retry |
| `onError` | function | - | Callback when error caught |

**Usage:**
```tsx
import { AsyncErrorBoundary } from '@/components/AsyncErrorBoundary';

function App() {
  return (
    <AsyncErrorBoundary 
      componentName="MyAsyncComponent" 
      showRetry
      onError={(error) => console.log('Error caught:', error)}
    >
      <MyAsyncComponent />
    </AsyncErrorBoundary>
  );
}
```

---

### 5. `productionErrorReporter` Utilities

**`reportError(error, context, severity?, metadata?)`**
Reports an error with appropriate logging based on environment.

**`withErrorReporting(operation, context, options?)`**
Wraps an async operation with error reporting.

**`createSafeHandler(handler, context)`**
Wraps event handlers to catch and report errors.

---

## 📊 Error Severity Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| `low` | Non-critical errors, degraded functionality | Analytics tracking failed |
| `medium` | Feature failures, user-facing errors | Form submission failed |
| `high` | Core functionality broken | Authentication error |
| `critical` | Security issues, data loss risks | Data corruption detected |

---

## ⚙️ React Query Configuration

The QueryClient is configured with automatic retry:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx client errors
        if (error instanceof Error && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
```

---

## 🔄 Memory Leak Prevention (NEW)

### Pattern 1: isMounted Flag
```typescript
useEffect(() => {
  let isMounted = true;
  
  const fetchData = async () => {
    try {
      const result = await api.getData();
      if (isMounted) {
        setData(result);
      }
    } catch (error) {
      if (isMounted) {
        setError(getErrorMessage(error));
      }
    }
  };
  
  fetchData();
  
  return () => {
    isMounted = false;
  };
}, []);
```

### Pattern 2: Timeout Ref Cleanup
```typescript
const timeoutRef = useRef<number | null>(null);

useEffect(() => {
  timeoutRef.current = window.setTimeout(() => {
    // Action
  }, 1000);
  
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, []);
```

### Pattern 3: Interval Cleanup
```typescript
useEffect(() => {
  const intervalId = setInterval(() => {
    // Polling action
  }, 5000);
  
  return () => clearInterval(intervalId);
}, []);
```

---

## ✅ Best Practices

1. **Never use empty catch blocks** - Always report or handle errors
2. **Use `getErrorMessage`** - Replace all `catch (error: any)` patterns
3. **Use appropriate severity levels** - Helps prioritize issues
4. **Include context** - Makes debugging easier
5. **Consider retryability** - Network errors should retry, auth errors shouldn't
6. **Show user feedback** - Let users know something went wrong
7. **Log in production** - Silent failures are the worst kind
8. **Clean up async operations** - Prevent memory leaks with proper cleanup

---

## 🔀 Retryable vs Non-Retryable Errors

**Retryable:**
- Network errors (offline, timeout)
- 5xx server errors
- Rate limiting (429)
- Temporary database unavailability

**Non-Retryable:**
- 4xx client errors (bad request, unauthorized)
- Validation errors
- Business logic errors
- Authentication failures

---

## 📁 File Locations

| Utility | Location |
|---------|----------|
| `getErrorMessage` | `src/utils/getErrorMessage.ts` |
| `debugLogger` | `src/utils/debugLogger.ts` |
| `productionErrorReporter` | `src/utils/productionErrorReporter.ts` |
| `errorHandling` | `src/utils/errorHandling.ts` |
| `useAsyncOperation` | `src/hooks/useAsyncOperation.ts` |
| `AsyncErrorBoundary` | `src/components/AsyncErrorBoundary.tsx` |
| `ErrorBoundary` | `src/components/ErrorBoundary.tsx` |

---

**Last Updated**: 2026-01-15 | **Patterns**: 8 | **Utilities**: 6
