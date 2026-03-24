# Chatterbox Architecture Ebook
**Comprehensive Technical Reference**

> **Last Updated:** 2026-03-24  
> **Version:** 3.0  
> **Audience:** Developers, architects, new team members

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Frontend Architecture](#3-frontend-architecture)
4. [State Management](#4-state-management)
5. [Routing & Navigation](#5-routing--navigation)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Backend: Edge Functions](#7-backend-edge-functions)
8. [Database Schema](#8-database-schema)
9. [Kids Portal & Skill Plans](#9-kids-portal--skill-plans)
10. [AI Integration](#10-ai-integration)
11. [Security Model](#11-security-model)
12. [Performance](#12-performance)
13. [Testing Strategy](#13-testing-strategy)
14. [Documentation System](#14-documentation-system)
15. [Appendix](#15-appendix)

---

## 1. Executive Summary

**Chatterbox** is a comprehensive web platform designed to empower children with autism through technology, education, and family connection. It provides a gamified learning environment where children complete skill-building activities, chores, and educational games — all supervised by parents and powered by AI-generated personalized learning plans.

### Key Metrics

| Metric | Value |
|--------|-------|
| Custom React Hooks | 58 |
| Zustand Stores | 18 |
| Edge Functions | 32 |
| Database Tables | 59 |
| TypeScript Type Files | 30 |
| Component Directories | 24 |
| Page Routes | 20+ |
| RLS Policies | 65+ (optimized from 130+) |
| Security Definer Functions | 30+ |

### Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| UI Components | Shadcn/ui, Radix UI, Lucide Icons |
| State | Zustand (client), TanStack Query (server) |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| AI | Lovable AI Gateway, Grok, LLM failover |
| Testing | Vitest, Playwright, Testing Library |

---

## 2. System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (React SPA)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Admin    │  │ Parent   │  │ Kids     │  │ Public   │    │
│  │ Portal   │  │ Portal   │  │ Portal   │  │ Pages    │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┘    │
│       │              │              │                        │
│  ┌────┴──────────────┴──────────────┴─────────────────┐     │
│  │              Zustand Stores (18)                    │     │
│  │   auth · ui · admin · chore · gamification · etc.  │     │
│  └────────────────────┬───────────────────────────────┘     │
│                       │                                      │
│  ┌────────────────────┴───────────────────────────────┐     │
│  │           Supabase Client SDK                       │     │
│  │   Auth · Database · Realtime · Edge Functions       │     │
│  └────────────────────┬───────────────────────────────┘     │
└───────────────────────┼─────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────┼─────────────────────────────────────┐
│                  SUPABASE PLATFORM                           │
│  ┌────────────────────┴───────────────────────────────┐     │
│  │              Edge Functions (32, Deno)              │     │
│  │   admin · AI · family · monitoring · security      │     │
│  └────────────────────┬───────────────────────────────┘     │
│                       │                                      │
│  ┌────────────────────┴───────────────────────────────┐     │
│  │           PostgreSQL Database                       │     │
│  │   59 tables · 65+ RLS policies · 30+ functions     │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   Auth Service · Realtime · Storage                  │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Request Flow

1. User interacts with React SPA
2. Component triggers Zustand action or TanStack Query
3. Supabase SDK sends authenticated request (JWT in header)
4. For direct DB operations: Supabase REST API with RLS enforcement
5. For complex logic: Edge Function → service role client → database
6. Response flows back through the same chain

---

## 3. Frontend Architecture

### Component Hierarchy

The application uses 24 component directories organized by domain:

| Directory | Purpose | Count |
|-----------|---------|-------|
| `admin/` | Admin dashboard panels, dialogs, tables | 30+ |
| `analytics/` | Charts, metrics, dashboards | 15+ |
| `ai/` | AI assistant chat interface | 1 |
| `assessment/` | Assessment forms, results, PDF export | 3 |
| `auth/` | Sign in/up, password reset, role guards | 10+ |
| `avatar/` | Child avatar customization | 3+ |
| `chores/` | Chore cards, assignment UI, completion | 10+ |
| `composition/` | WithAuth, AsyncContent, ConditionalRender | 5+ |
| `connections/` | Family invitation, connection management | 5+ |
| `daily-plan/` | Daily plan widget | 1 |
| `games/` | Educational game components | 10+ |
| `kids/` | Kids Portal: layout, cards, executor, dashboard | 12 |
| `parent/` | Parent dashboard widgets | 5+ |
| `progress/` | Progress bars, star trackers | 5+ |
| `reports/` | Report generation components | 5+ |
| `security/` | Security monitoring UI | 3+ |
| `skeletons/` | Loading placeholder components | 3+ |
| `ui/` | Shadcn/Radix base components | 40+ |
| `wrappers/` | Layout wrappers | 2+ |

### Composition Patterns

The project uses Higher-Order Component patterns for cross-cutting concerns:

```typescript
// WithAuth — role-based route protection
<WithAuth requiredRole="parent">
  <ParentDashboard />
</WithAuth>

// RequireAuth — simple auth check
<RequireAuth>
  <ProtectedContent />
</RequireAuth>
```

### Lazy Loading Strategy

All route-level pages use `React.lazy()` with Suspense boundaries:
- Route wrappers in `src/pages/lazy/` provide code-splitting
- `PageSkeleton` component shows during loading
- Critical paths (auth, index) are eagerly loaded

---

## 4. State Management

### 18 Zustand Stores by Domain

#### Auth Domain (4 stores)
| Store | Responsibility |
|-------|---------------|
| `authStore` | Core auth state: user, session, profile, loading |
| `authActionsStore` | Sign in/up/out actions, password reset |
| `authRoleStore` | Role checking: isAdmin, isParent, isChild |
| `authSessionStore` | Session management, timeout, refresh |

#### Domain Stores (5 stores)
| Store | Responsibility |
|-------|---------------|
| `choreStore` | Chore CRUD, assignments, completions |
| `gamificationStore` | Points, levels, achievements, streaks |
| `connectionStore` | Family connections, invitations, permissions |
| `gameSessionStore` | Active game session tracking |
| `lessonProgressStore` | Lesson/activity progress tracking |

#### Analytics Domain (4 stores)
| Store | Responsibility |
|-------|---------------|
| `analyticsStore` | System-wide analytics with caching |
| `behaviorAnalyticsStore` | Privacy-compliant behavioral tracking |
| `performanceAnalyticsStore` | Performance metrics & optimization |
| `progressAnalyticsStore` | Progress milestones & insights |

#### System Stores (3 stores)
| Store | Responsibility |
|-------|---------------|
| `adminStore` | Admin operations, system metrics |
| `systemHealthStore` | Health monitoring, alerts |
| `testResultsStore` | Assessment/test results |

#### UI Store (1 store)
| Store | Responsibility |
|-------|---------------|
| `uiStore` | Loading states, error display, modal management |

### Design Principles

1. **Single Source of Truth**: Each domain has exactly one store (or a small store cluster like auth)
2. **Minimal State**: Only globally-needed state enters stores; local state stays in components
3. **Selective Subscriptions**: Components subscribe to specific slices, reducing re-renders by 40-60%
4. **DevTools**: Redux DevTools integration for time-travel debugging
5. **Template Pattern**: `_storeTemplate.ts` ensures consistency across all stores

---

## 5. Routing & Navigation

### Portal System

The application has three main portals, each with its own route tree:

```
/                    → Landing page (PortalSelection)
/auth                → Authentication (sign in/up)
/about, /features/*  → Public pages

/admin/*             → Admin Portal (requires admin role)
  /admin/dashboard   → System overview
  /admin/users       → User management
  /admin/families    → Family management
  /admin/analytics   → Analytics dashboards
  /admin/security    → Security center
  /admin/content     → Content moderation
  /admin/settings    → Site settings
  /admin/debug       → Debug tools

/parent/*            → Parent Portal (requires parent role)
  /parent/dashboard  → Family overview
  /parent/reports    → Reports + Daily Progress
  /parent/settings   → Family settings

/kids                → Kids Portal (requires child role)
  → Assessment gate → Skill plan dashboard → Activity executor

/connect/*           → Family connection flows
/support/*           → Support pages
```

### Route Guards

Routes are protected by `WithAuth` and role-specific guards:
- `useAdminAuth` — verifies admin role server-side via `has_role` RPC
- `useParentPortalGuard` — ensures parent role + family membership
- `WithAuth` component — generic role-based protection with redirect

---

## 6. Authentication & Authorization

### Auth Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ SignIn/  │    │ Supabase │    │ profiles │    │ user_    │
│ SignUp   │───▶│ Auth     │───▶│ table    │───▶│ roles    │
│ Form     │    │ Service  │    │ (trigger)│    │ table    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │                               │
                     ▼                               ▼
              JWT with user_id              has_role(_user_id, _role)
                     │                       (security definer)
                     ▼
              ┌──────────────┐
              │ RLS Policies │
              │ enforce data │
              │ access       │
              └──────────────┘
```

### Role System

| Role | Scope | Access |
|------|-------|--------|
| `admin` | Global | All data, system config, user management |
| `parent` | Family | Own family data, child management, chore creation |
| `child` | Personal | Own data within family context, content interaction |
| `read_only` | Audit | Read-only access for extended connections |

**Critical**: Roles are stored in `user_roles` table (never on profiles). Role checking uses `has_role()` security definer function to prevent RLS recursion.

---

## 7. Backend: Edge Functions

### 32 Edge Functions by Category

#### Admin Functions (5)
| Function | Auth | Purpose |
|----------|------|---------|
| `admin-create-user` | Admin JWT | Create users with crypto-secure passwords |
| `admin-delete-user` | Admin JWT | Delete users with full cascade cleanup |
| `admin-update-user` | Admin JWT | Update user profiles and roles |
| `admin-add-family-member` | Admin JWT | Add member to existing family |
| `admin-remove-family-member` | Admin JWT | Remove member from family |

#### AI Functions (7)
| Function | Auth | Purpose |
|----------|------|---------|
| `ai-chat` | JWT | General AI chat via Lovable gateway |
| `ai-session-helper` | JWT | Start/pause/resume/complete activity sessions |
| `ai-assessment-review` | JWT | AI review of child assessments |
| `generate-daily-plan` | JWT | Generate daily activities from skill plan |
| `grok-chat` | JWT | Grok AI integration |
| `llm-with-failover` | Service | LLM calls with automatic provider failover |
| `manage-llm-provider` | Admin JWT | Configure LLM provider settings |

#### Skill Plan Functions (1)
| Function | Auth | Purpose |
|----------|------|---------|
| `manage-skill-plan` | JWT | CRUD for skill plans, catalog items, session logs |

#### Family Functions (6)
| Function | Auth | Purpose |
|----------|------|---------|
| `create-child-account` | JWT | Create child accounts with PIN verification |
| `complete-child-account` | JWT | Complete child account setup |
| `delete-family-comprehensive` | Admin JWT | Cascade family deletion |
| `send-family-email` | Service | Send emails to family members |
| `family-integrity-check` | Service | Validate family data integrity |
| `create-test-family` / `cleanup-test-families` | Admin | Test data management |

#### Monitoring Functions (7)
| Function | Auth | Purpose |
|----------|------|---------|
| `edge-function-health-check` | Service | Health check for all edge functions |
| `scheduled-health-check` | Service | Cron-triggered health monitoring |
| `error-collector` | Service | Collect frontend errors |
| `security-monitoring` | Service | Security event logging & alerting |
| `security-testing` | Admin | Run security test suite |
| `data-health-alerter` | Service | Data health score alerting |
| `api-integration-status` | JWT | Check API integration status |

#### System Functions (4)
| Function | Auth | Purpose |
|----------|------|---------|
| `update-site-settings` | Admin JWT | Update site configuration |
| `process-recurring-chores` | Service | Process recurring chore assignments |
| `supabase-analytics-query` | Admin JWT | Run analytics queries |
| `text-to-speech` | JWT | Convert text to speech |

### Shared Utilities (`_shared/`)

All edge functions share common utilities:
- `cors.ts` — Dynamic origin validation via `getCorsHeaders(origin)`
- `auth-validator.ts` — JWT verification and role checking
- `rate-limiter.ts` — Per-IP rate limiting with configurable windows
- `api-types.ts` — Shared TypeScript interfaces
- `email-sender.ts` — Email sending via Resend
- `security-headers.ts` — Standard security headers

---

## 8. Database Schema

### Table Categories (59 tables)

| Category | Tables | Description |
|----------|--------|-------------|
| Auth & Users | `profiles`, `user_roles`, `user_sessions` | User identity and roles |
| Family | `families`, `family_connections`, `family_activity_logs`, `child_accounts`, `child_avatars` | Family structure |
| Content | `content_categories`, `content_items`, `content_interactions`, `content_favorites` | Educational content |
| Chores | `chores`, `chore_templates`, `chore_categories`, `chore_assignments`, `chore_completions` | Task management |
| Gamification | `achievements`, `daily_streaks`, `certificates`, `family_challenges` | Rewards system |
| Assessment | `assessment_results` | Child assessments |
| Analytics | `analytics_metrics`, `analytics_insights`, `behavioral_events`, `engagement_metrics`, `daily_analytics_data`, `comparative_benchmarks` | Data analytics |
| AI | `ai_conversations`, `ai_messages`, `ai_usage_quotas` | AI chat history |
| Monitoring | `edge_function_health_logs`, `edge_function_uptime_daily`, `edge_function_recovery_attempts`, `edge_function_alert_config`, `error_patterns`, `data_health_scores`, `data_health_alerts` | System health |
| Security | `admin_audit_logs`, `archived_system_errors`, `archived_user_activity_logs` | Security audit |

### RLS Strategy

- **65+ optimized policies** (consolidated from 130+ redundant policies)
- **Security definer functions** prevent RLS recursion (e.g., `has_role`, `has_family_access`)
- **RESTRICTIVE policies** used where appropriate for defense-in-depth
- **Subquery wrapping** for `auth.uid()` and `auth.role()` calls for performance
- **Service role isolation** for monitoring tables (only edge functions can write)

### Data Isolation Model

```
Admin ──── Can access everything
  │
Parent ─── Can access:
  │         ├── Own profile
  │         ├── Family data (where family_id matches)
  │         ├── Child profiles within family
  │         └── Analytics for own family
  │
Child ──── Can access:
            ├── Own profile
            ├── Own activity/progress data
            ├── Content items (read-only)
            └── Family context (read-only)
```

---

## 9. Kids Portal & Skill Plans

### Pipeline Overview

The Kids Portal implements a complete learning pipeline:

```
1. ASSESSMENT GATE
   └── Child must complete initial assessment
       └── AssessmentForm → assessment_results table

2. AI PLAN GENERATION
   └── ai-assessment-review analyzes results
   └── manage-skill-plan creates personalized plan
       └── Skill plan → catalog items (activities)

3. PARENT REVIEW (optional)
   └── Parent can review/approve generated plan

4. DAILY EXECUTION
   └── generate-daily-plan selects today's activities
   └── SkillPlanDashboard displays activity cards

5. ACTIVITY SESSION
   └── ActivityExecutor runs step-by-step
   └── ai-session-helper tracks start/pause/resume/complete
   └── plan_session_logs stores progress

6. IDLE AUTO-PAUSE
   └── useIdleDetector detects inactivity
   └── isIdle prop flows to ActivityExecutor
   └── Auto-calls pauseSession('idle_timeout')

7. SESSION RESUME
   └── On dashboard load, queries for in_progress/paused sessions
   └── Shows "Resume" banner → reopens ActivityExecutor

8. PARENT REPORTING
   └── DailyProgressReport per child in ParentReports
```

---

## 10. AI Integration

### AI Services Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ ai-chat      │     │ ai-session-  │     │ ai-assessment│
│ (general)    │     │ helper       │     │ -review      │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │
       ▼                    ▼                     ▼
┌──────────────────────────────────────────────────────────┐
│                  llm-with-failover                        │
│  Primary → Fallback provider chain                        │
│  Managed by manage-llm-provider                           │
└──────────────────────┬───────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
  ┌─────────┐    ┌─────────┐    ┌─────────┐
  │ Lovable │    │  Grok   │    │ Other   │
  │ Gateway │    │  API    │    │ LLMs    │
  └─────────┘    └─────────┘    └─────────┘
```

### AI Functions

| Function | Input | Output |
|----------|-------|--------|
| `ai-chat` | User message + conversation history | AI response |
| `ai-session-helper` | Action (start/pause/resume/complete) + session context | Updated session state |
| `ai-assessment-review` | Assessment results | Detailed review with recommendations |
| `generate-daily-plan` | Skill plan + child profile | Today's activity list |
| `grok-chat` | Message | Grok AI response |
| `text-to-speech` | Text string | Audio URL |

### AI Quotas

The `ai_usage_quotas` table controls per-role daily message limits, preventing abuse while allowing educational use.

---

## 11. Security Model

### Defense in Depth

```
Layer 1: CORS
  └── Dynamic origin validation (getCorsHeaders)
  └── No wildcard origins in production

Layer 2: Authentication
  └── Supabase JWT verification
  └── Session timeout management
  └── Activity logging with device fingerprinting

Layer 3: Authorization
  └── Role-based access (user_roles table)
  └── has_role() security definer function
  └── WithAuth component guards

Layer 4: Row Level Security
  └── 65+ policies across 59 tables
  └── Family-based data isolation
  └── Service role for system tables

Layer 5: Input Validation
  └── Zod schemas on all forms
  └── Server-side validation in edge functions
  └── DOMPurify sanitization

Layer 6: Monitoring
  └── Security event logging
  └── Error pattern detection
  └── Admin audit trails
  └── Edge function health checks
```

### Key Security Patterns

1. **Roles in separate table** — Never stored on profiles to prevent privilege escalation
2. **Security definer functions** — Bypass RLS safely for role checking without recursion
3. **Rate limiting** — Per-IP limits on all edge functions
4. **Crypto-secure passwords** — `crypto.getRandomValues()` for generated passwords
5. **CSP hardened** — No `unsafe-inline`/`unsafe-eval` in production

---

## 12. Performance

### Bundle Optimization
- **Vite** with SWC plugin for fast builds
- **Code splitting** via `React.lazy()` on all routes
- **Tree shaking** for unused code elimination
- **rollup-plugin-visualizer** for bundle analysis

### Runtime Performance
- **Zustand selective subscriptions** — 40-60% reduction in re-renders
- **TanStack Query** — Server state caching with stale-while-revalidate
- **Virtual scrolling** — `react-window` for large lists via `useVirtualScrolling`
- **Idle detection** — `useIdleDetector` pauses background work when inactive
- **Skeleton loading** — `PageSkeleton` components for perceived performance

### Database Performance
- **Strategic indexing** on frequently queried columns
- **Materialized views** for analytics aggregation
- **Subquery wrapping** in RLS policies for auth function performance
- **Connection pooling** via Supabase's built-in pooler

---

## 13. Testing Strategy

### Test Stack

| Tool | Purpose | Config |
|------|---------|--------|
| Vitest | Unit/integration tests | `vitest.config.ts` |
| @testing-library/react | Component tests | — |
| @vitest/coverage-v8 | Coverage reports | — |
| Playwright | E2E tests | `playwright.config.ts` |
| Security test suite | RLS + API security | `tests/rls/` |

### Test Organization

```
tests/
├── unit/           # Pure function tests
├── components/     # React component tests
├── hooks/          # Custom hook tests
├── stores/         # Zustand store tests
├── rls/            # RLS policy verification
└── integration/    # API integration tests

tests-e2e/
├── auth/           # Authentication flows
├── admin/          # Admin operations
├── parent/         # Parent workflows
└── kids/           # Kids portal flows
```

### Key Testing Patterns
- **RLS test suite** — Verifies database policies behave correctly per role
- **Auth E2E coverage** — Comprehensive auth flow testing (see `AUTH_E2E_COVERAGE_REPORT.md`)
- **Security testing** — Automated via `security-testing` edge function
- **Fixture-based** — `playwright-fixture.ts` provides authenticated contexts

---

## 14. Documentation System

### Automated Documentation Pipeline

The project maintains 35 documentation files synchronized with source code through an automated system:

```
src/config/docRegistry.ts     ← Registry of all docs + watch patterns
scripts/extractors/            ← File counters, tree generators, export parsers
scripts/services/              ← DocumentationUpdateService
scripts/update-docs.ts         ← CLI entry point
```

### Extractor Types
- `countFiles` — File counts with extension/directory breakdown
- `generateTree` — Markdown directory tree
- `listExports` — Exported function/class listing
- `extractInterfaces` / `extractInterfacesAST` — TypeScript interface extraction
- `listEdgeFunctions` — Edge function enumeration
- `countTestFiles` — Test file counting
- `jsDocCoverage` — JSDoc coverage metrics

### Running Documentation Updates

```bash
npm run docs:update            # Update all docs
npm run docs:check             # CI: exit 1 if outdated
npm run docs:update -- --dry-run --verbose  # Preview changes
npm run docs:update -- --filter=hooks       # Category filter
```

---

## 15. Appendix

### A. Complete Hook Reference (58 hooks)

| Hook | Category |
|------|----------|
| `useAuth` | Auth |
| `useAdminAuth` | Auth |
| `useAuthForm` | Auth |
| `useAuthLogging` | Auth |
| `useAuthNavigation` | Auth |
| `useAuthE2ECoverage` | Auth / Testing |
| `useLoginRateLimiter` | Auth / Security |
| `useAIChat` | AI |
| `useActivitySession` | AI / Sessions |
| `useSkillPlanManager` | Skill Plans |
| `useDailyPlan` | Skill Plans |
| `useCatalogCache` | Skill Plans |
| `useGameSession` | Games |
| `useAnalytics` | Analytics |
| `useAnalyticsWithSession` | Analytics |
| `usePrivacyAwareBehavioralTracking` | Analytics / Privacy |
| `useSecureBehavioralSummary` | Analytics / Security |
| `useDataHealthScore` | Monitoring |
| `useEdgeFunctionHealth` | Monitoring |
| `useEdgeFunctionHealthHistory` | Monitoring |
| `useSystemMonitoring` | Monitoring |
| `useUptimeStats` | Monitoring |
| `useErrorTracking` | Errors |
| `useErrorBoundary` | Errors |
| `useErrorBoundaryLogging` | Errors |
| `useAutoErrorLogging` | Errors |
| `useChoreManagement` | Chores |
| `useChorePhotoUpload` | Chores |
| `useGamification` | Gamification |
| `useCelebration` | Gamification |
| `useCertificateGenerator` | Gamification |
| `useStarProgress` | Progress |
| `useProgress` | Progress |
| `useChildProfile` | Kids |
| `useChildAvatar` | Kids |
| `useKidsContentLoader` | Kids |
| `useIdleDetector` | UX |
| `useGrokTextToSpeech` | AI / TTS |
| `useTextToSpeech` | AI / TTS |
| `useIllustration` | UI |
| `useNavigationGuard` | Navigation |
| `useParentPortalGuard` | Navigation |
| `useAdminSearch` | Admin |
| `useAdminDebug` | Admin |
| `useIntegrityManagement` | Data |
| `useOnlineStatus` | Connectivity |
| `useWindowSize` | Layout |
| `use-mobile` | Layout |
| `useInterval` | Utility |
| `useRetryWithBackoff` | Utility |
| `useAsyncOperation` | Utility |
| `useStoreResult` | Utility |
| `useVirtualScrolling` | Performance |
| `usePerformanceMonitoringSafe` | Performance |
| `usePerformanceMonitoringWrapper` | Performance |
| `useSiteSettings` | Config |
| `usePrivacyConsent` | Privacy |
| `use-toast` | UI |

### B. Store Reference (18 stores)

| Store | File | Domain |
|-------|------|--------|
| `useAuthStore` | `authStore.ts` | Auth |
| — | `authActionsStore.ts` | Auth |
| — | `authRoleStore.ts` | Auth |
| — | `authSessionStore.ts` | Auth |
| `useUIStore` | `uiStore.ts` | UI |
| `useAdminStore` | `adminStore.ts` | Admin |
| `useChoreStore` | `choreStore.ts` | Domain |
| `useGamificationStore` | `gamificationStore.ts` | Domain |
| `useConnectionStore` | `connectionStore.ts` | Domain |
| `useGameSessionStore` | `gameSessionStore.ts` | Domain |
| `useLessonProgressStore` | `lessonProgressStore.ts` | Domain |
| — | `testResultsStore.ts` | Domain |
| `useAnalyticsStore` | `analyticsStore.ts` | Analytics |
| `useBehaviorAnalyticsStore` | `behaviorAnalyticsStore.ts` | Analytics |
| `usePerformanceAnalyticsStore` | `performanceAnalyticsStore.ts` | Analytics |
| `useProgressAnalyticsStore` | `progressAnalyticsStore.ts` | Analytics |
| `useSystemHealthStore` | `systemHealthStore.ts` | System |

### C. Edge Function Reference (32 functions)

See [Chapter 7](#7-backend-edge-functions) for the complete categorized table.

### D. Glossary

| Term | Definition |
|------|-----------|
| **RLS** | Row Level Security — PostgreSQL feature enforcing data access at the row level |
| **Security Definer** | PostgreSQL function executing with creator's privileges, bypassing RLS |
| **Edge Function** | Serverless Deno function deployed to Supabase |
| **Skill Plan** | AI-generated personalized learning plan for a child |
| **Catalog Item** | A single activity within a skill plan |
| **Session Log** | Record of a child's progress through an activity |
| **Portal** | Role-specific UI area (Admin, Parent, Kids) |
| **Family Code** | Unique identifier for a family (FAM-YYYY-###) |

---

*This document is automatically registered in `src/config/docRegistry.ts` for date tracking.*
