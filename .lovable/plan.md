

## Dynamic ASD Assessment Tool with AI-Powered Review and PDF Report

### Overview

Build a comprehensive, dynamic autism assessment feature based on three clinical instruments:
1. **ATEC** (Autism Treatment Evaluation Checklist) -- 4 subscales, 77 items, rating N/S/V or N/MI/MO/S
2. **DSM-5 Semi-Structured Interview** (Spek) -- 7 criteria across Groups A and B, plus severity levels
3. **DSM-5-TR Clinician Interview** -- 0-3 severity scale across categories A1-A3, B1-B4, plus additional features

The tool will be accessible to all authenticated users (parents, clinicians, admins) at `/assessment`.

### Architecture

```text
┌─────────────────────────────────────────────┐
│  /assessment  (AssessmentPage)              │
│  ┌─────────────────────────────────────┐    │
│  │ Assessment Selector (3 instruments) │    │
│  └──────────┬──────────────────────────┘    │
│             ▼                                │
│  ┌──────────────────────────────────────┐   │
│  │ Multi-step Questionnaire Form        │   │
│  │ (category tabs, progress bar)        │   │
│  └──────────┬───────────────────────────┘   │
│             ▼                                │
│  ┌──────────────────────────────────────┐   │
│  │ Submit → ai-assessment-review edge fn│   │
│  │ (sends answers to AI for analysis)   │   │
│  └──────────┬───────────────────────────┘   │
│             ▼                                │
│  ┌──────────────────────────────────────┐   │
│  │ Results Dashboard                    │   │
│  │ - Category scores + grades           │   │
│  │ - AI narrative per category          │   │
│  │ - Overall summary + severity level   │   │
│  │ - Download PDF button                │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Database

New table: `assessment_results`
- `id` (uuid, PK)
- `user_id` (uuid, references profiles)
- `assessment_type` (text: 'atec' | 'dsm5_interview' | 'dsm5tr_clinician')
- `subject_name` (text, name of person assessed)
- `answers` (jsonb, raw responses)
- `scores` (jsonb, computed category scores)
- `ai_review` (jsonb, AI-generated review per category)
- `overall_grade` (text)
- `created_at` (timestamptz)

RLS: users can only read/write their own results.

### Components

1. **`src/pages/Assessment.tsx`** -- Main page with instrument selector
2. **`src/components/assessment/AssessmentForm.tsx`** -- Dynamic multi-step form rendering questions from a config data file, grouped by category with a progress bar
3. **`src/components/assessment/AssessmentResults.tsx`** -- Results dashboard showing per-category scores, letter grades, AI narrative reviews, and severity indicators
4. **`src/components/assessment/AssessmentPDFExport.tsx`** -- PDF report generator using jsPDF (already installed)
5. **`src/data/assessmentInstruments.ts`** -- Static data file containing all questions for the 3 instruments, organized by category with scoring rules

### Scoring Logic (client-side)

- **ATEC**: N=0, S=1, V=2 for Section I-III (lower=better); N=0, MI=1, MO=2, S=3 for Section IV. Category totals and grand total. Grades based on published ATEC ranges.
- **DSM-5 Interview**: Count criteria met (Yes/No) per group. A needs 3/3, B needs 2/4. Severity levels 1-3 for each group.
- **DSM-5-TR Clinician**: Average severity per subcategory (A1, A2, A3, B1-B4). Map averages to grades (0-0.5=None, 0.5-1.5=Low, 1.5-2.5=Moderate, 2.5-3=High).

### AI Review (edge function: `ai-assessment-review`)

- Receives: assessment type, category scores, raw answers
- Uses the existing `ai-chat` pattern with the configured AI provider
- System prompt instructs AI to provide a detailed, empathetic, professional review for each category and an overall summary
- Returns structured JSON with per-category narratives and an overall assessment
- Input validation: cap payload size, validate assessment type enum

### PDF Report

Uses jsPDF to generate a branded report including:
- Header with assessment name, date, subject info
- Per-category section with score, grade, and AI narrative
- Overall summary and severity level
- Disclaimer that this is not a clinical diagnosis

### Routing

Add `/assessment` to `featureRoutes` in `src/routes/index.tsx`.

### Steps

1. Create `assessment_results` table + RLS policies
2. Create `src/data/assessmentInstruments.ts` with all question data from the 3 PDFs
3. Build the assessment page, form, and results components
4. Create `ai-assessment-review` edge function
5. Build PDF export component
6. Add route to `/assessment`

