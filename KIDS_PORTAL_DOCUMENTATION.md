# Kids Portal Documentation

**Unified Portal for Children's Games, Tasks, and Activities**

---

## Overview

The Kids Portal is a unified, child-friendly interface that consolidates games, chores, and activities into a single, age-appropriate experience. It features autism-friendly design principles, progress tracking integration, and break reminders.

**Route:** `/kids`  
**Target Users:** Child accounts  
**Status:** ✅ Complete (2026-01-21)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     KidsPortal.tsx                          │
│  (Main page - orchestrates all components and state)        │
└─────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐
│ KidsPortal    │  │ useKidsContent  │  │ useLessonProgress│
│ Layout        │  │ Loader          │  │ Store            │
└───────────────┘  └─────────────────┘  └──────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐
│ Progress      │  │ UnifiedContent  │  │ gameSessionStore │
│ Header        │  │ Service         │  │                  │
└───────────────┘  └─────────────────┘  └──────────────────┘
        │
        ▼
┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐
│ KidsContent   │  │ AgeGroupMenu    │  │ KidsGameLauncher │
│ Card          │  │                 │  │                  │
└───────────────┘  └─────────────────┘  └──────────────────┘
```

---

## Components

### KidsPortalLayout (`src/components/kids/KidsPortalLayout.tsx`)

**Purpose:** Age-appropriate layout wrapper with colorful header and navigation.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `childProfile` | `ChildProfile \| null` | Child's profile data |
| `activeTab` | `ContentType` | Currently selected content type |
| `onTabChange` | `(tab: ContentType) => void` | Tab change handler |
| `onLogout` | `() => void` | Logout handler |
| `children` | `ReactNode` | Page content |

**Features:**
- Gradient header with avatar and welcome message
- Tab navigation: Games | My Tasks | Activities
- Stars and moons progress counters
- Child-friendly icons and large touch targets

---

### KidsContentCard (`src/components/kids/KidsContentCard.tsx`)

**Purpose:** Unified content card for displaying games, chores, and tasks.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `item` | `KidContentItem` | Content item data |
| `onLaunch` | `(item: KidContentItem) => void` | Launch handler |
| `onFavoriteToggle` | `(item: KidContentItem) => void` | Favorite toggle |

**Features:**
- Visual progress ring showing completion percentage
- Favorite toggle with heart icon
- Autism-friendly feature badges (sensory, visual supports)
- Age group and difficulty indicators
- Play statistics (count, best score, last played)

---

### KidsGameLauncher (`src/components/kids/KidsGameLauncher.tsx`)

**Purpose:** Dialog wrapper for launching games with autism-friendly features.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `game` | `KidContentItem \| null` | Game to launch |
| `childProfile` | `ChildProfile \| null` | Child's profile |
| `familyId` | `string \| undefined` | Family ID for progress tracking |
| `onClose` | `() => void` | Close handler |
| `onComplete` | `(results: GameResults) => void` | Completion callback |

**Features:**
- Integration with `useGameSession` for progress tracking
- Break reminders at configurable intervals (default: 15 min)
- Session statistics (stars earned, streak, accuracy)
- `CelebrationEffect` for achievements
- Pause/resume controls with overlays
- PostMessage listener for iframe game events

---

### KidsProgressHeader (`src/components/kids/KidsProgressHeader.tsx`)

**Purpose:** Visual display of stars, moons, and skill level.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `profile` | `ChildProfile \| null` | Child's profile with progress |
| `starsToNextMoon` | `number` | Stars needed (default: 10) |
| `className` | `string` | Additional CSS classes |

**Features:**
- Animated star counter with sparkle effects
- Moon progress bar with fill animation
- Individual star indicators (filled/empty)
- Skill level badge with trophy icon
- Optional daily streak display

---

### AgeGroupMenu (`src/components/kids/AgeGroupMenu.tsx`)

**Purpose:** Collapsible filter panel for age groups.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `selectedAgeGroup` | `AgeGroup \| 'all'` | Currently selected filter |
| `onAgeGroupChange` | `(group: AgeGroup \| 'all') => void` | Filter change handler |
| `contentCounts` | `Record<AgeGroup \| 'all', number>` | Count badges |

**Features:**
- Age group buttons: 3-5, 6-8, 9-12, 13+, All
- Content count badges per age group
- Visual icons for each age group
- Collapsible sidebar design

---

## Hooks

### useChildProfile (`src/hooks/useChildProfile.ts`)

**Purpose:** Reusable hook for fetching child profile with React Query caching.

```typescript
const { profile, familyId, isLoading, error, refetch } = useChildProfile(userId);
```

**Features:**
- Automatic caching (5 minute stale time)
- Fetches profile and family membership in one call
- Type-safe return values

---

### useKidsContentLoader (`src/hooks/useKidsContentLoader.ts`)

**Purpose:** Unified content loading with real-time subscriptions.

```typescript
const { content, isLoading, toggleFavorite, recordLaunch, contentCounts } = useKidsContentLoader({
  childId: user?.id,
  familyId: familyId,
  contentType: activeTab,
  ageGroup: selectedAgeGroup,
});
```

**Features:**
- React Query integration with caching
- Real-time Supabase subscriptions for updates
- Optimistic updates for favorites
- Content counts by age group

---

## Services

### UnifiedContentService (`src/services/UnifiedContentService.ts`)

**Purpose:** Central service for fetching all child content types.

**Methods:**
| Method | Description |
|--------|-------------|
| `getAllContentForChild(childId, familyId, options)` | Combined games + chores |
| `getGamesForChild(childId, familyId, ageGroup?)` | Game content only |
| `getChoresForChild(childId)` | Assigned chores only |
| `toggleFavorite(childId, contentId, type)` | Toggle favorite status |
| `recordInteraction(childId, contentId, type)` | Track content usage |

---

## Database Schema

### child_content_preferences

Stores child-specific preferences and statistics for content items.

```sql
CREATE TABLE child_content_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type VARCHAR(20) NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  difficulty_preference VARCHAR(20) DEFAULT 'auto',
  last_played_at TIMESTAMPTZ,
  play_count INTEGER DEFAULT 0,
  best_score NUMERIC(5,2),
  total_time_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, content_id, content_type)
);
```

### RLS Policies
- `children_manage_own_preferences`: Children can CRUD their own preferences
- `parents_view_family_preferences`: Parents can view their family's children
- `admins_view_all_preferences`: Admins have full access

---

## Type Definitions

### KidContentItem (`src/types/kidsPortal.ts`)

```typescript
interface KidContentItem {
  id: string;
  type: ContentType; // 'game' | 'chore' | 'task' | 'activity'
  title: string;
  description: string;
  ageGroup: AgeGroup[];
  familyAccess: AccessLevel;
  autismFeatures?: AutismFeatures;
  thumbnailUrl?: string;
  launchUrl?: string;
  categoryId?: string;
  categoryName?: string;
  estimatedDuration?: number;
  difficultyLevel?: string;
  isFavorite?: boolean;
  lastPlayedAt?: string;
  playCount?: number;
  bestScore?: number;
  completionPercentage?: number;
}
```

### ChildProfile

```typescript
interface ChildProfile {
  id: string;
  firstName: string;
  lastName?: string;
  ageGroup: AgeGroup;
  avatarUrl?: string;
  totalStars?: number;
  totalMoons?: number;
  currentLevel?: SkillLevel;
  breakIntervalMinutes?: number;
}
```

---

## Integration Points

### Progress Tracking

The Kids Portal integrates with the lesson progress system:

1. **lessonProgressStore**: Provides real stars/moons data
2. **useGameSession**: Tracks game session progress
3. **gameSessionStore**: Manages active game state

```typescript
// In KidsPortal.tsx
const { progressByCategory, fetchAllProgress } = useLessonProgressStore();

