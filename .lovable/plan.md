

## Plan: Admin Test Results Dashboard Page

### What We'll Build

A dedicated **Test Results** page at `/admin/test-results` that serves as the central hub for viewing all test results (E2E, accessibility, etc.). It reuses the existing `TestResultsDashboard` component and adds clear instructions for running tests and importing results.

### Changes

**1. New page: `src/pages/admin/AdminTestResults.tsx`**

A full admin page wrapping `TestResultsDashboard` with:
- Page header with title and description
- A "How to Run Tests" card with copy-paste commands:
  - `npx playwright test` — all tests
  - `npx playwright test accessibility` — accessibility only
  - `npx playwright test --reporter=json > results.json` — generate importable JSON
- The existing `TestResultsDashboard` component (import panel, summary cards, charts, results table, failed tests detail, run history)

**2. Add route: `src/routes/index.tsx`**

- Add lazy import for `AdminTestResults`
- Add child route `{ path: 'test-results', element: <AdminTestResultsLazy /> }` under the admin layout

**3. Add sidebar link: `src/components/admin/AdminSidebar.tsx`**

- Add a "Test Results" item under the **Monitoring** group with a `FlaskConical` or `TestTube2` icon, linking to `/admin/test-results`

### Files

| File | Action |
|------|--------|
| `src/pages/admin/AdminTestResults.tsx` | Create |
| `src/routes/index.tsx` | Add lazy import + route |
| `src/components/admin/AdminSidebar.tsx` | Add nav item |

