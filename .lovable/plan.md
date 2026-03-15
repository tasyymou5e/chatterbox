

# Critical: CSP Broken by HTML Comment + Infinite Error Loop

## Root Cause

Two compounding bugs are causing the massive error spam visible in your console/network logs:

### Bug 1: HTML comment inside CSP meta tag (line 21)
The comment `<!-- NOTE: connect-src... -->` is **inside** the `content` attribute of the CSP meta tag. HTML comments are not valid inside attribute values -- the browser parses the entire comment text as part of the CSP directive, corrupting it. This causes **all** `connect-src` requests (including to Supabase) to be blocked by CSP.

### Bug 2: No circuit breaker on error reporting
When a fetch to `error-collector` fails (blocked by the broken CSP):
1. `useAutoErrorLogging` fetch interceptor catches the network error
2. It calls `logNetworkError` which invokes `error-collector` again
3. That request is also blocked → triggers another error report
4. Infinite loop producing 30+ failed requests per second

## Plan

### Fix 1: Move the HTML comment outside the CSP `content` attribute
In `index.html`, move the comment to **above** the meta tag (where the existing CSP comment already lives), not inside the `content=""` value.

### Fix 2: Add error-collector URL exclusion to fetch interceptor
In `useAutoErrorLogging.tsx`, skip logging network errors for URLs containing `error-collector` (and optionally `security-monitoring`) to break the recursion loop.

### Fix 3: Add circuit breaker to `useErrorTracking.ts`
Add a simple counter/timestamp guard so that if `logError` is called more than N times within a short window (e.g., 5 calls in 10 seconds), subsequent calls are silently dropped. This provides defense-in-depth against any future infinite loops.

### Files modified
| File | Change |
|------|--------|
| `index.html` | Move comment outside CSP content attribute |
| `src/hooks/useAutoErrorLogging.tsx` | Skip error-collector URLs in fetch interceptor |
| `src/hooks/useErrorTracking.ts` | Add rate-limiting circuit breaker |

