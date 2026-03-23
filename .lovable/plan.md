

# Add Skill Games Browser to Kids Portal

## What This Does

Currently, kids can only play skill games if a parent has assigned them in a plan. This adds a **"Skill Games"** tab/section directly in the Kids Portal where kids can browse all 8 skill domains and launch games freely — no plan assignment required. Game scores still get tracked.

## Changes

### 1. Create `src/components/kids/SkillGamesBrowser.tsx`
A browsable grid showing all 8 skill domains as colorful cards. Each card displays:
- Domain emoji and name (from `SKILL_DOMAINS`)
- Game title (from `DOMAIN_GAME_CONFIGS` — e.g., "Emotion Explorer", "Sequence Builder")
- Difficulty selector (Easy / Medium / Hard)
- "Play" button that launches `SkillMatchGame` inline
- Uses domain-specific background colors from `skillGameData.ts`

When a game completes, scores are logged via `useActivitySession` or a lightweight tracker, and the card shows the last score/accuracy.

### 2. Modify `src/pages/kids/KidsPortal.tsx`
- Add a "Skill Games" section below the `SkillPlanDashboard`
- Render `SkillGamesBrowser` component
- When a game is active, show the `SkillMatchGame` full-screen (reusing existing pattern)

### 3. Modify `src/components/kids/KidsPortalLayout.tsx` (if tabs exist)
- Add a "Games" tab option so kids can toggle between their plan and free-play skill games

### Technical Details
- Reuses existing `SkillMatchGame`, `DOMAIN_GAME_CONFIGS`, `SKILL_DOMAINS` — no new game logic needed
- Domain cards use the existing color palette (`bg-blue-50`, `bg-purple-50`, etc.)
- Completion callbacks track scores in `plan_session_logs` with a null `plan_item_id` to distinguish free-play from assigned games
- Large touch targets (min 64px) and `motion-reduce` support carry over from SkillMatchGame

