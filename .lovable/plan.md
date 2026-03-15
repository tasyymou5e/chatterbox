

# Autism Program Site Flow -- Gap Analysis & Implementation Plan

## Current State Issues

After reviewing the codebase, the described flow has several critical disconnects:

### Problem 1: Assessments not linked to children
`assessment_results` stores `user_id = auth.uid()` (the person taking the test). There is no `child_id` column, so when a parent takes a test for child A vs child B, they're all lumped under the parent's user ID with only a free-text `subject_name` to distinguish them.

### Problem 2: Kids portal doesn't gate on assessments
Kids login goes straight to games/content grid. There's no check for "has this child completed the 3 assessments?" and no onboarding flow to take them.

### Problem 3: Plan generation is user-centric, not child-centric
`generate-daily-plan` creates plans under `user.id` (whoever calls it). If a parent generates for child A, it saves under the parent's ID. The kid's `SkillPlanDashboard` then queries `user_daily_plans` for the kid's ID and finds nothing.

### Problem 4: No parent approval gate before kid sees plan
`SkillPlanManager` exists but is disconnected from the kid's view. There's no check in the kids portal for "does this child have an approved plan?"

### Problem 5: No idle timeout or session resume
No 30-minute inactivity detection. `ActivityExecutor` has pause/resume but only via manual button press.

### Problem 6: No daily progress reporting to parents
`plan_session_logs` table exists but nothing aggregates it into a parent-visible daily report.

---

## Implementation Plan

### Phase 1: Database -- Link assessments to children

Add `child_id` column to `assessment_results` table (nullable for backward compat). Add RLS policy so parents can view their children's assessments. Update `Assessment.tsx` to accept a `childId` query param and store it.

### Phase 2: Kid assessment onboarding flow

Create `KidsAssessmentGate` component that wraps the kids portal:
- On login, check if child has completed all 3 assessments (ATEC, DSM-5 Interview, DSM-5-TR)
- If not, show a kid-friendly assessment selector (large cards, simple language)
- Reuse existing `AssessmentForm` but wrapped in kid-friendly UI
- After all 3 complete, auto-trigger plan generation via `generate-daily-plan`
- Store results with `child_id = user.id` (since the kid is logged in)

### Phase 3: Fix plan generation to be child-centric

Update `generate-daily-plan` edge function:
- Accept `child_id` parameter
- When called by a kid, use their own ID; when called by parent, use provided `child_id`
- Query `assessment_results` by `child_id` instead of `user_id`
- Save `skill_plan_schedules` with `child_id` and status `pending_approval`
- Save `user_daily_plans` linked to the child

### Phase 4: Parent per-child plan review & editing

Update `SkillPlanManager`:
- Add child selector dropdown (from family members)
- Show plans filtered by selected child
- Show assessment results that generated the plan alongside it
- Allow drag-reorder, add/remove catalog items, edit notes
- Approve/reject per plan
- On approve, set `skill_plan_schedules.status = 'approved'`

### Phase 5: Kid portal = approved plan

Restructure `KidsPortal.tsx`:
- Check for approved `skill_plan_schedules` for this child
- If approved plan exists, show `SkillPlanDashboard` as the primary view (not games grid)
- Keep chores section in side menu
- Plan items are the kid's daily activities
- Resume from last incomplete item (query `plan_session_logs` for `completion_status = 'in_progress'`)

### Phase 6: Idle timeout & auto-pause

Add `useIdleDetector` hook:
- Track mouse/keyboard/touch events
- After 30 minutes of inactivity, auto-pause current activity via `pauseSession('timeout')`
- Show "Welcome back!" screen on return with resume option
- Persist session state to `plan_session_logs` so logout/close also resumes

### Phase 7: Daily progress reporting

Create `DailyProgressReport` component for parent portal:
- Query `plan_session_logs` grouped by date and child
- Show: items completed, items skipped, time per item, total time on site
- Show in parent dashboard per-child
- Add to existing `SkillPlanReports` component

---

## Technical Details

### Database changes
```text
assessment_results
  + child_id uuid REFERENCES profiles(user_id) [nullable]
  + RLS: parents can SELECT where child_id in their family

skill_plan_schedules  (already exists)
  -- no schema change, just fix the flow

plan_session_logs  (already exists)
  -- no schema change
```

### New components
- `src/components/kids/KidsAssessmentGate.tsx` -- assessment onboarding
- `src/hooks/useIdleDetector.ts` -- 30-min idle timeout

### Modified components
- `src/pages/kids/KidsPortal.tsx` -- gate on assessments + show plan as primary
- `src/pages/Assessment.tsx` -- accept childId param
- `src/components/parent/SkillPlanManager.tsx` -- per-child selector + catalog editor
- `src/components/parent/SkillPlanReports.tsx` -- daily progress view
- `supabase/functions/generate-daily-plan/index.ts` -- child-centric queries
- `src/components/kids/SkillPlanDashboard.tsx` -- resume from last session

### Edge function changes
- `generate-daily-plan`: query assessments by child_id, save plan under child
- `manage-skill-plan`: add action to fetch child's approved plan
- `ai-session-helper`: handle idle-triggered pauses

### File count: ~8 files modified, ~2 new files created

