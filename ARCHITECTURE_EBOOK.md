# Chatterbox Architecture Ebook
**Comprehensive Technical Reference**

> **Last Updated:** 2026-03-24  
> **Version:** 4.0  
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
10. [Games & Chores Catalog](#10-games--chores-catalog)
11. [AI Integration](#11-ai-integration)
12. [Security Model](#12-security-model)
13. [Performance](#13-performance)
14. [Testing Strategy](#14-testing-strategy)
15. [Documentation System](#15-documentation-system)
16. [Appendix](#16-appendix)

---

## 1. Executive Summary

**Chatterbox** is a comprehensive web platform designed to empower children with autism through technology, education, and family connection. It provides a gamified learning environment where children complete skill-building activities, chores, and educational games — all supervised by parents and powered by AI-generated personalized learning plans.

### Key Metrics

| Metric | Value |
|--------|-------|
| Custom React Hooks | 54 |
| Zustand Stores | 18 |
| Edge Functions | 32 |
| Database Tables | 59 |
| TypeScript Type Files | 27 |
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

### Shared Utilities (`_shared/` — 10 modules)

All edge functions share common utilities:
- `cors.ts` — Dynamic origin validation via `getCorsHeaders(origin)`
- `auth-validator.ts` — JWT verification, `validateAdminJWT()`, role checking
- `rate-limiter.ts` — Per-IP rate limiting with configurable windows
- `api-types.ts` — Shared TypeScript interfaces
- `email-sender.ts` — Email sending via Resend
- `email-templates.ts` — HTML email template rendering
- `password-validator.ts` — Crypto-secure password generation & validation
- `scheduler-validator.ts` — `X-Scheduler-Secret` header validation for cron functions
- `security-headers.ts` — Standard security headers
- `wide-event.ts` — `withWideEvent()` structured logging for all functions

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

## 10. Games & Chores Catalog

This chapter provides a comprehensive catalog of all interactive games, activities, and chore templates available in the platform, with detailed skill alignment mappings.

### 10.1 SkillQuest Game System Overview

The SkillQuest system provides **80+ interactive game variants** plus **12 standalone bonus games** across **12 skill domains**. Games use 5 core mechanics: **Match**, **Sort**, **Sequence**, **Odd-One-Out**, and **Fill-in-the-Blank**. Each game variant emphasizes specific mechanics via weighted challenge generation. Difficulty adapts automatically via `useAdaptiveDifficulty` (easy/medium/hard).

**Source**: `src/components/games/shared/skillGameData.ts`

### 10.2 Skill Domains & Game Variants

#### 💬 Communication & AAC (8 variants + 1 bonus)

| Game | Mechanics | Skills Targeted | Description |
|------|-----------|----------------|-------------|
| Word Matcher | Match, Odd-one-out | Vocabulary recognition, symbol-word association | Match symbols to their words |
| Greeting Sorter | Sort, Odd-one-out | Social greetings, polite language categories | Sort greetings, requests & responses |
| Needs Finder | Odd-one-out, Fill-blank | Expressing needs, emotional vocabulary | Find the odd one out from needs & feelings |
| Conversation Builder | Sequence, Fill-blank | Conversational turn-taking, pragmatic language | Put conversation steps in order |
| Polite Words | Match, Odd-one-out | Manners, social etiquette | Match polite words to their meanings |
| AAC Board Match | Match, Fill-blank | AAC symbol recognition, picture communication | Match AAC picture symbols to words |
| Symbol Sentence Builder | Sequence, Fill-blank | Sentence construction, AAC fluency | Put symbols in order to make a sentence |
| PECS Sorter | Sort, Odd-one-out | PECS categorization, picture exchange | Sort picture cards into categories |
| 🔔 Sound Match (bonus) | Sounds game | Auditory processing, sound-picture association | Listen & match sounds to pictures |

#### 🤝 Social Skills (8 variants + 1 bonus)

| Game | Mechanics | Skills Targeted | Description |
|------|-----------|----------------|-------------|
| Emotion Explorer | Sort, Odd-one-out | Emotion identification, categorization | Sort emotions: positive, negative, neutral |
| Social Skills Match | Match, Fill-blank | Social skill recognition | Match social skills to their symbols |
| Feeling Detective | Odd-one-out, Match | Emotional discrimination | Find the feeling that doesn't belong |
| Friendship Builder | Sort, Odd-one-out | Prosocial behavior identification | Sort friendly vs unfriendly behaviors |
| Face Reader | Match, Fill-blank | Facial expression reading, empathy | Match faces to the right emotion name |
| Social Story Sequencer | Sequence, Fill-blank | Social narrative comprehension | Put social story steps in order |
| Friendship Scenario | Odd-one-out, Match, Fill-blank | Social decision-making | Choose the best friendly response |
| Behavior Sorter | Sort, Odd-one-out | Behavioral self-regulation | Sort behaviors: helpful vs unhelpful |
| 🃏 Emotion Memory (bonus) | Memory game | Emotion recall, visual memory | Flip cards to match emotion pairs |

#### 🌈 Sensory Regulation (5 variants + 2 bonuses)

| Game | Mechanics | Skills Targeted | Description |
|------|-----------|----------------|-------------|
| Five Senses Sorter | Sort, Odd-one-out | Sensory categorization, body awareness | Sort items by sense: touch, taste, sound |
| Opposites Finder | Match, Odd-one-out | Sensory vocabulary, contrast understanding | Match sensory opposites: hot/cold, loud/quiet |
| Sense Detective | Odd-one-out, Fill-blank | Sensory discrimination | Find what doesn't belong in each sense |
| Texture Match | Match, Sort | Tactile vocabulary, texture identification | Match textures: soft, rough, smooth, squishy |
| Calm or Alert? | Sort, Odd-one-out | Self-regulation, arousal level awareness | Determine if a sense is calming or alerting |
| 🧠 Sensory Memory (bonus) | Memory game | Sensory recall | Match sensory pairs from memory |
| 🎵 Sound Sorter (bonus) | Sounds game | Auditory discrimination | Listen to sounds & find the match |

#### 🧩 Executive Function (5 variants + 1 bonus)

| Game | Mechanics | Skills Targeted | Description |
|------|-----------|----------------|-------------|
| Morning Routine | Sequence, Fill-blank | Routine following, time management | Put morning steps in order |
| Bedtime Routine | Sequence, Fill-blank | Routine adherence, transitions | Order the bedtime steps correctly |
| Task Planner | Fill-blank, Sequence | Task planning, step prediction | What step comes next? Fill the blank |
| Snack Time Steps | Sequence, Fill-blank | Independence, sequencing | Order the steps to make a snack |
| Routine Mixer | Sort, Odd-one-out | Routine categorization, flexibility | Sort steps into the right routine |
| 🔮 Sequence Spotter (bonus) | Pattern game | Pattern recognition, prediction | Spot the pattern in the sequence |

#### 🏠 Daily Living / Daily Routines (7 variants + 1 bonus)

| Game | Mechanics | Skills Targeted | Description |
|------|-----------|----------------|-------------|
| Room Sorter | Sort, Odd-one-out | Environmental awareness, categorization | Sort items into the right rooms |
| What's Missing? | Fill-blank, Odd-one-out | Visual scanning, memory | Find the missing item in each room |
| Odd Item Out | Odd-one-out, Match | Categorization, logical reasoning | Which item doesn't belong in this room? |
| Kitchen Helper | Match, Odd-one-out | Kitchen vocabulary, domestic skills | Match kitchen items to their names |
| Getting Dressed | Sort, Odd-one-out | Self-care, categorization | Sort clothing items vs bathroom items |
| Visual Schedule Builder | Sequence, Fill-blank | Schedule comprehension, independence | Build a visual schedule for your day |
| Routine Timer Sort | Sort, Sequence | Time concepts, daily structure | Sort activities by when you do them |
| 🏡 Home Memory (bonus) | Memory game | Object recall, spatial memory | Flip & match household item pairs |

#### 💖 Emotional Regulation (8 variants)

| Game | Mechanics | Skills Targeted | Description |
|------|-----------|----------------|-------------|
| Feelings Meter | Sort, Odd-one-out | Emotion intensity awareness | Sort feelings by intensity: low, medium, high |
| Coping Toolbox | Match, Fill-blank | Coping strategy identification | Match calming strategies to their symbols |
| Zone Check | Odd-one-out, Sort | Zones of Regulation awareness | Is this feeling calm, medium, or big? |
| Calm Down Steps | Sequence, Fill-blank | Self-regulation sequencing | Put calming steps in the right order |
| Big vs Small Feelings | Sort, Odd-one-out | Emotional magnitude discrimination | Sort big feelings from small feelings |
| Emotion Scenario | Match, Odd-one-out | Emotional perspective-taking | Match feelings to situations |
| Trigger Identifier | Odd-one-out, Sort | Trigger awareness, prevention | Find what might cause big feelings |
| Calm Plan Builder | Sequence, Fill-blank | Self-regulation planning | Build your own calming plan step by step |

#### 🏃 Motor Skills (5 variants + 1 bonus)

| Game | Mechanics | Skills Targeted | Description |
|------|-----------|----------------|-------------|
| Body Part Match | Sort, Match | Body awareness, movement categorization | Match actions to hands, body, or legs |
| Action Hero | Match, Odd-one-out | Action vocabulary, movement identification | Match the action to its emoji |
| Coordination Challenge | Odd-one-out, Fill-blank | Coordination awareness, fine motor concepts | Find the odd action out |
| Hand Gym | Match, Fill-blank | Fine motor skill recognition | Match fine motor actions |
| Movement Sequence | Sequence, Fill-blank | Gross motor planning, sequencing | Put movements in order to make a routine |
| 🥁 Action Sounds (bonus) | Sounds game | Auditory-motor association | Match action sounds to movements |

#### 📚 Academic Readiness (5 variants + 1 bonus)

| Game | Mechanics | Skills Targeted | Description |
|------|-----------|----------------|-------------|
| Shape Sorter | Sort, Odd-one-out | Shape recognition, categorization | Sort shapes, letters & numbers |
| Color Match | Match, Odd-one-out | Color recognition, naming | Match colors to their names |
| Number Sequence | Sequence, Fill-blank | Counting, number order | Put numbers in the right order |
| Letter Detective | Odd-one-out, Match | Letter recognition, discrimination | Find which letter doesn't belong |
| Math Symbols | Match, Fill-blank | Math symbol recognition | Match math symbols to their names |
| 🧩 Pattern Spotter (bonus) | Pattern game | Pattern recognition, prediction | Find the pattern & pick what comes next |

#### 🗣️ Speech Therapy (5 variants + 1 bonus)

| Game | Mechanics | Skills Targeted | Description |
|------|-----------|----------------|-------------|
| Sound Matcher | Match, Odd-one-out | Sound-mouth shape association, oral motor | Match sounds to mouth shapes |
| Mouth Shape Sort | Sort, Odd-one-out | Oral motor awareness, articulation prep | Sort mouth shapes vs sounds |
| Rhyme Finder | Match, Odd-one-out | Phonological awareness, rhyming | Find the words that rhyme |
| Word Builder | Sequence, Fill-blank | Word formation, phonemic awareness | Build words step by step |
| Articulation Challenge | Odd-one-out, Match, Fill-blank | Articulation practice, speech fluency | Practice tricky sounds & syllables |
| 🗣️ Speech Sounds Pattern (bonus) | Pattern game | Speech sound patterns | Spot patterns in speech sounds |

#### 📖 Storytelling (5 variants + 1 bonus)

| Game | Mechanics | Skills Targeted | Description |
|------|-----------|----------------|-------------|
| Story Starter | Match, Sort, Odd-one-out | Narrative initiation, story elements | Pick elements to start a story |
| Character Match | Match, Odd-one-out | Character identification | Match characters to their descriptions |
| Setting Sorter | Sort, Odd-one-out | Setting vs object discrimination | Sort story settings from objects |
| Plot Sequencer | Sequence, Fill-blank | Narrative sequencing, cause-effect | Put story events in the right order |
| Story Detective | Odd-one-out, Match | Narrative coherence, critical thinking | Find what doesn't belong in the story |
| 📖 Story Memory (bonus) | Memory game | Story element recall | Flip cards to match story element pairs |

#### 🎓 Educational Learning (5 variants + 1 bonus)

| Game | Mechanics | Skills Targeted | Description |
|------|-----------|----------------|-------------|
| Alphabet Adventure | Sequence, Fill-blank | Letter sequencing, alphabetical order | Sort and sequence letters |
| Counting Quest | Sequence, Fill-blank | Number sequencing, counting | Count and sequence numbers |
| Science Sorter | Sort, Odd-one-out | Scientific categorization | Sort science items by category |
| Reading Match | Match, Fill-blank | Reading tool identification | Match reading tools to their names |
| Knowledge Detective | Odd-one-out, Match | Subject discrimination | Find what doesn't belong in each subject |
| 🎓 Learning Patterns (bonus) | Pattern game | Academic pattern recognition | Find patterns in letters & numbers |

#### 🧠 Cognitive Development (5 variants + 1 bonus)

| Game | Mechanics | Skills Targeted | Description |
|------|-----------|----------------|-------------|
| Brain Trainer | Match, Fill-blank | Memory skills, cognitive recall | Train your memory with matching |
| Memory Challenge | Fill-blank, Odd-one-out | Working memory, visual memory | Remember and find what's missing |
| Focus Finder | Odd-one-out, Match | Sustained attention, focus | Find the odd one out — stay focused |
| Logic Puzzle | Sort, Odd-one-out | Logical reasoning, categorization | Sort logic tools by type |
| Pattern Thinker | Sequence, Fill-blank | Pattern recognition, sequential reasoning | Find patterns and complete sequences |
| 🧠 Cognitive Memory (bonus) | Memory game | Memory training | Train your memory with card pairs |

### 10.3 Standalone Bonus Games (12 total)

These use dedicated game engines (Memory Match, Pattern Match, Sounds Match) rather than the SkillQuest challenge system:

| Game | Engine | Domain | Skills | Description |
|------|--------|--------|--------|-------------|
| Emotion Memory | Memory Match | Social Skills | Emotion recall, visual memory | Flip cards to match emotion pairs |
| Sensory Memory | Memory Match | Sensory | Sensory recall, concentration | Match sensory pairs from memory |
| Home Memory | Memory Match | Daily Living | Object recall, spatial memory | Flip & match household item pairs |
| Story Memory | Memory Match | Storytelling | Narrative element recall | Flip cards to match story elements |
| Cognitive Memory | Memory Match | Cognitive Dev | Memory training, concentration | Train memory with card pairs |
| Pattern Spotter | Pattern Match | Academic | Pattern recognition, prediction | Find the pattern & pick what comes next |
| Sequence Spotter | Pattern Match | Executive Function | Sequential reasoning | Spot the pattern in the sequence |
| Speech Sounds Pattern | Pattern Match | Speech Therapy | Speech sound patterns | Spot patterns in speech sounds |
| Learning Patterns | Pattern Match | Educational Learning | Academic patterns | Find patterns in letters & numbers |
| Sound Match | Sounds Match | Communication | Auditory processing | Listen & match sounds to pictures |
| Sound Sorter | Sounds Match | Sensory | Auditory discrimination | Listen to sounds & find the match |
| Action Sounds | Sounds Match | Motor Skills | Auditory-motor association | Match action sounds to movements |

### 10.4 Game Mechanics Reference

| Mechanic | Description | Clinical Alignment |
|----------|-------------|-------------------|
| **Match** | Pair symbols to their labels/descriptions | Vocabulary, recognition, association |
| **Sort** | Drag items into categorical groups | Categorization, discrimination, executive function |
| **Sequence** | Arrange items in correct order | Planning, temporal reasoning, routine learning |
| **Odd-One-Out** | Identify the item that doesn't belong | Critical thinking, categorization, attention |
| **Fill-in-the-Blank** | Complete a sequence with the missing item | Working memory, prediction, pattern completion |

### 10.5 Adaptive Difficulty System

| Level | Rounds | Items per Challenge | Target Audience |
|-------|--------|-------------------|-----------------|
| Easy | 3 | 3-4 items | Beginners, ages 3-5 |
| Medium | 5 | 4-5 items | Intermediate, ages 6-8 |
| Hard | 7 | 5-6 items | Advanced, ages 9-12 |

The `useAdaptiveDifficulty` hook tracks accuracy history per game and auto-adjusts difficulty up/down based on performance trends.

### 10.6 Chore System

#### Database Tables

| Table | Purpose |
|-------|---------|
| `chore_categories` | Category definitions with icons, colors, autism-friendly feature flags |
| `chore_templates` | Reusable chore blueprints with instructions, difficulty, age ranges |
| `chores` | Family-specific chore instances (from templates or custom) |
| `chore_assignments` | Assigned chores with status tracking, due dates, recurrence |
| `chore_completions` | Completion records with points, ratings, photos, duration |

#### Chore Categories & Skill Alignment

| Category | Icon | Skills Developed | Autism Accommodations |
|----------|------|-----------------|----------------------|
| Bathroom | 🛁 | Self-care, hygiene routines, independence | Visual schedules, step-by-step instructions |
| Kitchen | 🍳 | Daily living, following instructions, safety | Simplified steps, break reminders |
| Bedroom | 🛏️ | Organization, routine adherence, responsibility | Visual checklists, sensory-friendly materials |
| Cleaning | 🧹 | Motor skills, task completion, following steps | Timer breaks, noise considerations |
| Outdoor | 🌿 | Gross motor, sensory exploration, nature connection | Sensory preparation, flexible timing |
| Personal Care | 🧼 | Self-care independence, health habits | Visual aids, social stories |
| School Prep | 🎒 | Executive function, time management, organization | Visual timers, task chunking |
| Social Tasks | 🤝 | Social skills, cooperation, empathy | Social stories, role modeling |

#### Chore Difficulty Levels

| Difficulty | Base Points | Estimated Duration | Target Age |
|------------|------------|-------------------|------------|
| Easy | 5 pts | 5-10 min | 3-6 years |
| Medium | 10 pts | 10-20 min | 6-10 years |
| Hard | 20 pts | 20-30 min | 10+ years |

#### Autism-Friendly Chore Features

Each chore supports configurable accommodations via `AutismFriendlyFeatures`:

- **Visual Schedules**: Step-by-step visual instructions with optional photo guides
- **Break Reminders**: Configurable break intervals and durations during chores
- **Sensory Considerations**: Noise level ratings, lighting preferences, texture warnings
- **Social Stories**: Pre-chore social narratives explaining what to expect
- **Custom Instructions**: Simplified or alternative instructions per child
- **Communication Style**: Visual, auditory, or tactile instruction preference

#### Recurrence Patterns

Chores support flexible scheduling via `RecurrencePattern`:
- **Daily**: Every day or every N days
- **Weekly**: Specific days of the week
- **Custom**: Configurable intervals with skip weekends option
- **Time of Day**: Morning, afternoon, or evening scheduling

#### Gamification Integration

| Feature | Points Source | Description |
|---------|-------------|-------------|
| Base completion | `base_points` on template | Points for completing any chore |
| Time bonus | Completion under estimated duration | Bonus for finishing early |
| Streak bonus | `daily_streaks` table | Multiplier for consecutive days |
| Difficulty bonus | Higher difficulty = more points | Encourages challenge progression |
| Photo verification | Parent review of completion photos | Optional proof of completion |
| Parent feedback | Satisfaction + difficulty ratings | Qualitative completion data |

### 10.7 Content Pipeline Summary

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  80+ Game    │     │  12 Bonus    │     │   Chore      │
│  Variants    │     │  Standalone  │     │  Templates   │
│  (SkillQuest)│     │  Games       │     │  (DB-driven) │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │
       ▼                    ▼                     ▼
┌──────────────────────────────────────────────────────────┐
│              content_items table (public catalog)         │
│  Tags: domain, age range, autism features, skill levels   │
└──────────────────────────┬───────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Public   │    │ Kids     │    │ Parent   │
    │ Catalog  │    │ Portal   │    │ Curation │
    │ (/games) │    │ (plans)  │    │ (assign) │
    └──────────┘    └──────────┘    └──────────┘
```

---

## 11. AI Integration

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

## 12. Security Model

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

## 13. Performance

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

## 14. Testing Strategy

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

## 15. Documentation System

### Automated Documentation Pipeline

The project maintains 42 documentation files synchronized with source code through an automated system:

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

## 16. Appendix

### A. Complete Hook Reference (54 hooks)

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
| — | `triageTicketStore.ts` | System |

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

## 17. ConnectSphere Integration (NDBI/PMI Research)

### Research Basis

The ConnectSphere integration brings research-backed autism early intervention features from the NDBI (Naturalistic Developmental Behavioral Interventions) and ESDM (Early Start Denver Model) frameworks into Chatterbox.

### New Components

| Component | File | Purpose |
|-----------|------|---------|
| **QuickNeedsChatBar** | `src/components/kids/QuickNeedsChatBar.tsx` | Persistent bottom AAC bar with one-tap buttons (Help, Hungry, Thirsty, Potty, All Done, Hurt) and text-to-speech output |
| **DailyRoutineTimeline** | `src/components/kids/DailyRoutineTimeline.tsx` | Visual step-by-step daily routine with expandable sub-steps, integrates with chore assignments |
| **FavoriteThingsSidebar** | `src/components/kids/FavoriteThingsSidebar.tsx` | Collapsible right panel with quick-access learning modules (ABC, 123, Colors, Shapes, etc.) |
| **RealWorldMissions** | `src/components/kids/RealWorldMissions.tsx` | Card-based offline activity suggestions bridging digital skills to real-life interactions |

### New Game Variants (ConnectSphere-aligned)

| Variant ID | Domain | Description | Clinical Alignment |
|-----------|--------|-------------|-------------------|
| `acad-abc-explorer` | Educational Learning | Letter recognition and phonics matching | ESDM language goals |
| `acad-number-fun` | Educational Learning | Counting sequences and number identification | Academic readiness |
| `acad-colors-shapes` | Educational Learning | Color/shape sorting and matching | Visual discrimination |
| `soc-my-family` | Social Skills | Family member recognition and matching | Joint attention (NDBI) |
| `soc-sharing-turns` | Social Skills | Turn-taking social story interactive | Peer interaction (PMI) |
| `comm-object-id` | Communication | Object-to-name matching | Receptive language |
| `comm-needs-express` | Communication | AAC needs expression matching | Functional communication |

### Architecture Integration

```
Kids Portal Layout (updated)
├── KidsProgressHeader
├── DailyRoutineTimeline ← NEW (chores as visual routine)
├── SkillPlanDashboard (existing)
├── RealWorldMissions ← NEW (post-activity suggestions)
├── SkillGamesBrowser (existing, + 7 new ConnectSphere variants)
├── FavoriteThingsSidebar ← NEW (right panel, fixed position)
└── QuickNeedsChatBar ← NEW (fixed bottom bar, always visible)
```

### AAC Chat Bar Features
- **Text-to-Speech**: Uses `speechSynthesis` Web API for voice output
- **Large Touch Targets**: 64px minimum touch area for motor accessibility
- **Color-Coded**: Each need has a distinct color for visual discrimination
- **Customizable**: Extensible button array for personalized needs

### Real World Missions
- Bridges digital learning to real-life activities
- Generated from a pool of 12 domain-specific missions
- Random selection of 3 daily missions with refresh capability
- Parent-verifiable completion tracking

---

*This document is automatically registered in `src/config/docRegistry.ts` for date tracking.*
