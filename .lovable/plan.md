

## Fix: Assessment Post-Completion Navigation

### Problem
The "Return to Dashboard" button exists at the top of the results view but:
1. On page refresh, state resets to 'select' (no persistence)
2. There's no prominent "Go Home" button at the **bottom** of the results after the user has scrolled through everything and downloaded the PDF

### Changes

**`src/pages/Assessment.tsx`**
- Add a prominent "Return to Parent Dashboard" button at the **bottom** of the results view (after `AssessmentResults` component), so after scrolling through results and downloading the PDF, the user sees a clear call-to-action
- Make it a full-width primary button so it's unmissable
- Also add a "Home" icon for clarity

**`src/components/assessment/AssessmentResults.tsx`**
- No changes needed — the bottom button goes in the parent page

### Implementation Detail

After the `<AssessmentResults>` block (line ~213), add:

```tsx
<div className="flex flex-col items-center gap-3 pt-4 border-t border-border">
  <p className="text-sm text-muted-foreground">Assessment complete — your results have been saved.</p>
  <Button size="lg" className="w-full" onClick={() => navigate('/parent/dashboard')}>
    <Home className="w-4 h-4 mr-2" />
    Return to Parent Dashboard
  </Button>
</div>
```

This adds a clear, prominent button at the bottom of results that takes the user back to the dashboard where the `AssessmentHistoryCard` will show the test they just took.

