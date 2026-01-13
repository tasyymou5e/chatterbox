# JSDoc Standards Guide

**Chatterbox Project Documentation Standards**  
**Last Updated**: 2026-01-13

## Overview

This document defines the JSDoc documentation standards for the Chatterbox codebase. Consistent documentation improves maintainability, enables IDE IntelliSense, and helps new developers understand the codebase quickly.

---

## Required Documentation

### What Must Be Documented

1. **All exported functions** - Public API functions
2. **All React hooks** - Custom hooks with their return types
3. **All store actions** - Zustand store methods
4. **Complex utility functions** - Non-trivial helper functions
5. **Edge functions** - API endpoints with request/response contracts
6. **Type definitions** - Complex interfaces and types

### What Can Be Skipped

- Simple getter/setter functions with obvious purposes
- Internal helper functions with clear naming
- Component render methods (document props instead)
- Re-exports from other modules

---

## JSDoc Tags Reference

### Core Tags

| Tag | Usage | Required |
|-----|-------|----------|
| `@description` | What the function does | Yes |
| `@param` | Each parameter with type | Yes |
| `@returns` | Return type and description | Yes |
| `@example` | Usage example | For complex functions |
| `@throws` | Errors that may be thrown | When applicable |
| `@see` | Related functions/docs | When helpful |
| `@deprecated` | Mark as deprecated | When applicable |

### TypeScript-Specific Tags

| Tag | Usage |
|-----|-------|
| `@template` | Generic type parameters |
| `@type` | Inline type annotations |
| `@typedef` | Complex type definitions |

---

## Templates by Category

### Store Actions

```typescript
/**
 * Signs in a user with email and password credentials.
 * 
 * @description Authenticates the user via Supabase Auth, fetches their role,
 * and updates the auth state atomically. Logs the activity to the auth logging service.
 * 
 * @param email - User's email address
 * @param password - User's password (min 8 characters)
 * @returns Promise resolving to result object with error, user, and admin status
 * 
 * @example
 * const { error, user, isAdmin } = await signIn('user@example.com', 'password123');
 * if (error) {
 *   console.error('Login failed:', error.message);
 * } else {
 *   console.log('Logged in as:', user?.email);
 * }
 * 
 * @throws Never throws - errors are returned in the result object
 */
signIn: async (email: string, password: string) => { ... }
```

### Custom Hooks

```typescript
/**
 * Hook for handling async operations with automatic retry logic.
 * 
 * @description Provides loading, error, and retry state management for
 * async operations with configurable retry behavior and exponential backoff.
 * 
 * @template T - The type of data returned by the operation
 * @template Args - Tuple type of operation arguments
 * 
 * @param operation - Async function to execute
 * @param options - Configuration options
 * @param options.maxRetries - Maximum retry attempts (default: 3)
 * @param options.retryDelay - Initial retry delay in ms (default: 1000)
 * @param options.showErrorToast - Show toast on error (default: true)
 * @param options.context - Context name for error logging
 * 
 * @returns Object containing:
 *   - `data` - The result data or null
 *   - `error` - Error object or null
 *   - `isLoading` - Loading state
 *   - `isRetrying` - Whether currently retrying
 *   - `retryCount` - Number of retries attempted
 *   - `execute` - Function to trigger the operation
 *   - `reset` - Function to reset state
 *   - `canRetry` - Whether more retries are available
 * 
 * @example
 * const { execute, isLoading, error, canRetry } = useAsyncOperation(
 *   async (id: string) => fetchUserById(id),
 *   { maxRetries: 3, context: 'FetchUser' }
 * );
 * 
 * // Execute the operation
 * const result = await execute('user-123');
 * 
 * @see {@link isRetryableError} for retry eligibility logic
 */
export function useAsyncOperation<T, Args extends unknown[] = []>(
  operation: (...args: Args) => Promise<T>,
  options: UseAsyncOperationOptions<T> = {}
) { ... }
```

### Utility Functions

```typescript
/**
 * Wraps a store operation with automatic retry logic.
 * 
 * @description Implements exponential backoff retry strategy for failed
 * operations. Retries are triggered based on error type and message matching.
 * 
 * @template T - The type of successful result data
 * 
 * @param operation - Async function returning StoreResult<T>
 * @param config - Retry configuration options
 * @param config.maxRetries - Maximum retry attempts (default: 3)
 * @param config.minRetryInterval - Minimum delay between retries in ms (default: 2000)
 * @param config.maxBackoffDelay - Maximum backoff delay in ms (default: 30000)
 * @param config.retryableErrorTypes - Error types eligible for retry
 * @param config.retryableErrorMessages - Error message patterns eligible for retry
 * 
 * @returns Promise<StoreResult<T>> with retry metadata
 * 
 * @example
 * const result = await withRetry(
 *   () => fetchUserData(userId),
 *   { maxRetries: 5, minRetryInterval: 1000 }
 * );
 * 
 * if (result.success) {
 *   console.log('Data:', result.result.data);
 * } else {
 *   console.error('Failed after retries:', result.retryCount);
 * }
 */
export const withRetry = async <T>(
  operation: () => Promise<StoreResult<T>>,
  config: RetryConfig = defaultRetryConfig
): Promise<StoreResult<T>> => { ... }
```

### Edge Functions

