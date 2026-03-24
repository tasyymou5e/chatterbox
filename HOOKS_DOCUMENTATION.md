# Custom Hooks Documentation

> **Last Updated:** 2026-03-24  
> **Total Hooks:** 58  
> **Location:** `src/hooks/`

## Overview

This document provides a comprehensive reference for all custom React hooks in the Chatterbox platform. Hooks are organized by functional category and include usage examples, dependencies, and TypeScript interfaces.

---

## Table of Contents

1. [Authentication Hooks](#authentication-hooks)
2. [Data Fetching Hooks](#data-fetching-hooks)
3. [UI/UX Hooks](#uiux-hooks)
4. [Game & Session Hooks](#game--session-hooks)
5. [Security Hooks](#security-hooks)
6. [System & Monitoring Hooks](#system--monitoring-hooks)
7. [Utility Hooks](#utility-hooks)

---

## Authentication Hooks

### `useAuth.tsx`

Primary authentication hook bridging to Zustand `authStore`.

```typescript
interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isParent: boolean;
  isChild: boolean;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: UserMetadata) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}
```

**Features:**
- Session persistence with localStorage
- Role-based access helpers (`isAdmin`, `isParent`, `isChild`)
- Automatic profile fetching
- Bridge adapter pattern for backward compatibility

**Usage:**
```tsx
const { user, isAdmin, signOut } = useAuth();
```

---

### `useAdminAuth.tsx`

Admin-specific authentication with enhanced security checks.

```typescript
interface UseAdminAuthReturn {
  isAdmin: boolean;
  isLoading: boolean;
  adminUser: User | null;
  sessionReady: boolean;
  verifyAdminAccess: () => Promise<boolean>;
}
```

**Features:**
- Server-side role verification via `has_role` RPC
- Session readiness tracking
- Protected route integration
- Security audit logging

**Usage:**
```tsx
const { isAdmin, sessionReady, verifyAdminAccess } = useAdminAuth();
```

---

### `useAuthForm.ts`

Form handling for authentication flows.

**Features:**
- React Hook Form integration
- Zod validation schemas
- Error message formatting
- Loading state management

---

### `useAuthLogging.ts`

Authentication event logging for security audits.

**Features:**
- Login attempt tracking
- Failed authentication logging
- Session event recording
- Device fingerprinting integration

---

### `useAuthNavigation.tsx`

Post-authentication navigation routing.

```typescript
interface UseAuthNavigationReturn {
  navigateAfterAuth: (role: AppRole) => void;
  redirectPath: string;
}
```

**Features:**
- Role-based redirect logic
- Return URL preservation
- Navigation loop prevention

---

## Data Fetching Hooks

### `useAnalytics.tsx`

Base analytics data fetching.

**Features:**
- KPI metrics retrieval
- Trend calculations
- Caching with stale-while-revalidate

---

### `useAnalyticsWithSession.tsx`

Enhanced analytics with session awareness.

```typescript
interface UseAnalyticsWithSessionReturn {
  metrics: AnalyticsMetrics | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  sessionReady: boolean;
}
```

**Features:**
- Session-gated data fetching
- Automatic refetch on session change
- Error recovery with retry
- useCallback-wrapped fetch functions

---

### `useCatalogCache.ts`

Content catalog caching layer.

**Features:**
- Memory + localStorage caching
- TTL-based invalidation
- Optimistic updates
- Background refresh

---

### `useChildProfile.ts`

Child user profile management.

```typescript
interface UseChildProfileReturn {
  childProfile: ChildProfile | null;
  loading: boolean;
  updateProfile: (updates: Partial<ChildProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```

---

### `useChoreManagement.ts` / `useChoreManagement.tsx`

Chore CRUD operations and state management.

```typescript
interface UseChoreManagementReturn {
  chores: Chore[];
  assignments: ChoreAssignment[];
  loading: boolean;
  createChore: (chore: CreateChoreInput) => Promise<void>;
  assignChore: (choreId: string, childId: string) => Promise<void>;
  completeChore: (assignmentId: string) => Promise<void>;
  verifyCompletion: (assignmentId: string, approved: boolean) => Promise<void>;
}
```

**Features:**
- Template-based chore creation
- Recurring chore scheduling
- Points calculation
- Photo upload support

---

### `useKidsContentLoader.ts`

Age-appropriate content loading for Kids Portal.

**Features:**
- Age-filtered content queries
- Autism feature filtering
- Progress integration
- Offline content caching

---

### `useProgress.ts`

User progress tracking.

**Features:**
- Lesson completion tracking
- Star/Moon progress system
- Level advancement logic

---

### `useStarProgress.ts`

Star-based progress visualization.

```typescript
interface UseStarProgressReturn {
  currentStars: number;
  starsToMoon: number;
  moonsEarned: number;
  addStars: (count: number) => void;
  progress: CategoryProgress[];
}
```

---

## UI/UX Hooks

### `use-mobile.tsx`

Responsive design detection.

```typescript
function useMobile(): boolean;
```

**Features:**
- Breakpoint detection (768px default)
- SSR-safe implementation
- Debounced resize handling

---

### `use-toast.ts`

Toast notification management.

```typescript
interface UseToastReturn {
  toast: (options: ToastOptions) => void;
  toasts: Toast[];
  dismiss: (id: string) => void;
}
```

---

### `useCelebration.ts`

Achievement celebration effects.

**Features:**
- Confetti animations
- Sound effects integration
- Celebration queuing

---

### `useWindowSize.ts`

Window dimension tracking.

```typescript
interface WindowSize {
  width: number;
  height: number;
}

function useWindowSize(): WindowSize;
```

---

### `useVirtualScrolling.ts`

Virtual list rendering optimization.

**Features:**
- react-window integration
- Dynamic row heights
- Scroll position preservation

---

### `useInterval.ts`

Safe interval management.

```typescript
function useInterval(callback: () => void, delay: number | null): void;
```

**Features:**
- Auto-cleanup on unmount
- Pause capability (null delay)
- Callback ref stability

---

## Game & Session Hooks

### `useGameSession.ts`

Active game session management.

```typescript
interface UseGameSessionReturn {
  session: GameSession | null;
  startSession: (contentId: string) => Promise<void>;
  endSession: (score: number) => Promise<void>;
  updateProgress: (progress: number) => void;
}
```

**Features:**
- Session persistence
- Score tracking
- Time-on-task recording

---

### `useGamification.ts` / `useGamification.tsx`

Points and achievements system.

```typescript
interface UseGamificationReturn {
  points: number;
  level: number;
  achievements: Achievement[];
  addPoints: (amount: number, source: string) => Promise<void>;
  checkAchievements: () => Promise<Achievement[]>;
}
```

---

### `useCertificateGenerator.ts`

PDF certificate generation.

**Features:**
- jsPDF integration
- Custom templates
- Achievement data embedding

---

### `useTextToSpeech.ts`

Browser TTS integration.

```typescript
interface UseTextToSpeechReturn {
  speak: (text: string) => void;
  stop: () => void;
  speaking: boolean;
  supported: boolean;
}
```

---

### `useGrokTextToSpeech.ts`

Grok AI TTS integration.

**Features:**
- Edge function calls
- Audio streaming
- Voice selection

---

## Security Hooks

### `useLoginRateLimiter.ts`

Brute-force protection.

```typescript
interface UseLoginRateLimiterReturn {
  canAttempt: boolean;
  remainingAttempts: number;
  lockoutTime: number | null;
  recordAttempt: (success: boolean) => void;
  reset: () => void;
}
```

**Features:**
- Exponential backoff
- localStorage persistence
- IP-based tracking (server-side)

---

### `useNavigationGuard.tsx`

Route protection for unsaved changes.

**Features:**
- Browser beforeunload integration
- React Router blocker
- Confirmation dialog

---

### `useParentPortalGuard.tsx`

Parent-only route protection.

```typescript
interface UseParentPortalGuardReturn {
  isAuthorized: boolean;
  isLoading: boolean;
  redirectToLogin: () => void;
}
```

---

### `usePrivacyAwareBehavioralTracking.ts`

GDPR-compliant behavioral tracking.

**Features:**
- Consent verification
- Data minimization
- Opt-out support

---

### `usePrivacyConsent.tsx`

Privacy consent management.

```typescript
interface UsePrivacyConsentReturn {
  hasConsent: boolean;
  consentDate: Date | null;
  updateConsent: (granted: boolean) => Promise<void>;
  showConsentDialog: () => void;
}
```

---

## System & Monitoring Hooks

### `useSystemMonitoring.ts`

System health tracking.

```typescript
interface UseSystemMonitoringReturn {
  health: SystemHealthMetric[];
  errors: SystemError[];
  alerts: SystemAlert[];
  loading: boolean;
  refreshHealth: () => Promise<void>;
}
```

---

### `useErrorTracking.ts`

Frontend error collection.

**Features:**
- Error boundary integration
- Stack trace capture
- User context attachment

---

### `useAutoErrorLogging.tsx`

Automatic error reporting.

**Features:**
- Global error handler
- Unhandled rejection capture
- Rate limiting

---

### `usePerformanceMonitoringSafe.ts`

Safe performance API access.

**Features:**
- Feature detection
- Graceful degradation
- Memory tracking

---

### `usePerformanceMonitoringWrapper.ts`

Performance metrics wrapper.

**Features:**
- Core Web Vitals tracking
- Custom metric registration

---

### `useSiteSettings.tsx`

Global site configuration.

```typescript
interface UseSiteSettingsReturn {
  settings: SiteSettings;
  loading: boolean;
  updateSetting: (key: string, value: SiteSettingValue) => Promise<void>;
}
```

---

## Utility Hooks

### `useAsyncOperation.ts`

Generic async operation wrapper.

```typescript
interface UseAsyncOperationReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: unknown[]) => Promise<T>;
  reset: () => void;
}
```

---

### `useErrorBoundary.tsx`

Error boundary hook interface.

**Features:**
- Programmatic error throwing
- Reset capability

---

### `useStoreResult.ts`

Zustand store result wrapper.

**Features:**
- Loading state normalization
- Error handling
- Selector optimization

---

### `useChorePhotoUpload.ts`

Chore completion photo uploads.

**Features:**
- Supabase storage integration
- Image compression
- Progress tracking

---

### `useSecureBehavioralSummary.ts`

Secure behavioral data aggregation.

**Features:**
- Family-scoped queries
- RLS enforcement
- Privacy filtering

---

### `useAdminDebug.tsx`

Admin debug panel state (dev only).

**Features:**
- Debug info toggle
- Console logging control
- Feature flags

---

## Hook Development Guidelines

### Creating New Hooks

1. **File Naming:** `use[Feature].ts` or `use[Feature].tsx` (if using JSX)
2. **Location:** `src/hooks/`
3. **TypeScript:** Always define return type interface
4. **Dependencies:** Use `useCallback` for functions in dependency arrays
5. **Cleanup:** Always return cleanup function from `useEffect`

### Best Practices

```typescript
// ✅ Good: Memoized callbacks, proper deps
const fetchData = useCallback(async () => {
  if (!userId) return;
  const data = await supabase.from('table').select();
  setData(data);
}, [userId]);

useEffect(() => {
  fetchData();
}, [fetchData]);

// ❌ Bad: Function in deps without useCallback
useEffect(() => {
  fetchData();
}, [fetchData]); // fetchData recreated every render
```

### Testing Hooks

- Use `@testing-library/react-hooks`
- Mock Supabase client
- Test loading/error/success states
- Verify cleanup functions

---

## Migration Notes

### From Context to Zustand

Many hooks now use Zustand stores internally while maintaining the same external API:

```typescript
// Old: Direct context usage
const { user } = useContext(AuthContext);

// New: Zustand with bridge adapter
const { user } = useAuth(); // Same API, Zustand backend
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-21 | Initial comprehensive documentation |
| 1.1.0 | 2026-03-23 | Enhanced useAutoErrorLogging with console/Vite intercepts |

---

## Enhanced Error Logging (v1.1.0)

### `useAutoErrorLogging.tsx` — Comprehensive Intercepts

As of v1.1.0, this hook captures **6 error sources**:

| Source | Error Type | Severity | Notes |
|--------|-----------|----------|-------|
| `window.onerror` | `javascript_error` | high | Global JS errors |
| `window.onunhandledrejection` | `javascript_error` | high | Unhandled promises |
| `console.error()` | `console_error` | medium | All console.error calls site-wide |
| `console.warn()` | `console_warn` | low | All console.warn calls site-wide |
| `fetch()` 5xx | `network_error` | high/medium | Server errors only |
| `import.meta.hot` | `vite_build_error` | high | Vite HMR/build errors (dev only) |

**Loop Prevention:** Uses `__isInternalLog` guard flag to prevent console intercepts from triggering recursive logging. Error-reporting URLs (`error-collector`, `security-monitoring`) are excluded from fetch intercepts.

**Circuit Breaker:** Inherited from `useErrorTracking` — max 5 error reports per 10-second window.
