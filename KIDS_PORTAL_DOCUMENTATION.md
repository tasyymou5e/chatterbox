# Kids Portal Documentation

**Unified Portal for Children's Learning, Games & Activities**

---

## Overview

The Kids Portal is a child-friendly interface that orchestrates assessment, skill-based learning plans, games, chores, and activities into a single, age-appropriate experience. It features autism-friendly design, idle detection, session resume, and AI-powered skill plan management.

**Route:** `/kids`  
**Target Users:** Child accounts  
**Status:** ✅ Complete (Phases 1-7, 2026-03-15)

---

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                       KidsPortal.tsx                           │
│  (Orchestrator: auth, idle detection, assessment gate)         │
└───────────────────────────────────────────────────────────────┘
        │                    │                     │
        ▼                    ▼                     ▼
┌────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│ KidsAssessment │  │ SkillPlan        │  │ useIdleDetector    │
│ Gate           │  │ Dashboard        │  │ (idle auto-pause)  │
└────────────────┘  └──────────────────┘  └────────────────────┘
        │                    │
        ▼                    ▼
┌────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│ Assessment     │  │ ActivityExecutor │  │ Session Resume     │
│ Form/Results   │  │ (step-by-step)   │  │ Banner             │
└────────────────┘  └──────────────────┘  └────────────────────┘
```

### Data Flow

```
Child login
    │
    ▼
KidsAssessmentGate ─── Has assessment? ─── No ──→ AssessmentForm
    │                                                    │
    Yes                                                  ▼
    │                                            AI generates plan
    ▼                                            (manage-skill-plan)
SkillPlanDashboard                                       │
    │                                                    ▼
    ├── Check plan_session_logs ──→ Resume banner (if in_progress/paused)
    │
    ├── Load daily activities from skill_plan catalog
    │
    └── Launch activity ──→ ActivityExecutor
                                │
                                ├── Step-by-step execution
                                ├── Pause/Resume (manual or idle)
                                ├── Progress tracking (ai-session-helper)
                                └── Completion → celebration
```

---

## Key Components

### KidsAssessmentGate (`src/components/kids/KidsAssessmentGate.tsx`)
**Purpose:** Blocks portal access until an initial assessment is completed.

- Checks `assessment_results` for the current child
- If no assessment: renders `AssessmentForm` full-screen
- On completion: AI generates a skill plan, portal unlocks

### SkillPlanDashboard (`src/components/kids/SkillPlanDashboard.tsx`)
**Purpose:** Main dashboard showing daily skill plan activities with session resume.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `isIdle` | `boolean` | Whether the user is idle (from useIdleDetector) |

**Features:**
- Queries `plan_session_logs` for in-progress/paused sessions on mount
- Shows "Resume" banner if an active session exists
- Displays daily activity cards from the skill plan catalog
- Launches `ActivityExecutor` for selected activities

### ActivityExecutor (`src/components/kids/ActivityExecutor.tsx`)
**Purpose:** Step-by-step activity runner with pause/resume, progress tracking, and celebrations.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `catalogItem` | `SkillPlanCatalogItem` | The activity to execute |
| `isIdle` | `boolean` | Auto-pauses session when true |
| `onComplete` | `() => void` | Called when activity finishes |
| `onClose` | `() => void` | Called when user exits |

**Features:**
- Multi-step activity execution with progress bar
- Manual + idle auto-pause via `useEffect` on `isIdle` prop
- Session tracking via `ai-session-helper` edge function
- Celebration animations on completion
- Star/moon progress rewards

### KidsPortalLayout (`src/components/kids/KidsPortalLayout.tsx`)
**Purpose:** Age-appropriate layout wrapper with colorful header, tabs, and navigation.

### KidsContentCard (`src/components/kids/KidsContentCard.tsx`)
**Purpose:** Unified content card for games, chores, and tasks.

### KidsGameLauncher (`src/components/kids/KidsGameLauncher.tsx`)
**Purpose:** Launches and manages embedded game sessions.

### KidsProgressHeader (`src/components/kids/KidsProgressHeader.tsx`)
**Purpose:** Progress bar with stars/moons counters.

### Mascot / MascotGuide (`src/components/kids/Mascot.tsx`, `MascotGuide.tsx`)
**Purpose:** Animated mascot providing encouragement and guidance.

---

## Hooks

| Hook | Purpose |
|------|---------|
| `useIdleDetector` | Detects user inactivity, returns `isIdle` boolean |
| `useActivitySession` | Manages session state with ai-session-helper |
| `useSkillPlanManager` | CRUD operations for skill plans |
| `useDailyPlan` | Fetches and manages daily plan activities |
| `useKidsContentLoader` | Loads content items for the portal |
| `useGameSession` | Tracks game session state |
| `useCelebration` | Triggers celebration animations |
| `useStarProgress` | Star/moon progress tracking |
| `useChildProfile` | Fetches child profile data |
| `useChildAvatar` | Manages child avatar |

---

## Edge Functions

| Function | Purpose |
|----------|---------|
| `ai-session-helper` | Start, pause, resume, complete activity sessions |
| `ai-assessment-review` | AI review of assessment results |
| `generate-daily-plan` | Generate daily activity plan from skill plan |
| `manage-skill-plan` | CRUD for skill plans, catalog items, session logs |

---

## Idle Detection & Auto-Pause

The idle detection system prevents children from leaving activities running unattended.

**Flow:**
1. `KidsPortal` instantiates `useIdleDetector` (configurable timeout)
2. `isIdle` prop flows: `KidsPortal` → `SkillPlanDashboard` → `ActivityExecutor`
3. `ActivityExecutor` has a `useEffect` that auto-pauses when `isIdle && session.active && !session.paused`
4. Calls `pauseSession('idle_timeout')` via ai-session-helper
5. On return, child sees the existing pause UI and can resume

**When idle outside of activities** (just browsing), a simplified overlay shows with a reset callback — no page reload, preserving state.

---

## Session Resume

On `SkillPlanDashboard` mount:
1. Queries `plan_session_logs` for `completion_status IN ('in_progress', 'paused')`
2. If found: displays a "Resume where you left off" banner with activity title
3. Clicking resume opens `ActivityExecutor` with the session's catalog item pre-loaded
4. `ActivityExecutor` calls `resumeSession()` to continue from the saved step

---

## Assessment Components

### AssessmentForm (`src/components/assessment/AssessmentForm.tsx`)
Multi-step assessment form with age-appropriate questions.

### AssessmentResults (`src/components/assessment/AssessmentResults.tsx`)
Displays assessment scores and AI-generated review.

### AssessmentPDFExport (`src/components/assessment/AssessmentPDFExport.tsx`)
Generates downloadable PDF of assessment results.

---

## Parent Integration

Parents interact with the Kids Portal system through:
- **ParentReports → "Daily Progress" tab**: `DailyProgressReport` per child
- **Skill plan review**: Parents can review/approve AI-generated plans
- **ParentDashboard**: Family overview with child progress summaries
