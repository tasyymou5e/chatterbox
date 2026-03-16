# Assessment Pipeline — Architecture & Improvement Plan

> Covers the end-to-end flow from parent-initiated assessment through kid portal gating, skill plan generation, and daily activity execution.

---

## 1. Pipeline Overview (Mermaid)

See the rendered diagram in the Lovable chat. The textual flow is preserved here for offline reference.

```
Parent Portal (/parent)
  └─ AssessmentHistoryCard → "New Assessment" → /assessment?type=X
       └─ AssessmentForm (3 instruments: ATEC, DSM-5 Spek, DSM-5-TR)
            └─ computeScores() → assessment_results table
            └─ ai-assessment-review edge function → AI narrative review
            └─ AssessmentResults + PDF export

Kid Portal (/kids)
  └─ KidsAssessmentGate checks assessment_results for child_id
       ├─ Incomplete → Shows gate cards → navigates to /assessment?type=X&childId=Y
       ├─ All 3 complete, no plan → "Generate Plan" → generate-daily-plan edge fn
       │    └─ Creates skill_plan_schedules (status: pending_approval)
       └─ All 3 complete + approved plan → renders SkillPlanDashboard
            └─ ActivityExecutor → ai-session-helper → activity_session_logs

Parent Review
  └─ SkillPlanManager (on ParentDashboard)
       ├─ Views pending plans per child
       ├─ Approve / Reject / Edit items
       └─ manage-skill-plan edge function (CRUD + approval)
            └─ status: pending_approval → approved → active
```

---

## 2. Actors & Entry Points

| Actor | Entry Point | Route | Key Component |
|-------|------------|-------|---------------|
| Parent | Dashboard → Assessment nav | `/assessment` | `Assessment.tsx` |
| Parent | Dashboard → "New Assessment" button | `/assessment` | `AssessmentHistoryCard.tsx` |
| Child | Kids Portal (gated) | `/kids` → `/assessment?type=X&childId=Y` | `KidsAssessmentGate.tsx` |
| Parent | Skill Plan review | `/parent` (embedded) | `SkillPlanManager.tsx` |

---

## 3. Three Assessment Instruments

| ID | Name | Scoring | Questions |
|----|------|---------|-----------|
| `atec` | Autism Treatment Evaluation Checklist | Summation + grade ranges | ~77 across 4 categories |
| `dsm5_interview` | DSM-5 Semi-Structured Interview (Spek) | Criteria-met threshold | Diagnostic criteria-based |
| `dsm5tr_clinician` | DSM-5-TR Clinician Interview | Severity averaging | Clinician rating scales |

All defined in `src/data/assessmentInstruments.ts` (557 lines). Scoring in `src/utils/assessmentScoring.ts`.

---

## 4. Data Flow

### 4.1 Assessment Submission
```
User fills AssessmentForm
  → computeScores(instrument, answers) — client-side
  → INSERT assessment_results { user_id, child_id, assessment_type, scores, overall_grade }
  → INVOKE ai-assessment-review { scores, answers, categories }
  → UPDATE assessment_results.ai_review with AI narrative
```

### 4.2 Kid Portal Gate Check
```
KidsAssessmentGate mounts
  → SELECT assessment_results WHERE user_id = child OR child_id = child
  → Check all 3 types present
  → If missing: show gate UI with progress bar
  → If complete: check skill_plan_schedules WHERE child_id AND status IN (approved, active)
  → If no plan: show "Generate Plan" button
  → If plan exists: render SkillPlanDashboard
```

### 4.3 Plan Generation & Approval
```
Child clicks "Generate Plan"
  → INVOKE generate-daily-plan { child_id }
  → Creates skill_plan_schedules (status: pending_approval)
  → Parent sees in SkillPlanManager pending tab
  → Parent reviews items, edits, approves
  → INVOKE manage-skill-plan { action: approve, plan_id }
  → status → approved
  → Parent activates → status → active
  → Child sees SkillPlanDashboard with activity cards
```

---

## 5. Database Tables Involved

| Table | Role |
|-------|------|
| `assessment_results` | Stores answers, computed scores, AI review per child per instrument |
| `skill_plan_schedules` | Stores generated/approved/active plans with plan_items JSON |
| `life_skill_catalog` | Catalog of activities/skills available for plans |
| `activity_session_logs` | Tracks child session execution (start, pause, resume, complete) |

---

## 6. Edge Functions

| Function | Auth | Purpose |
|----------|------|---------|
| `ai-assessment-review` | JWT | Generates AI narrative review of assessment scores |
| `generate-daily-plan` | JWT | Creates a skill plan from assessment results + catalog |
| `manage-skill-plan` | JWT (manual verify) | CRUD, approval, rejection, activation of plans |
| `ai-session-helper` | JWT | Manages activity session lifecycle |

