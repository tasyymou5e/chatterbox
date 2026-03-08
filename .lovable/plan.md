

## Plan: Assessment History on Parent Dashboard + Auto-redirect After Test

### What Changes

1. **Assessment page: redirect to parent dashboard after completion**
   - In `src/pages/Assessment.tsx`, after the results view shows briefly or after user clicks a "Back to Dashboard" button, navigate to `/parent/dashboard`.
   - Add a "Return to Dashboard" button on the results view alongside the PDF export.

2. **New component: `AssessmentHistoryCard`**
   - Create `src/components/parent/AssessmentHistoryCard.tsx`
   - Fetches `assessment_results` from Supabase where `user_id` matches the logged-in user
   - Displays a card on the parent dashboard showing:
     - List of completed assessments (assessment type, subject name, overall grade, date)
     - Badge for grade with color coding
     - "Take New Assessment" button linking to `/assessment`
     - "View Details" per result (could expand inline or navigate to assessment page)

3. **Parent Dashboard integration**
   - Import and render `AssessmentHistoryCard` in `src/pages/ParentDashboard.tsx`
   - Place it after the grid of action cards, before the Daily Plan widget (around line 584)

### Technical Details

- Query: `supabase.from('assessment_results').select('id, assessment_type, subject_name, overall_grade, created_at, scores').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)`
- No new database tables needed — `assessment_results` already has all required fields
- No schema changes required
- The component uses existing RLS policies on `assessment_results` (user can read own rows)

