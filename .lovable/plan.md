

## Fix: Assessment History Not Visible on Parent Dashboard

### Root Cause Analysis

The `AssessmentHistoryCard` component is rendered at line 588 of `ParentDashboard.tsx`, but two issues likely prevent it from being seen:

1. **Silent query failure** — The Supabase query in `AssessmentHistoryCard` does not capture or log errors. If the query errors out, `data` is `null`, `results` stays empty, and the card shows "No assessments taken yet" — which the user may interpret as the section not existing.

2. **Position below the fold** — The card sits after 5 grid cards and a full grid layout, requiring significant scrolling. It's easy to miss.

### Changes

**1. `src/components/parent/AssessmentHistoryCard.tsx`**
- Add error handling to the Supabase query (capture `error`, log it, show user-facing message)
- Add console logging for debugging

**2. `src/pages/ParentDashboard.tsx`**
- Move the `AssessmentHistoryCard` higher — place it directly after the page heading (before the grid of action cards) so it's immediately visible when the user lands on the dashboard
- This ensures the assessment history is the first thing parents see after the title

### Implementation Detail

Move lines 586-589 (`AssessmentHistoryCard` wrapper) to just after line 426 (after the heading), before the grid of action cards. Add error capture in the component's fetch logic:

```typescript
const { data, error } = await supabase
  .from('assessment_results')
  .select('id, assessment_type, subject_name, overall_grade, created_at, scores, ai_review')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(10);

if (error) {
  console.error('Failed to fetch assessment results:', error);
}
if (data) setResults(data as unknown as AssessmentResult[]);
```

