

# Logs Triage Dashboard for Admin Portal

## What We're Building

A new `/admin/logs-triage` page inspired by [ikrigel/logs-triage](https://github.com/ikrigel/logs-triage) that combines log analysis, Vitest test debugging, and frontend error triage into a single admin dashboard. This is a **frontend-only** dashboard (no external API calls to logs-triage) that works with the existing `system_errors` table and provides tools for debugging.

## Dashboard Sections (Tabbed Layout)

### Tab 1: Log Triage
- **Log Viewer**: Fetches from `system_errors` table with filters (severity, component, date range, keyword search)
- **Log Details**: Click a row to expand full stack trace, metadata, browser/device info
- **Bulk Actions**: Resolve selected, export filtered logs as JSON
- **Stats Bar**: Total errors, critical count, unresolved count, error rate trend

### Tab 2: Test Debugger
- **Vitest Command Reference**: Interactive cards showing commands (`npx vitest --reporter=verbose`, `--includeTaskLocation`, `DEBUG=vite:*`, etc.) with copy-to-clipboard
- **Test Results Viewer**: Paste test output into a textarea, parser highlights PASS/FAIL with color coding and groups by suite
- **Visual Debug Guide**: Instructions for setting up `vitest-preview` with code snippets

### Tab 3: Error Capture
- **Frontend Error Monitor**: Displays runtime errors caught by `window.addEventListener('error')` and `unhandledrejection` — stored in a Zustand store (session-only, no DB)
- **Live Error Feed**: Real-time list of captured errors with stack traces, timestamps, and source locations
- **Error Statistics**: Pie chart of error types, timeline of error frequency

### Tab 4: Triage Tickets
- **Create Ticket**: Form to create a triage ticket from any log entry (title, severity, description, assigned component)
- **Ticket List**: Table of open tickets with status (open/investigating/resolved), stored in `localStorage` for simplicity (no new DB table needed)
- **Ticket Detail**: View with linked log entries and notes

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/admin/AdminLogsTriage.tsx` | Main page with tab navigation |
| `src/components/admin/logs-triage/LogViewer.tsx` | Log table with filters, pulls from `system_errors` |
| `src/components/admin/logs-triage/LogDetailPanel.tsx` | Expandable log detail view |
| `src/components/admin/logs-triage/TestDebugger.tsx` | Vitest command cards + output parser |
| `src/components/admin/logs-triage/ErrorCapture.tsx` | Runtime error monitor with live feed |
| `src/components/admin/logs-triage/TriageTickets.tsx` | localStorage-based ticket management |
| `src/components/admin/logs-triage/LogStatsBar.tsx` | KPI cards for log statistics |
| `src/hooks/useLogsTriage.ts` | Hook for fetching/filtering system_errors |
| `src/hooks/useErrorCapture.ts` | Hook that sets up window error listeners, stores in state |
| `src/stores/triageTicketStore.ts` | Zustand store for tickets (localStorage persist) |

## Files to Modify

| File | Change |
|------|--------|
| `src/routes/index.tsx` | Add lazy import + route for `logs-triage` |
| `src/pages/admin/AdminLayout.tsx` | Add nav link with `Bug` icon |

## Technical Details

- **Log Viewer** reuses the existing `system_errors` Supabase table and query patterns from `useSystemMonitoring.ts`
- **Error Capture** hook installs `window.addEventListener('error')` and `window.addEventListener('unhandledrejection')` on mount, stores errors in component state (no DB writes)
- **Triage Tickets** use Zustand with `persist` middleware targeting `localStorage` — no new database tables
- **Test Debugger** is a reference/tool panel (static content + clipboard utilities), not a test runner

