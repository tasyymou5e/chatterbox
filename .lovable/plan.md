

# Integrate ConnectSphere Features into Kids Portal & Skill Catalog

## Summary

The uploaded PDF describes "ConnectSphere" — a research-backed autism early intervention app with child-facing learning modules, an AAC chat bar, daily visual routines, and parent progress dashboards. Many features already exist in Chatterbox (SkillQuest games, skill plans, assessments, chore system). This plan covers integrating the **missing** ConnectSphere concepts into the Kids Portal and Skill Catalog.

## What Already Exists (No Changes Needed)

- SkillQuest game system (80+ variants across 12 domains)
- Skill plan dashboard with parent approval workflow
- Assessment pipeline (ATEC, DSM-5)
- Chore system with visual schedules
- Adaptive difficulty engine
- Parent progress reports & dashboards
- Mascot guide system
- Calm-down / emotional regulation games

## What's New from ConnectSphere to Integrate

### 1. Quick Needs Chat Bar (Bottom Persistent Bar)
**From PDF**: Always-visible bottom bar with one-tap buttons: Help, Hungry, Thirsty, Potty, All Done — with text-to-speech output.

**Implementation**:
- Create `src/components/kids/QuickNeedsChatBar.tsx` — a fixed bottom bar with large touch-target buttons (emoji + label)
- Each button triggers `speechSynthesis.speak()` with the phrase
- Render inside `KidsPortalLayout` as a persistent element above the tab bar
- Customizable buttons stored in child profile preferences

### 2. Favorite Things Sidebar (Right-Side Panel)
**From PDF**: Persistent right panel with quick-access icons for learning modules (ABC, 123, Colors, My Family, etc.)

**Implementation**:
- Create `src/components/kids/FavoriteThingsSidebar.tsx` — collapsible right panel showing favorited catalog items and core learning categories
- Pull favorites from `content_favorites` table + child's top-played items
- Each item launches directly into `ActivityExecutor` or `SkillMatchGame`
- Responsive: drawer on mobile, sidebar on desktop

### 3. Visual Daily Routine View
**From PDF**: "What I Do Now!" sequential routine with checkable steps (Eat Breakfast → Brush Teeth → Get Dressed)

**Implementation**:
- Create `src/components/kids/DailyRoutineTimeline.tsx` — visual step-by-step routine display
- Data source: existing chore assignments for the day, ordered by time
- Each step shows an emoji, title, and tap-to-complete interaction
- Sub-steps expand (e.g., Potty → Pull Down Pants, Use Toilet, Wipe, Flush, Wash Hands)
- Integrate into `SkillPlanDashboard` as a "My Routine" section above the skill plan

### 4. New Skill Catalog Items (life_skill_catalog inserts)
**From PDF**: Foundational learning modules not fully covered in current catalog.

Add these items via the `manage-skill-plan` edge function or direct DB seed:

| Title | Domain | Type | Description |
|-------|--------|------|-------------|
| ABC Alphabet Explorer | academic | game | Letter recognition and phonics |
| 123 Number Fun | academic | game | Counting and number identification |
| Colors & Shapes Match | academic | game | Color/shape recognition and matching |
| My Family Faces | social | activity | Identify and name family members |
| Feelings Identification | emotional_regulation | game | Basic feelings recognition with photos |
| Object & People ID | communication | activity | Connect names to faces and objects |
| Morning Sing-Along | sensory | activity | Musical routine for morning transition |
| Potty Training Steps | daily_living | activity | Step-by-step toilet routine with visuals |
| Getting Dressed Sequence | daily_living | activity | Sequential dressing with visual cues |
| Sharing & Taking Turns | social | game | Turn-taking social story interactive |

**Implementation**:
- Create a seed script in the `manage-skill-plan` edge function with a `seed_connectsphere` action
- Each item includes `autism_skill_tags`, `clinical_reference` (NDBI/ESDM), `step_by_step_instructions`
- Map to existing game mechanics (match, sort, sequence) where applicable

### 5. New SkillQuest Game Variants (skillGameData.ts)
Add game variants for the new ConnectSphere concepts:

- `academic` domain: `acad-abc-explorer`, `acad-number-fun`, `acad-colors-shapes`
- `social` domain: `soc-my-family`, `soc-sharing-turns`
- `communication` domain: `comm-object-id`, `comm-needs-express`

Each variant uses existing game engine (match/sort/sequence) with new symbol sets.

### 6. Real World Missions Section
**From PDF**: Parent-child activities that bridge digital skills to real life.

**Implementation**:
- Create `src/components/kids/RealWorldMissions.tsx` — card-based list of suggested offline activities
- Generated from completed skill plan items (e.g., finished "Sharing" game → mission: "Share a toy with a sibling today")
- Parent can check off completion via parent portal
- Add `real_world_missions` column (JSONB) to `plan_session_logs` or create lightweight table

### 7. Architecture Ebook Update
- Add ConnectSphere research findings as a new section in Chapter 10 (or new Chapter 17)
- Document the NDBI/PMI research basis and how each feature aligns
- Update catalog tables with the new items

## Technical Approach

```text
Kids Portal Layout (updated)
├── KidsProgressHeader
├── DailyRoutineTimeline ← NEW (chores as visual routine)
├── SkillPlanDashboard (existing)
├── RealWorldMissions ← NEW (post-activity suggestions)
├── SkillGamesBrowser (existing, + new variants)
├── FavoriteThingsSidebar ← NEW (right panel)
└── QuickNeedsChatBar ← NEW (fixed bottom bar)
```

## Files to Create
- `src/components/kids/QuickNeedsChatBar.tsx`
- `src/components/kids/FavoriteThingsSidebar.tsx`
- `src/components/kids/DailyRoutineTimeline.tsx`
- `src/components/kids/RealWorldMissions.tsx`

## Files to Modify
- `src/components/kids/KidsPortalLayout.tsx` — add ChatBar + Sidebar slots
- `src/pages/kids/KidsPortal.tsx` — wire new components
- `src/components/games/shared/skillGameData.ts` — add new academic/social variants + symbols
- `src/components/kids/SkillPlanDashboard.tsx` — integrate routine timeline
- `ARCHITECTURE_EBOOK.md` + `AdminArchitectureEbook.tsx` — document ConnectSphere integration
- `src/types/skillPlan.ts` — add mission-related types if needed

## Implementation Order
1. QuickNeedsChatBar (high-impact, simple)
2. New catalog items + game variants (content expansion)
3. DailyRoutineTimeline (leverages existing chore data)
4. FavoriteThingsSidebar (personalization)
5. RealWorldMissions (parent-child bridge)
6. Documentation updates

