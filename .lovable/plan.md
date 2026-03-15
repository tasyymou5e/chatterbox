

## Site Audit: Issues Found and Fix Plan

### Issues Discovered

**1. BROKEN ROUTE: `/admin/test-results` returns 404 (CRITICAL)**

The error-collector logs confirm users hitting a 404 when navigating to `/admin/test-results`. The route IS defined in `src/routes/index.tsx` (line 341) and the page file exists. However, the route was likely added after the last successful build. The sidebar link in `AdminSidebar.tsx` (line 78) correctly points to this path. This should resolve on next build, but we should verify it works.

**2. BROKEN E2E TEST: `navigation.spec.ts` expects wrong URL for Terms of Service**

- Test at line 43 expects: `/support/terms-of-service`
- Actual route defined: `/support/terms`
- All app links (Index.tsx footer, SiteHeader.tsx) correctly use `/support/terms`
- The E2E test will always fail — needs to be updated to match the real route

**3. STALE DEBUG `console.log` STATEMENTS in production frontend code**

Found active `console.log` calls in shipped frontend code that should use `secureLog` or be removed:

| File | Issue |
|------|-------|
| `src/components/games/hooks/useCatalogRealtime.ts` | 5 `console.log` calls for realtime debug |
| `src/pages/ParentDashboard.tsx` | `console.log` for auto-repair |
| `src/stores/systemHealthStore.ts` | 3 `console.log` calls with emoji prefixes |
| `src/pages/admin/AdminLogin.tsx` | 4 `console.log` calls for auth flow debug |
| `src/services/storeUtils.ts` | 1 `console.log` for retry operations |

The project standard (per memory) is to use `secureLog` / `WideLogger` — not raw `console.log`.

Edge function `console.log` calls are acceptable (server-side logging).

**4. `VirtualizedContentGrid.tsx` — dev debug panel leaks to production**

Line 99: `process.env.NODE_ENV === 'development'` guard is correct, but Vite replaces `process.env.NODE_ENV` at build time so this is fine. No action needed.

**5. No other broken internal links found**

All footer links, header links, and sidebar nav links match their route definitions. Support routes (`/support/help-center`, `/support/contact`, `/support/privacy-policy`, `/support/terms`) all align between routes, Index.tsx footer, and SiteHeader.tsx.

---

### Fix Plan

| Priority | Task | Files |
|----------|------|-------|
| 1 | Fix E2E test: change `/support/terms-of-service` to `/support/terms` | `tests-e2e/navigation.spec.ts` |
| 2 | Replace 13 `console.log` calls in frontend code with `secureLog.dev()` or remove | `useCatalogRealtime.ts`, `ParentDashboard.tsx`, `systemHealthStore.ts`, `AdminLogin.tsx`, `storeUtils.ts` |
| 3 | Verify `/admin/test-results` route renders after build (confirm the 404 is resolved) | Build verification |

No database changes, no new files. Straightforward cleanup.

