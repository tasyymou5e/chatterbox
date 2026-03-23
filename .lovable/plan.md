

# Skill-Based Interactive Game: "SkillQuest"

## Summary

Create a new interactive matching/sorting game component (`SkillMatchGame`) that dynamically adapts its visuals, symbols, and challenges based on the skill domain of the assigned catalog item. Parents assign it through the existing `SkillPlanManager` flow; kids play it from the `SkillPlanDashboard` via `ActivityExecutor` integration.

## Current Architecture

- **Skill catalog** (`life_skill_catalog` table) has 8 domains: Communication, Social, Sensory, Executive Function, Daily Living, Emotional Regulation, Motor Skills, Academic
- **ActivityExecutor** renders step-by-step text instructions for catalog items -- no interactive gameplay
- **Existing games** (MemoryMatch, PatternMatch, SoundsMatch) are standalone, not linked to skill domains
- **Assignment flow**: Parent uses `SkillPlanManager` to build plans with catalog items, approves them, kid sees them in `SkillPlanDashboard` and launches via `ActivityExecutor`

## What We Build

A single new game component that renders **different gameplay per skill domain**, using domain-specific graphics and challenges. It slots into the existing catalog item system so parents can assign it like any other activity.

### Game Mechanics Per Domain

| Domain | Game Type | Visual Theme |
|--------|-----------|-------------|
| Communication | Word-to-picture matching | Speech bubbles, icons |
| Social | Emotion recognition sorting | Face expressions |
| Sensory | Sensory category sorting | Texture/color cards |
| Executive Function | Sequence ordering | Numbered steps, arrows |
| Daily Living | Daily routine sorting | Household item icons |
| Emotional Regulation | Feelings thermometer matching | Emotion faces + intensity |
| Motor Skills | Drag-to-target tapping | Target circles, hand icons |
| Academic | Number/letter matching | Letters, numbers, shapes |

### Files to Create

1. **`src/components/games/SkillMatchGame.tsx`** -- Main game component
   - Takes `skillDomain` and `difficulty` as props
   - Renders domain-specific symbol sets and challenge types
   - Uses existing `GameWrapper` for consistent chrome (pause, timer, sound, close)
   - Tracks correct/incorrect answers, reports completion stats
   - Autism-friendly: large touch targets, high contrast, reduced motion support, celebration effects

2. **`src/components/games/shared/skillGameData.ts`** -- Domain-specific game content
   - Symbol sets per domain (emoji + label pairs)
   - Challenge generators per domain (match, sort, sequence)
   - Color palettes per domain (matching existing `SKILL_DOMAINS` colors)

### Files to Modify

3. **`src/components/kids/ActivityExecutor.tsx`**
   - Detect when a catalog item has `item_type === 'game'`
   - Instead of step-by-step text UI, render `SkillMatchGame` with the item's `skill_domain`
   - On game completion, call `completeSession()` with score data

4. **`src/components/kids/SkillPlanDashboard.tsx`**
   - Add a game icon indicator on plan items with `item_type === 'game'` (distinct from text activities)
   - "Play" button label instead of "Start" for game items

5. **`src/types/skillPlan.ts`**
   - Add optional `game_mode` field to `CatalogItem` type for future extensibility

### Integration Flow

```text
Parent (SkillPlanManager)
  |-- Adds catalog item (item_type: 'game', skill_domain: 'social')
  |-- Approves plan
  v
Kid (SkillPlanDashboard)
  |-- Sees "Play" button on game items
  |-- Clicks Play
  v
ActivityExecutor
  |-- Detects item_type === 'game'
  |-- Renders SkillMatchGame(domain='social')
  v
SkillMatchGame
  |-- Loads social-domain symbols (emotion faces)
  |-- Runs matching rounds
  |-- Reports score -> completeSession()
  v
Back to SkillPlanDashboard (item marked complete)
```

### No Database Changes Required

The existing `life_skill_catalog` table already has `item_type` and `skill_domain` columns. Items with `item_type = 'game'` will trigger the interactive game instead of text steps. Parents create these through the existing catalog + plan workflow.

### Technical Details

- Game uses the existing `GameWrapper` shell (pause/resume, sound toggle, timer, stars, progress bar)
- Scoring integrates with `useActivitySession` hook for `plan_session_logs` tracking
- Domain color palettes reuse the `SKILL_DOMAINS` constant colors
- All interactions use `playSound()` from `gameUtils` for audio feedback
- `CelebrationEffect` triggers on correct answers and completion
- `prefersReducedMotion()` check disables animations per user preference
- Large 64px+ touch targets for motor accessibility

