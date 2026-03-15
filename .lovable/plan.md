

# Phase 6-7: Idle Auto-Pause, Session Resume & Parent Progress Reporting

## Current State

- **useIdleDetector** exists and works, KidsPortal uses it but only shows a static "Welcome Back" screen and reloads the page -- it does NOT auto-pause the active activity session
- **ActivityExecutor** has manual pause/resume but no idle integration
- **SkillPlanDashboard** doesn't check for in-progress sessions on load (no resume capability)
- **DailyProgressReport** exists and works in ParentDashboard, but is NOT in ParentReports page
- **ai-session-helper** already handles `pause_session` with `pause_reason` and `resume_session`

## Changes

### 1. ActivityExecutor -- Idle auto-pause integration

Pass `isIdle` from KidsPortal down through SkillPlanDashboard to ActivityExecutor. When `isIdle` becomes true and a session is active (not already paused/completed), auto-call `pauseSession('idle_timeout')`. The existing paused UI already handles display.

Flow: `KidsPortal` detects idle → passes `isIdle` prop → `SkillPlanDashboard` forwards → `ActivityExecutor` triggers `pauseSession('idle_timeout')` via useEffect.

### 2. SkillPlanDashboard -- Resume from last in-progress session

On load, query `plan_session_logs` for `completion_status = 'in_progress'` or `'paused'` for the current user. If found, show a "Resume" banner at the top with the activity title and step info. Clicking resume opens `ActivityExecutor` with that session's catalog item pre-loaded.

### 3. KidsPortal -- Remove static idle screen, use prop-based approach

Instead of rendering the static "Welcome Back" full-screen overlay, pass `isIdle` as a prop to `SkillPlanDashboard`. Remove the idle return screen (the page reload approach loses state). The ActivityExecutor's pause UI becomes the natural idle handler.

When idle triggers outside of an active activity (just browsing the plan list), keep a simplified idle overlay but with `onReturn` callback that just resets idle state (no reload).

### 4. ParentReports -- Add Daily Progress tab

Add a third tab "Daily Progress" to the ParentReports page. Inside it, fetch child members (already done in `fetchStats`) and render `DailyProgressReport` for each child. Reuse the existing child member fetch logic.

## Files Modified

- `src/pages/kids/KidsPortal.tsx` -- pass `isIdle` to SkillPlanDashboard, simplify idle overlay
- `src/components/kids/SkillPlanDashboard.tsx` -- accept `isIdle` prop, add resume-session query, forward to ActivityExecutor
- `src/components/kids/ActivityExecutor.tsx` -- accept `isIdle` prop, auto-pause on idle via useEffect
- `src/pages/parent/ParentReports.tsx` -- add "Daily Progress" tab with DailyProgressReport per child

No database or edge function changes needed.

