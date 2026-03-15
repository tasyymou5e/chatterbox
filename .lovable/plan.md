

# Fix: Kids Assessment Gate E2E Flow

## Issues Found

1. **Assessment results page navigates to `/parent` not `/kids`** -- After completing an assessment, the "Return to Dashboard" button (line 214, 233 of Assessment.tsx) always navigates to `/parent`. When a child takes the test via the gate, they need to return to `/kids` to continue the flow.

2. **`skill_plan_schedules.family_id` is NOT NULL but set to `null`** -- The `generate-daily-plan` edge function inserts `family_id: null` (line 272), but the column is `NOT NULL`. This will cause the insert to fail silently, meaning the parent approval flow never sees the plan.

3. **Assessment insert uses `.insert({...})` instead of `.insert([{...}])`** -- Line 75 of Assessment.tsx casts to `any` to work around a type issue, but the actual call passes an object instead of an array. While Supabase accepts both, the `as any` cast plus the non-standard call pattern could mask errors.

4. **No "Return to Kids Portal" button after assessment** -- When `childId` query param is present (child flow), the results page should show a "Continue" button back to `/kids`, not `/parent`.

5. **`skill_plan_schedules` RLS blocks edge function insert** -- The INSERT policy requires `created_by = auth.uid()` and `has_family_access(family_id, auth.uid())`. But the edge function uses `adminClient` (service role), which bypasses RLS. However, `family_id` being null will still fail the NOT NULL constraint.

## Fixes

### Fix 1: Assessment.tsx -- Context-aware navigation
When `childIdParam` is present in the URL, show "Continue to My Portal" linking to `/kids` instead of "Return to Parent Dashboard" linking to `/parent`.

### Fix 2: generate-daily-plan -- Resolve family_id for the child
Before inserting into `skill_plan_schedules`, look up the child's `family_id` from `family_members` table:
```
SELECT family_id FROM family_members WHERE user_id = targetChildId LIMIT 1
```
Use this value instead of `null`.

### Fix 3: Assessment.tsx -- Fix insert call
Change the insert from `(supabase.from(...).insert as any)({...})` to a proper `.insert([{...}])` call with correct typing.

### Fix 4: KidsAssessmentGate -- Use React Router navigation
Change `window.location.href` to `useNavigate()` for SPA navigation, preserving React state. Add `returnTo=/kids` query param so Assessment.tsx knows where to go back.

## Files Changed
- `src/pages/Assessment.tsx` -- Add child-aware return navigation
- `supabase/functions/generate-daily-plan/index.ts` -- Look up family_id before inserting skill_plan_schedules
- `src/components/kids/KidsAssessmentGate.tsx` -- Minor: use navigate() instead of window.location.href

