# Error Recovery Patterns

This document outlines error handling patterns used in this application to ensure reliability and proper error reporting.

## Quick Reference

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

### Using Retry Logic with useAsyncOperation

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

### Error Boundaries for Async Components

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

## Available Tools

### 1. `useAsyncOperation` Hook

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

### 2. `AsyncErrorBoundary` Component

Error boundary with built-in retry UI for async operations.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `componentName` | string | 'Unknown' | Name for logging |
| `showRetry` | boolean | true | Show retry button |
| `fallback` | ReactNode | - | Custom fallback UI |
| `onReset` | function | - | Callback after retry |
| `onError` | function | - | Callback when error caught |

### 3. `productionErrorReporter` Utilities

**`reportError(error, context, severity?, metadata?)`**
Reports an error with appropriate logging based on environment.

**`withErrorReporting(operation, context, options?)`**
Wraps an async operation with error reporting.

**`createSafeHandler(handler, context)`**
Wraps event handlers to catch and report errors.

## Error Severity Levels

| Level | When to Use |
|-------|-------------|
| `low` | Non-critical errors, degraded functionality |
| `medium` | Feature failures, user-facing errors |
| `high` | Core functionality broken |
| `critical` | Security issues, data loss risks |

## React Query Configuration

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

## Best Practices

1. **Never use empty catch blocks** - Always report or handle errors
2. **Use appropriate severity levels** - Helps prioritize issues
3. **Include context** - Makes debugging easier
4. **Consider retryability** - Network errors should retry, auth errors shouldn't
5. **Show user feedback** - Let users know something went wrong
6. **Log in production** - Silent failures are the worst kind

## Retryable vs Non-Retryable Errors

**Retryable:**
- Network errors (offline, timeout)
- 5xx server errors
- Rate limiting (429)

**Non-Retryable:**
- 4xx client errors (bad request, unauthorized)
- Validation errors
- Business logic errors