---

## 7. Current Pain Points & Gaps

### 7.1 UX Flow Issues
- **No parent-initiated assessment for child**: Parent can only take assessment as themselves or child navigates to it via gate. No "assign assessment to child" workflow from parent dashboard.
- **Assessment page lacked ParentNavigation**: Fixed (now has uniform parent portal header).
- **No re-assessment flow**: No clear path to retake an assessment (previous results aren't versioned or compared on the gate).
- **Gate is binary**: Once 3 assessments exist, gate opens permanently. No periodic re-evaluation trigger.

### 7.2 Data Integrity
- **Dual ID query**: `KidsAssessmentGate` queries `user_id.eq.${child} OR child_id.eq.${child}` — works but fragile. A parent taking their own assessment could accidentally satisfy a child's gate if IDs overlap in edge cases.
- **No assessment expiry**: Old assessments are valid forever. No mechanism to flag stale results.
- **child_id nullable**: `assessment_results.child_id` is nullable, making some queries unreliable.

### 7.3 Plan Pipeline
- **Generate → Pending → Approve → Active** is 4 steps but the child just sees "waiting". No notification when plan is approved.
- **No plan editing by parent before approval**: Parent can approve/reject but editing items mid-approval is limited.
- **Single plan assumption**: Gate checks for ANY approved/active plan. Doesn't handle plan rotation or multiple concurrent plans well.

### 7.4 Missing Features
- [ ] Parent notification when child completes all 3 assessments
- [ ] Child notification when plan is approved
- [ ] Assessment comparison over time (trend data exists in `AssessmentTrendChart` but isn't linked to the gate flow)
- [ ] Scheduled re-assessment reminders
- [ ] Assessment delegation (therapist/counselor role)

---

## 8. Improvement Roadmap

### Phase 1: Flow Polish (Quick Wins)
1. **Parent-to-child assessment assignment**: Add "Assign Assessment" button on ParentDashboard that creates a pending assessment task visible in the child's gate
2. **Assessment freshness indicator**: Show age of last assessment on gate cards; flag if >90 days old
3. **Toast/notification on plan approval**: Real-time subscription or polling in `KidsAssessmentGate`

### Phase 2: Data Hardening
4. **Enforce child_id NOT NULL** on new assessment submissions
5. **Assessment versioning**: Track assessment_number per (child_id, assessment_type) for trend comparison
6. **Add assessment_expiry_days config** to gate logic (default 180 days)

### Phase 3: Advanced Workflows
7. **Multi-child assessment dashboard**: Parent sees all children's assessment status in one view
8. **Re-assessment scheduling**: Cron-triggered reminders via edge function
9. **Therapist/counselor role**: Third-party can administer assessments and review plans
10. **Plan templates**: Pre-built plans based on assessment severity levels

---

## 9. File Reference

| File | Purpose |
|------|---------|
| `src/pages/Assessment.tsx` | Main assessment page (instrument select → form → results) |
| `src/data/assessmentInstruments.ts` | All 3 instrument definitions (questions, options, scoring rules) |
| `src/utils/assessmentScoring.ts` | Score computation logic (sum, criteria_met, severity_average) |
| `src/utils/assessmentPdfGenerator.ts` | PDF report generation |
| `src/components/assessment/AssessmentForm.tsx` | Multi-section questionnaire UI |
| `src/components/assessment/AssessmentResults.tsx` | Score display with AI review |
| `src/components/assessment/AssessmentPDFExport.tsx` | Download button + PDF gen |
| `src/components/kids/KidsAssessmentGate.tsx` | Portal gate checking 3 assessments + plan |
| `src/components/kids/SkillPlanDashboard.tsx` | Child's daily activity view |
| `src/components/kids/ActivityExecutor.tsx` | Step-by-step activity runner |
| `src/components/parent/SkillPlanManager.tsx` | Parent plan review/approve UI |
| `src/components/parent/AssessmentHistoryCard.tsx` | Parent dashboard assessment history |
| `src/components/parent/AssessmentTrendChart.tsx` | Assessment score trends over time |
| `src/components/parent/AssessmentResultDetail.tsx` | Expandable result detail view |
| `src/components/parent/SkillPlanReports.tsx` | Session/progress reports per child |
| `src/hooks/useSkillPlanManager.ts` | Hook wrapping manage-skill-plan edge function |
| `src/types/skillPlan.ts` | TypeScript types for plans, catalog, sessions |

---

*Last updated: 2026-03-16*
