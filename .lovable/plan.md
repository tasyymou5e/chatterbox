

# Autism Skills Catalog & Adaptive Plan System

## Overview

Build a comprehensive 40-item autism skills catalog tied to assessment results (ATEC, DSM-5), with parent/counselor approval workflows, daily/weekly/monthly scheduling, kid-facing execution with AI-powered pause/resume, and progress reporting.

## Existing Infrastructure

- **`life_skill_catalog`** table already exists with category, difficulty, age_group, tags, instructions, duration
- **`user_daily_plans` + `user_daily_plan_items`** already exist with AI reasoning and assessment snapshots
- **`generate-daily-plan`** edge function already reads assessment results and picks catalog items via Lovable AI
- **`assessment_results`** stores ATEC, DSM-5 Spek, and DSM-5-TR scores
- Kids portal, embedded game viewer, and parent assignment dialog all exist

## Phase 1: Database Schema Changes

### 1a. Extend `life_skill_catalog` table
Add columns to map items to autism skill domains:
- `skill_domain` (text) — e.g., "communication", "social", "sensory", "executive_function", "daily_living", "emotional_regulation", "motor_skills", "academic"
- `autism_skill_tags` (text[]) — specific skills targeted (e.g., "turn-taking", "eye-contact", "self-regulation")
- `clinical_reference` (text) — industry guideline reference (ABA, TEACCH, etc.)
- `step_by_step_instructions` (jsonb) — structured steps for the activity
- `pause_checkpoint_enabled` (boolean default true) — whether AI can pause/resume
- `max_duration_minutes` (integer) — hard cap for session length
- `item_type` (text default 'chore') — 'chore', 'game', 'study', 'activity'

### 1b. New `skill_plan_schedules` table
For weekly/monthly/daily plan templates with approval workflow:
```
id, child_id, family_id, created_by, approved_by, 
schedule_type ('daily'|'weekly'|'monthly'),
plan_name, plan_items (jsonb - array of catalog_item_ids with order/day mapping),
status ('draft'|'pending_approval'|'approved'|'active'|'archived'),
approval_notes, approved_at,
start_date, end_date,
assessment_basis_id (FK to assessment_results),
created_at, updated_at
```

### 1c. New `plan_session_logs` table
For tracking individual item execution with AI pause/resume:
```
id, child_id, plan_item_id (FK user_daily_plan_items),
catalog_item_id (FK life_skill_catalog),
started_at, paused_at, resumed_at, completed_at,
current_step (integer), total_steps (integer),
pause_reason ('timeout'|'break'|'child_request'|'ai_suggestion'),
ai_observations (text), duration_seconds (integer),
completion_status ('in_progress'|'paused'|'completed'|'skipped'),
score (integer), created_at
```

### 1d. RLS Policies
- Parents/counselors can read/write schedules for their family's children
- Children can read their own schedules and update session logs
- Use existing `has_role` pattern for counselor/therapist access

## Phase 2: Seed 40 Catalog Items

Insert 40 items into `life_skill_catalog` across 8 skill domains, mapped to assessment deficit areas:

| Domain | Items | Examples |
|--------|-------|---------|
| Communication (5) | Chores + Games | "Picture Exchange Practice", "Story Sequencing Game", "Request Board Activity" |
| Social Skills (5) | Games + Activities | "Turn-Taking Card Game", "Emotion Charades", "Greeting Practice" |
| Sensory Regulation (5) | Activities | "Sensory Bin Exploration", "Deep Pressure Activity", "Calm Down Corner Routine" |
| Executive Function (5) | Chores + Study | "Visual Schedule Builder", "Timer Challenge", "Task Breakdown Practice" |
| Daily Living (5) | Chores | "Brushing Teeth Steps", "Getting Dressed Sequence", "Table Setting Task" |
| Emotional Regulation (5) | Activities + Games | "Feelings Thermometer", "Breathing Exercise Game", "Zones of Regulation Check" |
| Motor Skills (5) | Activities | "Cutting Practice", "Lacing Cards", "Ball Toss Counting" |
| Academic Readiness (5) | Study + Games | "Letter Tracing", "Number Matching", "Color Sorting", "Pattern Recognition" |

