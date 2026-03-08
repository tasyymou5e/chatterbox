

# Animate Quota Progress Bar on Change

## Changes

### 1. `src/components/ui/progress.tsx`
- Add a smooth CSS transition on the indicator's `transform` property: `transition: transform 600ms cubic-bezier(0.4, 0, 0.2, 1)` instead of the generic `transition-all`

### 2. `src/components/ai/AIAssistantChat.tsx`
- Track previous quota value with `useRef` and detect when it decreases
- When quota decreases, briefly apply a "pulse" scale animation to the quota section (scale up then back) using a CSS class toggled via `useState` + `setTimeout`
- Add a brief color flash on the text label when quota changes (e.g., opacity transition)

### Files

| File | Action |
|---|---|
| `src/components/ui/progress.tsx` | **Modify** -- smoother transition timing on indicator |
| `src/components/ai/AIAssistantChat.tsx` | **Modify** -- add pulse animation on quota change |

