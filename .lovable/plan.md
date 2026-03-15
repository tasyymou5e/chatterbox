

# Supabase Auth Hardening — 4 Improvements

## Overview

All four improvements are implemented as a single new hook (`useAuthSessionGuard`) plus modifications to the existing session store. No new dependencies needed — uses native browser APIs (BroadcastChannel, `visibilitychange`, `idle` detection).

## 1. Cross-Tab Session Sync

**Problem**: Logging out in one tab leaves other tabs with stale sessions. The E2E coverage file already flags this as untested (`cross-tab-sync`).

**Solution**: Use `BroadcastChannel('auth-session-sync')` to broadcast `SIGNED_OUT` and `SIGNED_IN` events across tabs.

- On `signOut` in `authActionsStore.ts`: broadcast `{ type: 'SIGNED_OUT' }` after clearing state
- On `signIn`: broadcast `{ type: 'SIGNED_IN', userId }` so other tabs re-fetch session
- Listener in `useAuthSessionGuard` hook: on receiving `SIGNED_OUT`, call `emergencyLogout()` + navigate to `/auth`; on `SIGNED_IN`, call `supabase.auth.getSession()` to pick up the new session

**Files**: `src/stores/authActionsStore.ts`, new `src/hooks/useAuthSessionGuard.ts`

## 2. Proactive Session Refresh

**Problem**: `authSessionStore.ts` handles `TOKEN_REFRESHED` events but doesn't proactively trigger refresh. `secureEdgeFunctionInvoke.ts` does proactive refresh but only for edge function calls — not globally.

**Solution**: Add a periodic check (every 60s) in `useAuthSessionGuard` that:
1. Reads `session.expires_at` from the session store
2. If < 5 minutes remaining, calls `supabase.auth.refreshSession()`
3. Logs refresh success/failure via `secureLog`
4. On refresh failure after 2 retries, trigger logout with user notification

**File**: `src/hooks/useAuthSessionGuard.ts`

## 3. Idle Timeout / Auto-Logout

**Problem**: No idle detection exists. Users stay authenticated indefinitely.

**Solution**: Track user activity (`mousemove`, `keydown`, `click`, `touchstart`, `scroll`) with a throttled handler. After a configurable idle period (default 30 min), show a warning toast. After an additional 5 minutes with no activity, auto-logout.

- Use `document.addEventListener` with passive listeners
- Throttle activity tracking to once per 30 seconds (not per event)
- Reset timer on any activity
- Pause idle tracking when document is hidden (`visibilitychange`)

**File**: `src/hooks/useAuthSessionGuard.ts`

## 4. Auth State Error Recovery

**Problem**: If `fetchUserRole` fails or `getSession` errors out, users can end up in a limbo state (loading forever or authenticated without a role).

**Solution**: Add a recovery mechanism in `useAuthSessionGuard`:
1. If `sessionReady && user && !userRole && !isCheckingRole` for > 5 seconds → retry `fetchUserRole` once
2. If retry fails → set role to `'parent'` (safe default) and log a warning
3. If `loading` stays true for > 10 seconds without `sessionReady` → force `setLoading(false)` + `setSessionReady(true)` (the existing AppInitializer handles this at 8s, but having it in the hook provides defense-in-depth)
4. On network error during `signIn`/`signOut` → surface a specific "Network error" toast instead of generic failure

**Files**: `src/hooks/useAuthSessionGuard.ts`, minor update to `src/stores/authActionsStore.ts`

## Implementation

### New file: `src/hooks/useAuthSessionGuard.ts`
Single hook that combines all four features:
- BroadcastChannel listener for cross-tab sync
- Interval-based session refresh check
- Idle timeout with activity tracking
- Role recovery watchdog

### Modified files
| File | Change |
|------|--------|
| `src/stores/authActionsStore.ts` | Broadcast sign-in/sign-out events, network error detection |
| `src/components/app/AppInitializer.tsx` | Mount `useAuthSessionGuard()` |
| `src/hooks/useAuthSessionGuard.ts` | New — all four features |

### Config
Idle timeout and refresh threshold will use constants at the top of the hook file, easy to adjust:
```
IDLE_WARNING_MS = 30 * 60 * 1000    // 30 min
IDLE_LOGOUT_MS  = 35 * 60 * 1000    // 35 min
REFRESH_CHECK_INTERVAL_MS = 60_000  // 1 min
REFRESH_THRESHOLD_MS = 5 * 60_000   // 5 min before expiry
ROLE_RECOVERY_DELAY_MS = 5_000      // 5 sec
```

