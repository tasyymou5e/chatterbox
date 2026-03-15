# Zustand Stores Documentation

> **Last Updated:** 2026-03-15  
> **Total Stores:** 18  
> **Location:** `src/stores/`  
> **State Management:** Zustand v5.0.10

## Overview

Chatterbox uses Zustand for global state management, replacing the previous React Context-based approach. This document provides a comprehensive reference for all stores, their interfaces, and usage patterns.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Stores](#core-stores)
3. [Feature Stores](#feature-stores)
4. [Analytics Stores](#analytics-stores)
5. [System Stores](#system-stores)
6. [Store Utilities](#store-utilities)
7. [Development Guidelines](#development-guidelines)

---

## Architecture Overview

### Store Structure

```
src/stores/
├── index.ts                      # Central exports
├── _storeTemplate.ts             # Template for new stores
├── authStore.ts                  # Core authentication state
├── authActionsStore.ts           # Auth action handlers
├── authRoleStore.ts              # Role management state
├── authSessionStore.ts           # Session management state
├── uiStore.ts                    # UI/Loading states
├── adminStore.ts                 # Admin operations
├── choreStore.ts                 # Chore management
├── connectionStore.ts            # Family connections
├── gamificationStore.ts          # Points/Achievements
├── gameSessionStore.ts           # Active game sessions
├── lessonProgressStore.ts        # Educational progress
├── testResultsStore.ts           # Assessment/test results
├── analyticsStore.ts             # System analytics
├── behaviorAnalyticsStore.ts     # Behavioral tracking
├── performanceAnalyticsStore.ts  # Performance metrics
├── progressAnalyticsStore.ts     # Progress insights
└── systemHealthStore.ts          # Health monitoring
```

### Design Principles

1. **Single Source of Truth:** Each domain has one store
2. **Minimal State:** Only store what's needed globally
3. **Derived State:** Use selectors for computed values
4. **Type Safety:** Full TypeScript interfaces
5. **Persistence:** Optional localStorage sync

---

## Core Stores

### `authStore.ts`

Central authentication and user state management.

```typescript
interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
  initialized: boolean;
  
  // Computed (via selectors)
  isAuthenticated: boolean;
  isAdmin: boolean;
  isParent: boolean;
  isChild: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  setInitialized: (initialized: boolean) => void;
  
  // Async Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: UserMetadata) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  checkRole: (role: AppRole) => Promise<boolean>;
  
  // Reset
  reset: () => void;
}
```

**Key Features:**
- Session persistence with Supabase auth listener
- Role verification via `has_role` RPC
- Profile auto-fetch on authentication
- Error state management

**Usage:**
```tsx
import { useAuthStore } from '@/stores/authStore';

// In component
const { user, isAdmin, signOut } = useAuthStore();

// With selector (optimized re-renders)
const isAdmin = useAuthStore((state) => state.isAdmin);
```

**Selectors:**
```typescript
// Defined selectors for common access patterns
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => !!state.user;
export const selectIsAdmin = (state: AuthState) => state.isAdmin;
export const selectProfile = (state: AuthState) => state.profile;
```

---

### `uiStore.ts`

Global UI state and loading management.

```typescript
interface UIState {
  // Loading States
  globalLoading: boolean;
  loadingMessage: string | null;
  pageLoading: Record<string, boolean>;
  
  // Modal States
  activeModal: string | null;
  modalData: Record<string, unknown>;
  
  // Sidebar
  sidebarCollapsed: boolean;
  sidebarMobile: boolean;
  
  // Notifications
  notifications: Notification[];
  
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Actions
  setGlobalLoading: (loading: boolean, message?: string) => void;
  setPageLoading: (page: string, loading: boolean) => void;
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
  setSidebarMobile: (mobile: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // Reset
  reset: () => void;
}
```

**Key Features:**
- Centralized loading state
- Modal management with data passing
- Responsive sidebar state
- Theme persistence

**Usage:**
```tsx
import { useUIStore } from '@/stores/uiStore';

const { setGlobalLoading, openModal } = useUIStore();

// Show loading
setGlobalLoading(true, 'Saving changes...');

// Open modal with data
openModal('userEdit', { userId: '123' });
```

---

## Feature Stores

### `choreStore.ts`

Chore management state.

```typescript
interface ChoreState {
  // Data
  chores: Chore[];
  assignments: ChoreAssignment[];
  templates: ChoreTemplate[];
  categories: ChoreCategory[];
  completions: ChoreCompletion[];
  
  // State
  loading: boolean;
  error: Error | null;
  selectedChoreId: string | null;
  
  // Filters
  filters: {
    status: ChoreStatus | null;
    assignedTo: string | null;
    categoryId: string | null;
    dateRange: [Date, Date] | null;
  };
  
  // Actions
  fetchChores: (familyId: string) => Promise<void>;
  fetchAssignments: (familyId: string) => Promise<void>;
  fetchTemplates: () => Promise<void>;
  createChore: (chore: CreateChoreInput) => Promise<Chore>;
  updateChore: (id: string, updates: Partial<Chore>) => Promise<void>;
  deleteChore: (id: string) => Promise<void>;
  assignChore: (choreId: string, assignedTo: string, dueDate?: Date) => Promise<void>;
  completeAssignment: (assignmentId: string, data: CompletionData) => Promise<void>;
  verifyCompletion: (assignmentId: string, verified: boolean, feedback?: string) => Promise<void>;
  setFilters: (filters: Partial<ChoreState['filters']>) => void;
  
  // Reset
  reset: () => void;
}
```

**Key Features:**
- Template-based chore creation
- Assignment workflow management
- Completion verification flow
- Filtering and search

---

### `gamificationStore.ts`

Points, achievements, and rewards system.

```typescript
interface GamificationState {
  // User Stats
  points: number;
  totalPoints: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  streak: number;
  
  // Achievements
  achievements: Achievement[];
  unlockedAchievements: UserAchievement[];
  recentUnlocks: UserAchievement[];
  
  // Leaderboard
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  
  // State
  loading: boolean;
  error: Error | null;
  
  // Actions
  fetchUserStats: (userId: string) => Promise<void>;
  fetchAchievements: () => Promise<void>;
  fetchLeaderboard: (familyId: string) => Promise<void>;
  addPoints: (amount: number, source: string, metadata?: Record<string, unknown>) => Promise<void>;
  checkAchievements: (userId: string) => Promise<Achievement[]>;
  unlockAchievement: (achievementId: string) => Promise<void>;
  updateStreak: (userId: string) => Promise<void>;
  
  // Reset
  reset: () => void;
}
```

**Key Features:**
- Points calculation with multipliers
- Achievement unlock checking
- Streak tracking
- Family leaderboards

---

### `connectionStore.ts`

Family connections and invitations.

```typescript
interface ConnectionState {
  // Data
  connections: FamilyConnection[];
  pendingInvites: ConnectionInvite[];
  sentInvites: ConnectionInvite[];
  
  // State
  loading: boolean;
  error: Error | null;
  
  // Actions
  fetchConnections: (familyId: string) => Promise<void>;
  fetchPendingInvites: (familyId: string) => Promise<void>;
  sendInvite: (email: string, role: ConnectionRole) => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
  revokeInvite: (inviteId: string) => Promise<void>;
  removeConnection: (connectionId: string) => Promise<void>;
  updatePermissions: (connectionId: string, permissions: ConnectionPermissions) => Promise<void>;
  
  // Reset
  reset: () => void;
}
```

---

### `gameSessionStore.ts`

Active game session tracking.

```typescript
interface GameSessionState {
  // Current Session
  activeSession: GameSession | null;
  sessionHistory: GameSession[];
  
  // Stats
  totalPlayTime: number;
  gamesPlayed: number;
  highScores: Record<string, number>;
  
  // State
  loading: boolean;
  
  // Actions
  startSession: (contentId: string, contentType: string) => Promise<GameSession>;
  updateSession: (progress: number, score?: number) => void;
  endSession: (finalScore: number, completed: boolean) => Promise<void>;
  pauseSession: () => void;
  resumeSession: () => void;
  fetchSessionHistory: (userId: string, limit?: number) => Promise<void>;
  
  // Reset
  reset: () => void;
}
```

---

### `lessonProgressStore.ts`

Educational progress tracking.

```typescript
interface LessonProgressState {
  // Progress Data
  categoryProgress: Record<string, CategoryProgress>;
  recentActivity: LessonHistoryEntry[];
  certificates: Certificate[];
  
  // Current State
  currentCategoryId: string | null;
  currentLevel: SkillLevel;
  
  // Stats
  totalStarsEarned: number;
  totalMoonsEarned: number;
  overallAccuracy: number;
  
  // State
  loading: boolean;
  error: Error | null;
  
  // Actions
  fetchProgress: (userId: string, familyId: string) => Promise<void>;
  recordAnswer: (categoryId: string, correct: boolean, responseTimeMs?: number) => Promise<void>;
  fetchCertificates: (userId: string) => Promise<void>;
  generateCertificate: (categoryId: string, level: SkillLevel) => Promise<Certificate>;
  
  // Reset
  reset: () => void;
}
```

---

## Analytics Stores

### `analyticsStore.ts`

System-wide analytics with caching.

```typescript
interface AnalyticsState {
  // Metrics
  kpiMetrics: KPIMetrics | null;
  engagementData: EngagementDataPoint[];
  retentionData: RetentionDataPoint[];
  growthData: GrowthDataPoint[];
  
  // Cache
  lastFetchTime: number | null;
  cacheValid: boolean;
  
  // State
  loading: boolean;
  error: Error | null;
  
  // Actions
  fetchKPIMetrics: () => Promise<void>;
  fetchEngagementData: (days?: number) => Promise<void>;
  fetchRetentionData: () => Promise<void>;
  fetchGrowthData: () => Promise<void>;
  invalidateCache: () => void;
  
  // Reset
  reset: () => void;
}
```

**Key Features:**
- 5-minute cache TTL
- Stale-while-revalidate pattern
- Type-safe RPC responses

---

### `behaviorAnalyticsStore.ts`

Behavioral event tracking.

```typescript
interface BehaviorAnalyticsState {
  // Events
  recentEvents: BehavioralEvent[];
  eventCounts: Record<string, number>;
  
  // Patterns
  usagePatterns: UsagePattern[];
  peakUsageTimes: string[];
  
  // State
  loading: boolean;
  
  // Actions
  trackEvent: (event: BehavioralEventInput) => Promise<void>;
  fetchRecentEvents: (userId: string, limit?: number) => Promise<void>;
  analyzePatterns: (userId: string) => Promise<void>;
  
  // Reset
  reset: () => void;
}
```

---

### `performanceAnalyticsStore.ts`

Performance metrics tracking.

```typescript
interface PerformanceAnalyticsState {
  // Metrics
  coreWebVitals: CoreWebVitals | null;
  apiLatency: Record<string, number>;
  errorRates: Record<string, number>;
  
  // State
  loading: boolean;
  
  // Actions
  recordMetric: (name: string, value: number) => void;
  fetchPerformanceData: () => Promise<void>;
  
  // Reset
  reset: () => void;
}
```

---

### `progressAnalyticsStore.ts`

Progress and learning analytics.

```typescript
interface ProgressAnalyticsState {
  // Insights
  insights: AnalyticsInsight[];
  benchmarks: ComparativeBenchmark[];
  
  // Trends
  progressTrends: ProgressTrend[];
  skillGrowth: SkillGrowthData[];
  
  // State
  loading: boolean;
  
  // Actions
  fetchInsights: (familyId: string) => Promise<void>;
  fetchBenchmarks: (ageGroup: string) => Promise<void>;
  generateReport: (userId: string, dateRange: [Date, Date]) => Promise<ProgressReport>;
  
  // Reset
  reset: () => void;
}
```

---

## System Stores

### `adminStore.ts`

Admin-specific operations and state.

```typescript
interface AdminState {
  // Data
  users: AdminUser[];
  families: AdminFamily[];
  contentItems: ContentItem[];
  
  // Pagination
  usersPagination: PaginationState;
  familiesPagination: PaginationState;
  
  // Filters
  userFilters: UserFilters;
  familyFilters: FamilyFilters;
  
  // State
  loading: boolean;
  error: Error | null;
  
  // Actions
  fetchUsers: (page?: number, filters?: UserFilters) => Promise<void>;
  fetchFamilies: (page?: number, filters?: FamilyFilters) => Promise<void>;
  createUser: (userData: CreateUserInput) => Promise<void>;
  updateUser: (userId: string, updates: UpdateUserInput) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  createFamily: (familyData: CreateFamilyInput) => Promise<void>;
  deleteFamily: (familyId: string) => Promise<void>;
  
  // Reset
  reset: () => void;
}
```

---

### `systemHealthStore.ts`

System health monitoring.

```typescript
interface SystemHealthState {
  // Health Data
  services: SystemHealthMetric[];
  errors: SystemError[];
  alerts: SystemAlert[];
  statistics: ErrorStatistics | null;
  
  // Circuit Breaker
  circuitBreaker: CircuitBreakerState;
  
  // State
  loading: boolean;
  connected: boolean;
  lastUpdate: number | null;
  
  // Actions
  fetchHealthMetrics: () => Promise<void>;
  fetchErrors: (filters?: ErrorFilters) => Promise<void>;
  fetchAlerts: () => Promise<void>;
  resolveError: (errorId: string) => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  
  // Circuit Breaker
  recordFailure: () => void;
  recordSuccess: () => void;
  resetCircuitBreaker: () => void;
  
  // Reset
  reset: () => void;
}
```

---

## Store Utilities

### `storeUtils.ts`

Shared utilities for store operations.

```typescript
// Create store with devtools in development
export function createStore<T>(
  name: string,
  initialState: T,
  actions: StoreActions<T>
): UseBoundStore<StoreApi<T>>;

// Persist middleware wrapper
export function withPersistence<T>(
  store: StateCreator<T>,
  options: PersistOptions
): StateCreator<T>;

// Reset all stores
export function resetAllStores(): void;
```

### `_storeTemplate.ts`

Template for creating new stores.

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface TemplateState {
  // State
  data: unknown[];
  loading: boolean;
  error: Error | null;
  
  // Actions
  fetchData: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  data: [],
  loading: false,
  error: null,
};

export const useTemplateStore = create<TemplateState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      fetchData: async () => {
        set({ loading: true, error: null });
        try {
          // Fetch logic
          set({ data: [], loading: false });
        } catch (error) {
          set({ error: error as Error, loading: false });
        }
      },
      
      reset: () => set(initialState),
    }),
    { name: 'template-store' }
  )
);
```

---

## Development Guidelines

### Creating a New Store

1. Copy `_storeTemplate.ts` as starting point
2. Define TypeScript interface for state
3. Implement initial state object
4. Add actions with proper error handling
5. Export store hook and selectors
6. Add to `index.ts` exports

### Best Practices

```typescript
// ✅ Good: Use selectors for derived state
const completedChores = useChoreStore(
  (state) => state.assignments.filter(a => a.status === 'completed')
);

// ❌ Bad: Selecting entire state
const { assignments } = useChoreStore();
const completedChores = assignments.filter(a => a.status === 'completed');

// ✅ Good: Batch updates
set({
  loading: false,
  data: newData,
  error: null,
});

// ❌ Bad: Multiple set calls
set({ loading: false });
set({ data: newData });
set({ error: null });
```

### Testing Stores

```typescript
import { renderHook, act } from '@testing-library/react';
import { useChoreStore } from '@/stores/choreStore';

describe('choreStore', () => {
  beforeEach(() => {
    useChoreStore.getState().reset();
  });

  it('should fetch chores', async () => {
    const { result } = renderHook(() => useChoreStore());
    
    await act(async () => {
      await result.current.fetchChores('family-123');
    });
    
    expect(result.current.chores).toHaveLength(5);
    expect(result.current.loading).toBe(false);
  });
});
```

### DevTools Integration

All stores include Zustand DevTools support:

```typescript
// Store automatically appears in Redux DevTools
// with name: 'store-name'
```

---

## Migration from Context

### Bridge Adapter Pattern

Existing hooks maintain backward compatibility:

```typescript
// src/hooks/useAuth.tsx
export function useAuth() {
  // Bridge to Zustand store
  const store = useAuthStore();
  
  // Return same interface as old context
  return {
    user: store.user,
    signIn: store.signIn,
    signOut: store.signOut,
    // ... etc
  };
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-21 | Initial documentation |
