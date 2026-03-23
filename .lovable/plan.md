

## Comprehensive Error Tracking, Testing & Diagnostics System

### Current State Assessment

Your project already has solid foundations:
- **`useAutoErrorLogging`** in `App.tsx` captures JS errors, unhandled rejections, and 5xx network errors globally
- **`useErrorTracking`** sends errors to the `error-collector` edge function → `system_errors` table
- **Admin System Monitoring** (`/admin/system-monitoring`) shows errors, alerts, patterns, edge function health, and logs
- **Logs Triage** (`/admin/logs-triage`) has log viewer, test output parser, error capture, and triage tickets
- **Security testing** edge function runs RLS/auth tests on demand
- Circuit breaker prevents error flood loops

### Gaps Identified

1. **No Vite build error capture** - HMR/build warnings not tracked
2. **Console intercept missing** - `console.error`/`console.warn` in utils not routed to DB
3. **No in-browser test runner** - tests are copy-paste CLI commands only, can't trigger from admin
4. **No safety check runner** - security tests exist but aren't integrated into a unified diagnostics panel
5. **No error log diagnostics/analysis** - can't search patterns, group by component, or auto-suggest fixes
6. **Documentation links outdated** - admin guide doesn't reference all current dashboards

---

### Plan

#### 1. Intercept Console Errors Site-Wide

**File:** `src/hooks/useAutoErrorLogging.tsx`

Patch `console.error` and `console.warn` globally to also route through `logError()` with type `console_error`/`console_warn`. This captures the ~179 `console.error` calls in utils that currently bypass the DB. Apply same circuit-breaker rate limiting. Exclude self-referential calls to prevent loops.

#### 2. Add Vite Build Error Capture

**File:** `src/hooks/useAutoErrorLogging.tsx`

Listen to Vite's `import.meta.hot?.on('vite:error')` and `import.meta.hot?.on('vite:beforeUpdate')` events in development. Route build/HMR errors to `logError()` with type `vite_build_error`. This captures compilation failures and module resolution issues.

#### 3. Create Unified Diagnostics Dashboard

**File:** `src/components/admin/monitoring/DiagnosticsPanel.tsx` (new)

A single panel with three action buttons:
- **Run Safety Checks** - invokes `security-testing` edge function and displays pass/fail results inline
- **Run Vitest Suite** - calls a new `run-vitest` edge function that executes `npx vitest --reporter=json` and returns structured results
- **Analyze Error Logs** - queries `system_errors` table, groups by component/error_type, shows top offenders, frequency trends, and auto-suggests which components need attention

#### 4. Create `run-vitest` Edge Function

**File:** `supabase/functions/run-vitest/index.ts` (new)

Edge function that:
- Accepts test filter params (suite name, file pattern)
- Runs Vitest with JSON reporter via Deno subprocess
- Returns structured results: pass/fail counts, failed test details, duration
- Stores results in a new `test_run_results` table with timestamp

**Database migration:** Create `test_run_results` table:
```sql
create table public.test_run_results (
  id uuid primary key default gen_random_uuid(),
  run_type text not null, -- 'vitest', 'security', 'safety'
  total_tests int default 0,
  passed int default 0,
  failed int default 0,
  skipped int default 0,
  duration_ms int,
  results jsonb,
  triggered_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.test_run_results enable row level security;
create policy "Admins can manage test results"
  on public.test_run_results for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));
```

#### 5. Integrate Diagnostics into Admin Portal

**File:** `src/pages/admin/AdminSystemMonitoring.tsx`

Add a 7th tab "Diagnostics" containing the new `DiagnosticsPanel`. This gives admins one-click access to:
- Trigger Vitest runs and see results
- Run security safety checks
- View error log analysis with grouping and trend charts
- See suggested tests based on uncovered components

#### 6. Add Error Log Analysis Component

**File:** `src/components/admin/monitoring/ErrorLogAnalysis.tsx` (new)

Queries `system_errors` grouped by `component_name` and `error_type` over configurable time ranges. Displays:
- Top 10 error-producing components (bar chart)
- Error frequency timeline (line chart)
- Unresolved error backlog
- Suggested test areas based on error patterns

#### 7. Add Test Suggestions Panel

**File:** `src/components/admin/monitoring/TestSuggestionsPanel.tsx` (new)

Static + dynamic suggestions:
- **Static:** List of recommended test suites (accessibility, performance, RLS, auth flow, data integrity)
- **Dynamic:** Based on error log analysis, suggest components that need tests (e.g., "Component X has 15 unresolved errors - add unit test")
- Each suggestion has a copy-able Vitest command

#### 8. Update Documentation

Update these files with new features:
- **`ADMIN_FEATURES_GUIDE.md`** - Add Diagnostics tab documentation, test runner, safety checks
- **`ARCHITECTURE_DOCUMENTATION.md`** - Add comprehensive error tracking flow diagram
- **`HOOKS_DOCUMENTATION.md`** - Document enhanced `useAutoErrorLogging` with console/Vite intercepts
- **`TROUBLESHOOTING_GUIDE.md`** - Add diagnostics-based troubleshooting workflow

#### 9. Rebuild Validation

After all changes, verify:
- TypeScript compilation passes
- No circular imports from new console intercepts
- Error logging doesn't create infinite loops (circuit breaker intact)
- All new components lazy-loaded properly
- Admin sidebar links work

---

### Technical Notes

- Console intercept uses a self-referencing guard (`__isInternal`) to prevent logging loops
- Vite HMR listeners only attach when `import.meta.hot` exists (dev mode only)
- Edge function test runner is admin-only (RLS + role check)
- Error analysis queries use explicit column selection per project standard
- All new components wrapped in `AsyncErrorBoundary` with lazy loading

### Files Changed Summary

| Action | File |
|--------|------|
| Edit | `src/hooks/useAutoErrorLogging.tsx` |
| Edit | `src/pages/admin/AdminSystemMonitoring.tsx` |
| New | `src/components/admin/monitoring/DiagnosticsPanel.tsx` |
| New | `src/components/admin/monitoring/ErrorLogAnalysis.tsx` |
| New | `src/components/admin/monitoring/TestSuggestionsPanel.tsx` |
| New | `supabase/functions/run-vitest/index.ts` |
| Migration | `test_run_results` table |
| Edit | `ADMIN_FEATURES_GUIDE.md` |
| Edit | `ARCHITECTURE_DOCUMENTATION.md` |
| Edit | `HOOKS_DOCUMENTATION.md` |
| Edit | `TROUBLESHOOTING_GUIDE.md` |