// Calculate totals from all categories
const totalStars = useMemo(() => {
  let sum = 0;
  progressByCategory.forEach(p => sum += p.current_stars);
  return sum;
}, [progressByCategory]);
```

### Celebration Effects

Games trigger celebrations via the `onCelebration` callback:

```typescript
const gameSession = useGameSession({
  categoryId: game.categoryId,
  contentItemId: game.id,
  userId: childProfile.id,
  familyId: familyId,
  onCelebration: (event) => {
    // Triggers CelebrationEffect component
    setShowCelebration(true);
  },
});
```

---

## Routing

| Path | Component | Description |
|------|-----------|-------------|
| `/kids` | `KidsPortal` | Main kids portal |
| `/children/tasks` | `Navigate` | Redirects to `/kids` |

The portal selection component routes children directly to `/kids`:

```typescript
// In PortalSelection.tsx
case "child":
  navigate("/kids");
  break;
```

---

## Accessibility Features

The Kids Portal implements autism-friendly design:

- **Large Touch Targets**: Minimum 44x44px tap areas
- **Visual Consistency**: Predictable layouts and navigation
- **Break Reminders**: Configurable intervals (default 15 min)
- **Reduced Motion**: Respects `prefers-reduced-motion`
- **Clear Hierarchy**: Obvious visual structure
- **Sensory Badges**: Indicates sensory-friendly content
- **Progress Visibility**: Clear star/moon progress indicators

---

## Testing Checklist

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Route access | Navigate to `/kids` as child | Portal loads |
| Old route redirect | Navigate to `/children/tasks` | Redirects to `/kids` |
| Tab switching | Click Games → My Tasks | Content filters |
| Age filtering | Click age group buttons | Content filters |
| Game launch | Click game card | Launcher opens |
| Break reminder | Wait 15 min | Overlay appears |
| Favorites | Click heart icon | Persists in DB |
| Progress display | Complete game | Stars update |
| Celebration | Earn a star | Animation plays |