Each item includes: step-by-step instructions (JSONB), clinical reference (ABA/TEACCH/ESDM), age group, difficulty, duration, and mapped autism_skill_tags.

## Phase 3: Enhanced Plan Generation Edge Function

### 3a. Update `generate-daily-plan` 
- Accept `schedule_type` parameter (daily/weekly/monthly)
- Map assessment scores to skill domains: ATEC Speech → Communication, ATEC Sociability → Social Skills, DSM-5 criteria → specific domains
- Weight catalog item selection by assessment deficit severity
- For weekly plans: distribute items across 7 days with variety
- For monthly plans: create progressive difficulty ramp

### 3b. New `manage-skill-plan` edge function
- CRUD for `skill_plan_schedules`
- Parent/counselor approval workflow (draft → pending → approved → active)
- Allow editing: swap items, reorder, adjust difficulty
- Validate all catalog_item_ids exist and are active

### 3c. New `ai-session-helper` edge function
- Called during kid activity execution
- Monitors elapsed time vs estimated duration
- Suggests pause after exceeding 120% of estimated time
- Generates encouraging resume message after break
- Tracks current step progress for resume capability

## Phase 4: Parent/Counselor Approval UI

### 4a. `SkillPlanManager` component (parent portal)
- View child's assessment-derived skill plan recommendations
- Tabbed view: Daily | Weekly | Monthly plans
- Each plan shows items with skill domain badges, duration, difficulty
- Approve/reject/edit controls per plan
- Drag-and-drop reordering of items
- Add custom items from catalog browser
- Counselor role gets same access via family connection

### 4b. `PlanApprovalQueue` component
- List of pending plans awaiting approval
- Side-by-side: AI recommendation vs assessment scores
- Inline editing: swap items, change order, add notes
- Bulk approve/reject

### 4c. `SkillPlanReports` component
- Daily completion rates, streaks
- Skill domain progress radar chart
- Time-on-task analytics
- Weekly/monthly trend lines
- Export to PDF (extend existing jsPDF infrastructure)

## Phase 5: Kids Portal Integration

### 5a. `SkillPlanDashboard` component (kids portal)
- Today's plan with visual step-by-step cards
- Large touch targets, sensory-friendly colors (existing pattern)
- Progress bar showing completed/remaining items
- Star/moon rewards on completion (existing reward system)

### 5b. `ActivityExecutor` component
- Step-by-step guided view for each catalog item
- Visual timer with progress ring
- AI pause detection: if child exceeds time threshold, mascot suggests break
- "Take a Break" button with countdown timer
- Resume picks up at exact step where paused
- Completion celebration via existing MascotGuide

### 5c. Integration with existing `EmbeddedGameViewer`
- Game-type catalog items launch through existing viewer
- Chore/study items use new ActivityExecutor
- Session logging happens automatically in background

## Phase 6: Tracking & Reporting

- Real-time session logging to `plan_session_logs`
- Daily summary auto-generated via existing daily plan infrastructure
- Parent dashboard widget showing today's progress
- Weekly email digest (extend existing Resend integration)

## Technical Notes

- All 40 catalog items seeded via database insert tool (not migration)
- New tables created via migration tool with RLS
- Edge functions follow existing `defense-in-depth` JWT pattern
- AI calls use Lovable AI Gateway with `google/gemini-3-flash-preview`
- Session state managed via Zustand store (existing pattern)
- Clinical references follow ABA (Applied Behavior Analysis), TEACCH, and ESDM (Early Start Denver Model) frameworks

## Implementation Order

1. DB migrations (new columns + new tables + RLS)
2. Seed 40 catalog items
3. `manage-skill-plan` edge function
4. Update `generate-daily-plan` for weekly/monthly
5. `ai-session-helper` edge function
6. Parent `SkillPlanManager` + approval UI
7. Kids `ActivityExecutor` + plan dashboard
8. Reporting components
9. Integration testing

