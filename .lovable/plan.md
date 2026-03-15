

# Phase 4-5: Parent Plan Review & Kids Plan-First Portal

## Current State

- **SkillPlanManager** has child selector + approve/reject but NO catalog browser to edit plan items
- **SkillPlanDashboard** queries `user_daily_plans` table (wrong) instead of `skill_plan_schedules.plan_items` (the approved plan)
- **KidsPortal** already gates behind `KidsAssessmentGate` and shows `SkillPlanDashboard` as primary, but the dashboard has no data because it reads from the wrong table
- **manage-skill-plan** edge function already has `get_child_approved_plan` action

## Changes

### 1. SkillPlanManager -- Add catalog browser & item editing

Enhance `PlanCard` in `src/components/parent/SkillPlanManager.tsx`:
- Add "Edit Items" toggle that reveals catalog browser
- Catalog browser: load items via `manage-skill-plan` `get_catalog` action, filter by domain/type
- Allow adding catalog items to plan, removing items, reordering (move up/down buttons)
- Save edited items via `updatePlan` with modified `plan_items` array
- Show child's assessment results summary alongside the plan (query `assessment_results` for selected child)

### 2. SkillPlanDashboard -- Load from approved skill_plan_schedules

Rewrite `src/components/kids/SkillPlanDashboard.tsx` data loading:
- Instead of querying `user_daily_plans`, call `manage-skill-plan` with `get_child_approved_plan` action
- Map `plan_items` (JSONB array from the schedule) into the dashboard card list
- Track completion state locally + in `plan_session_logs` table
- Resume from last incomplete item by querying `plan_session_logs` for `completion_status != 'completed'`

### 3. KidsPortal -- Plan-only primary view

Simplify `src/pages/kids/KidsPortal.tsx`:
- Remove games content grid from the main view (keep it accessible via tab/menu only)
- Make `SkillPlanDashboard` the full primary view when an approved plan exists
- Keep chores in the tab menu as secondary content

### 4. useSkillPlanManager hook -- Add catalog fetch for editing

Already has `fetchCatalog` method. No changes needed to the hook.

## Files Modified
- `src/components/parent/SkillPlanManager.tsx` -- catalog browser, item editing, assessment summary
- `src/components/kids/SkillPlanDashboard.tsx` -- load from `skill_plan_schedules` instead of `user_daily_plans`
- `src/pages/kids/KidsPortal.tsx` -- minor: plan-first layout adjustment

## No database or edge function changes needed
All required actions (`get_child_approved_plan`, `get_catalog`, `update`) already exist in `manage-skill-plan`.