```typescript
/**
 * Create Child Account
 * 
 * @description Creates a new child account linked to a parent's family.
 * Handles both parent-initiated and admin-initiated account creation.
 * Creates auth user, profile, family membership, and role assignment.
 * 
 * @route POST /functions/v1/create-child-account
 * 
 * @authentication Required - JWT token in Authorization header
 * @authorization Parent role (creates in own family) or Admin role (must specify familyId)
 * 
 * @requestBody {CreateChildAccountRequest}
 * @property {string} firstName - Child's first name (required)
 * @property {string} lastName - Child's last name (required)
 * @property {string} parentUserId - ID of the requesting parent/admin (required)
 * @property {string} password - Account password, min 8 chars (required)
 * @property {string} [familyId] - Target family ID (required for admins)
 * 
 * @successResponse 200 {CreateChildAccountResponse}
 * @property {boolean} success - Always true on success
 * @property {object} childAccount - Created account details
 * @property {object} family - Family information
 * @property {object} instructions - Next steps for login
 * 
 * @errorResponse 400 - Missing required fields or validation error
 * @errorResponse 403 - Access denied (not a parent or admin)
 * @errorResponse 500 - Internal server error
 * 
 * @example
 * // Request
 * POST /functions/v1/create-child-account
 * Authorization: Bearer <jwt-token>
 * Content-Type: application/json
 * {
 *   "firstName": "Alex",
 *   "lastName": "Smith",
 *   "parentUserId": "uuid-here",
 *   "password": "SecurePass123!"
 * }
 * 
 * // Response
 * {
 *   "success": true,
 *   "childAccount": {
 *     "id": "child-uuid",
 *     "firstName": "Alex",
 *     "lastName": "Smith",
 *     "email": "parent@email.com.alex",
 *     "status": "completed"
 *   },
 *   "family": { "id": "fam-uuid", "name": "Smith Family", "code": "FAM-2026-001" },
 *   "instructions": { ... }
 * }
 */
```

### React Components

```typescript
/**
 * AsyncContent - Conditional content renderer based on async state.
 * 
 * @description Renders loading skeleton, error fallback, or children based on
 * the current async operation state. Provides consistent loading/error UX.
 * 
 * @param props - Component props
 * @param props.loading - Whether data is loading
 * @param props.error - Error object if operation failed
 * @param props.skeleton - Custom loading skeleton (optional)
 * @param props.errorFallback - Custom error display (optional)
 * @param props.children - Content to render when loaded successfully
 * @param props.onRetry - Callback for retry button (optional)
 * 
 * @example
 * <AsyncContent
 *   loading={isLoading}
 *   error={error}
 *   skeleton={<TableSkeleton rows={5} />}
 *   onRetry={refetch}
 * >
 *   <DataTable data={data} />
 * </AsyncContent>
 */
```

---

## Best Practices

### 1. Keep Descriptions Concise

**Good:**
```typescript
/**
 * Fetches user role from database using RPC call.
 */
```

**Avoid:**
```typescript
/**
 * This function is used to fetch the user's role from the database.
 * It makes a call to the database and returns the role.
 */
```

### 2. Document Side Effects

```typescript
/**
 * Signs out the current user.
 * 
 * @description Clears all auth state, removes persisted data from localStorage
 * and sessionStorage, and logs the sign-out activity.
 * 
 * @sideEffects
 * - Clears localStorage 'auth-store' key
 * - Clears sessionStorage
 * - Logs activity to auth_logs table
 */
```

### 3. Use @example for Complex Functions

```typescript
/**
 * @example
 * // Basic usage
 * const result = await withRetry(() => fetchData());
 * 
 * // With custom config
 * const result = await withRetry(
 *   () => fetchData(),
 *   { maxRetries: 5, minRetryInterval: 500 }
 * );
 * 
 * // Handling result
 * if (result.success) {
 *   processData(result.result.data);
 * } else if (result.canRetry) {
 *   showRetryButton();
 * }
 */
```

### 4. Document Return Object Properties

```typescript
/**
 * @returns Object containing:
 *   - `data` - The fetched data or null if not loaded
 *   - `error` - Error object if request failed
 *   - `isLoading` - True while request is in progress
 *   - `refetch` - Function to re-trigger the request
 */
```

### 5. Link Related Functions

```typescript
/**
 * @see {@link fetchUserRole} for role fetching logic
 * @see {@link checkAdminRole} for admin verification
 * @see AuthState for complete state interface
 */
```

---

## IDE Integration

### VSCode Settings

Add to `.vscode/settings.json`:

```json
{
  "typescript.suggest.completeJSDocs": true,
  "editor.parameterHints.enabled": true
}
```

### Recommended Extensions

- **Document This** - Auto-generate JSDoc comments
- **Better Comments** - Highlight TODO, FIXME, etc.

---

## Validation

To check JSDoc coverage, use:

```bash
# Check for missing documentation
npx typedoc --validation

# Generate documentation report
npx typedoc src --out docs
```

---

## Migration Guide

When adding JSDoc to existing functions:

1. Start with exported functions
2. Add `@description` and `@param` tags first
3. Add `@returns` with type info
4. Add `@example` for complex APIs
5. Add `@throws` and `@see` as needed

---

## Resources

- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [JSDoc Official Documentation](https://jsdoc.app/)
- [TSDoc Standard](https://tsdoc.org/)
