import { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, Search, ChevronRight, ChevronDown, 
  ArrowUp, Layers, Database, Shield, 
  Brain, TestTube, FileText, Zap, Users,
  Lock, Gauge, BookMarked, Download, Gamepad2
} from 'lucide-react';

// Full ebook content embedded as structured chapters
const chapters = [
  {
    id: 'executive-summary',
    title: '1. Executive Summary',
    icon: BookMarked,
    content: `**Chatterbox** is a comprehensive web platform designed to empower children with autism through technology, education, and family connection. It provides a gamified learning environment where children complete skill-building activities, chores, and educational games — all supervised by parents and powered by AI-generated personalized learning plans.

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
| Testing | Vitest, Playwright, Testing Library |`
  },
  {
    id: 'system-architecture',
    title: '2. System Architecture',
    icon: Layers,
    content: `### High-Level Overview

\`\`\`
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
\`\`\`

### Request Flow

1. User interacts with React SPA
2. Component triggers Zustand action or TanStack Query
3. Supabase SDK sends authenticated request (JWT in header)
4. For direct DB operations: Supabase REST API with RLS enforcement
5. For complex logic: Edge Function → service role client → database
6. Response flows back through the same chain`
  },
  {
    id: 'frontend-architecture',
    title: '3. Frontend Architecture',
    icon: Layers,
    content: `### Component Hierarchy

The application uses 24 component directories organized by domain:

| Directory | Purpose | Count |
|-----------|---------|-------|
| admin/ | Admin dashboard panels, dialogs, tables | 30+ |
| analytics/ | Charts, metrics, dashboards | 15+ |
| ai/ | AI assistant chat interface | 1 |
| assessment/ | Assessment forms, results, PDF export | 3 |
| auth/ | Sign in/up, password reset, role guards | 10+ |
| chores/ | Chore cards, assignment UI, completion | 10+ |
| composition/ | WithAuth, AsyncContent, ConditionalRender | 5+ |
| games/ | Educational game components | 10+ |
| kids/ | Kids Portal: layout, cards, executor, dashboard | 12 |
| ui/ | Shadcn/Radix base components | 40+ |

### Composition Patterns

The project uses Higher-Order Component patterns for cross-cutting concerns:

\`\`\`typescript
// WithAuth — role-based route protection
<WithAuth requiredRole="parent">
  <ParentDashboard />
</WithAuth>

// RequireAuth — simple auth check
<RequireAuth>
  <ProtectedContent />
</RequireAuth>
\`\`\`

### Lazy Loading Strategy

All route-level pages use React.lazy() with Suspense boundaries. PageSkeleton component shows during loading. Critical paths (auth, index) are eagerly loaded.`
  },
  {
    id: 'state-management',
    title: '4. State Management',
    icon: Database,
    content: `### 18 Zustand Stores by Domain

#### Auth Domain (4 stores)
| Store | Responsibility |
|-------|---------------|
| authStore | Core auth state: user, session, profile, loading |
| authActionsStore | Sign in/up/out actions, password reset |
| authRoleStore | Role checking: isAdmin, isParent, isChild |
| authSessionStore | Session management, timeout, refresh |

#### Domain Stores (5 stores)
| Store | Responsibility |
|-------|---------------|
| choreStore | Chore CRUD, assignments, completions |
| gamificationStore | Points, levels, achievements, streaks |
| connectionStore | Family connections, invitations, permissions |
| gameSessionStore | Active game session tracking |
| lessonProgressStore | Lesson/activity progress tracking |

#### Analytics Domain (4 stores)
| Store | Responsibility |
|-------|---------------|
| analyticsStore | System-wide analytics with caching |
| behaviorAnalyticsStore | Privacy-compliant behavioral tracking |
| performanceAnalyticsStore | Performance metrics & optimization |
| progressAnalyticsStore | Progress milestones & insights |

#### System Stores (3 stores)
| Store | Responsibility |
|-------|---------------|
| adminStore | Admin operations, system metrics |
| systemHealthStore | Health monitoring, alerts |
| testResultsStore | Assessment/test results |

#### UI Store (1 store)
| Store | Responsibility |
|-------|---------------|
| uiStore | Loading states, error display, modal management |

### Design Principles

1. **Single Source of Truth**: Each domain has exactly one store
2. **Minimal State**: Only globally-needed state enters stores
3. **Selective Subscriptions**: Components subscribe to specific slices, reducing re-renders by 40-60%
4. **DevTools**: Redux DevTools integration for time-travel debugging
5. **Template Pattern**: _storeTemplate.ts ensures consistency`
  },
  {
    id: 'routing-navigation',
    title: '5. Routing & Navigation',
    icon: ChevronRight,
    content: `### Portal System

\`\`\`
/                    → Landing page (PortalSelection)
/auth                → Authentication (sign in/up)
/about, /features/*  → Public pages

/admin/*             → Admin Portal (requires admin role)
  /admin/dashboard   → System overview
  /admin/users       → User management
  /admin/families    → Family management
  /admin/security    → Security center
  /admin/content     → Content moderation
  /admin/environment → Backend target & secrets status

/parent/*            → Parent Portal (requires parent role)
  /parent/dashboard  → Family overview
  /parent/reports    → Reports + Daily Progress
  /parent/settings   → Family settings

/kids                → Kids Portal (requires child role)
  → Assessment gate → Skill plan dashboard → Activity executor

/connect/*           → Family connection flows
/support/*           → Support pages
\`\`\`

### Route Guards

Routes are protected by WithAuth and role-specific guards:
- **useAdminAuth** — verifies admin role server-side via has_role RPC
- **useParentPortalGuard** — ensures parent role + family membership
- **WithAuth** component — generic role-based protection with redirect`
  },
  {
    id: 'auth-authorization',
    title: '6. Authentication & Authorization',
    icon: Lock,
    content: `### Auth Flow

\`\`\`
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
\`\`\`

### Role System

| Role | Scope | Access |
|------|-------|--------|
| admin | Global | All data, system config, user management |
| parent | Family | Own family data, child management, chore creation |
| child | Personal | Own data within family context, content interaction |
| read_only | Audit | Read-only access for extended connections |

**Critical**: Roles are stored in user_roles table (never on profiles). Role checking uses has_role() security definer function to prevent RLS recursion.`
  },
  {
    id: 'edge-functions',
    title: '7. Backend: Edge Functions',
    icon: Zap,
    content: `### 32 Edge Functions by Category

#### Admin Functions (5)
| Function | Auth | Purpose |
|----------|------|---------|
| admin-create-user | Admin JWT | Create users with crypto-secure passwords |
| admin-delete-user | Admin JWT | Delete users with full cascade cleanup |
| admin-update-user | Admin JWT | Update user profiles and roles |
| admin-add-family-member | Admin JWT | Add member to existing family |
| admin-remove-family-member | Admin JWT | Remove member from family |

#### AI Functions (7)
| Function | Auth | Purpose |
|----------|------|---------|
| ai-chat | JWT | General AI chat via Lovable gateway |
| ai-session-helper | JWT | Start/pause/resume/complete activity sessions |
| ai-assessment-review | JWT | AI review of child assessments |
| generate-daily-plan | JWT | Generate daily activities from skill plan |
| grok-chat | JWT | Grok AI integration |
| llm-with-failover | Service | LLM calls with automatic provider failover |
| manage-llm-provider | Admin JWT | Configure LLM provider settings |

#### Monitoring Functions (7)
| Function | Auth | Purpose |
|----------|------|---------|
| edge-function-health-check | Service | Health check for all edge functions |
| scheduled-health-check | Service | Cron-triggered health monitoring |
| error-collector | Service | Collect frontend errors |
| security-monitoring | Service | Security event logging & alerting |
| security-testing | Admin | Run security test suite |
| data-health-alerter | Service | Data health score alerting |
| api-integration-status | JWT | Check API integration status; \`environment\` action reports local/hosted + secret presence |

### Shared Utilities (\`_shared/\` — 10 modules)
- \`cors.ts\` — Dynamic origin validation
- \`auth-validator.ts\` — JWT verification, \`validateAdminJWT()\`, role checking
- \`rate-limiter.ts\` — Per-IP rate limiting with configurable windows
- \`api-types.ts\` — Shared TypeScript interfaces
- \`email-sender.ts\` — Email sending via Resend
- \`email-templates.ts\` — HTML email template rendering
- \`password-validator.ts\` — Crypto-secure password generation & validation
- \`scheduler-validator.ts\` — \`X-Scheduler-Secret\` header validation for cron functions
- \`security-headers.ts\` — Standard security headers
- \`wide-event.ts\` — \`withWideEvent()\` structured logging for all functions`
  },
  {
    id: 'database-schema',
    title: '8. Database Schema',
    icon: Database,
    content: `### Table Categories (59 tables)

| Category | Tables | Description |
|----------|--------|-------------|
| Auth & Users | profiles, user_roles, user_sessions | User identity and roles |
| Family | families, family_connections, family_activity_logs, child_accounts, child_avatars | Family structure |
| Content | content_categories, content_items, content_interactions, content_favorites | Educational content |
| Chores | chores, chore_templates, chore_categories, chore_assignments, chore_completions | Task management |
| Gamification | achievements, daily_streaks, certificates, family_challenges | Rewards system |
| Assessment | assessment_results | Child assessments |
| Analytics | analytics_metrics, analytics_insights, behavioral_events, engagement_metrics, daily_analytics_data | Data analytics |
| AI | ai_conversations, ai_messages, ai_usage_quotas | AI chat history |
| Monitoring | edge_function_health_logs, edge_function_uptime_daily, error_patterns, data_health_scores | System health |
| Security | admin_audit_logs, archived_system_errors, archived_user_activity_logs | Security audit |

### RLS Strategy

- **65+ optimized policies** (consolidated from 130+ redundant policies)
- **Security definer functions** prevent RLS recursion
- **Family-scoped access** — most data is scoped to family_id
- **Admin bypass** — admins use service role or security definer functions`
  },
  {
    id: 'kids-portal',
    title: '9. Kids Portal & Skill Plans',
    icon: Users,
    content: `### Assessment → Plan → Execute Pipeline

\`\`\`
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│ Assessment │    │  AI Plan   │    │  Parent    │    │   Daily    │
│    Gate    │───▶│ Generation │───▶│  Review    │───▶│ Execution  │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
                                                            │
                                                            ▼
                                                    ┌────────────┐
                                                    │  Session   │
                                                    │  Tracking  │
                                                    └────────────┘
\`\`\`

### Key Features
- **Assessment Gate**: Children complete initial skill assessment before accessing the portal
- **AI Plan Generation**: manage-skill-plan edge function creates personalized learning paths
- **Parent Review**: Parents approve/modify AI-generated skill plans
- **Daily Execution**: ActivityExecutor component runs individual activities with timers
- **Session Tracking**: ai-session-helper tracks progress, supports pause/resume
- **Idle Detection**: useIdleDetector auto-pauses sessions after inactivity`
  },
  {
    id: 'games-chores-catalog',
    title: '10. Games & Chores Catalog',
    icon: Gamepad2,
    content: `This chapter provides a comprehensive catalog of all interactive games, activities, and chore templates with detailed skill alignment mappings.

### SkillQuest Game System

The system provides **80+ game variants** plus **12 standalone bonus games** across **12 skill domains**. Games use 5 core mechanics: **Match**, **Sort**, **Sequence**, **Odd-One-Out**, and **Fill-in-the-Blank**.

**Source**: \`src/components/games/shared/skillGameData.ts\`

### Game Mechanics Reference

| Mechanic | Description | Clinical Alignment |
|----------|-------------|-------------------|
| Match | Pair symbols to labels | Vocabulary, recognition, association |
| Sort | Drag items into groups | Categorization, discrimination, executive function |
| Sequence | Arrange in correct order | Planning, temporal reasoning, routine learning |
| Odd-One-Out | Find what doesn't belong | Critical thinking, categorization, attention |
| Fill-in-the-Blank | Complete a sequence | Working memory, prediction, pattern completion |

### 💬 Communication & AAC (8 variants + 1 bonus)

| Game | Mechanics | Skills Targeted |
|------|-----------|----------------|
| Word Matcher | Match, Odd-one-out | Vocabulary recognition, symbol-word association |
| Greeting Sorter | Sort, Odd-one-out | Social greetings, polite language categories |
| Needs Finder | Odd-one-out, Fill-blank | Expressing needs, emotional vocabulary |
| Conversation Builder | Sequence, Fill-blank | Conversational turn-taking, pragmatic language |
| Polite Words | Match, Odd-one-out | Manners, social etiquette |
| AAC Board Match | Match, Fill-blank | AAC symbol recognition, picture communication |
| Symbol Sentence Builder | Sequence, Fill-blank | Sentence construction, AAC fluency |
| PECS Sorter | Sort, Odd-one-out | PECS categorization, picture exchange |
| Sound Match (bonus) | Sounds engine | Auditory processing, sound-picture association |

### 🤝 Social Skills (8 variants + 1 bonus)

| Game | Mechanics | Skills Targeted |
|------|-----------|----------------|
| Emotion Explorer | Sort, Odd-one-out | Emotion identification, categorization |
| Social Skills Match | Match, Fill-blank | Social skill recognition |
| Feeling Detective | Odd-one-out, Match | Emotional discrimination |
| Friendship Builder | Sort, Odd-one-out | Prosocial behavior identification |
| Face Reader | Match, Fill-blank | Facial expression reading, empathy |
| Social Story Sequencer | Sequence, Fill-blank | Social narrative comprehension |
| Friendship Scenario | Odd-one-out, Match | Social decision-making |
| Behavior Sorter | Sort, Odd-one-out | Behavioral self-regulation |
| Emotion Memory (bonus) | Memory engine | Emotion recall, visual memory |

### 🌈 Sensory Regulation (5 variants + 2 bonuses)

| Game | Mechanics | Skills Targeted |
|------|-----------|----------------|
| Five Senses Sorter | Sort, Odd-one-out | Sensory categorization, body awareness |
| Opposites Finder | Match, Odd-one-out | Sensory vocabulary, contrast understanding |
| Sense Detective | Odd-one-out, Fill-blank | Sensory discrimination |
| Texture Match | Match, Sort | Tactile vocabulary, texture identification |
| Calm or Alert? | Sort, Odd-one-out | Self-regulation, arousal level awareness |
| Sensory Memory (bonus) | Memory engine | Sensory recall, concentration |
| Sound Sorter (bonus) | Sounds engine | Auditory discrimination |

### 🧩 Executive Function (5 variants + 1 bonus)

| Game | Mechanics | Skills Targeted |
|------|-----------|----------------|
| Morning Routine | Sequence, Fill-blank | Routine following, time management |
| Bedtime Routine | Sequence, Fill-blank | Routine adherence, transitions |
| Task Planner | Fill-blank, Sequence | Task planning, step prediction |
| Snack Time Steps | Sequence, Fill-blank | Independence, sequencing |
| Routine Mixer | Sort, Odd-one-out | Routine categorization, flexibility |
| Sequence Spotter (bonus) | Pattern engine | Pattern recognition, prediction |

### 🏠 Daily Living (7 variants + 1 bonus)

| Game | Mechanics | Skills Targeted |
|------|-----------|----------------|
| Room Sorter | Sort, Odd-one-out | Environmental awareness, categorization |
| What's Missing? | Fill-blank, Odd-one-out | Visual scanning, memory |
| Odd Item Out | Odd-one-out, Match | Categorization, logical reasoning |
| Kitchen Helper | Match, Odd-one-out | Kitchen vocabulary, domestic skills |
| Getting Dressed | Sort, Odd-one-out | Self-care, categorization |
| Visual Schedule Builder | Sequence, Fill-blank | Schedule comprehension, independence |
| Routine Timer Sort | Sort, Sequence | Time concepts, daily structure |
| Home Memory (bonus) | Memory engine | Object recall, spatial memory |

### 💖 Emotional Regulation (8 variants)

| Game | Mechanics | Skills Targeted |
|------|-----------|----------------|
| Feelings Meter | Sort, Odd-one-out | Emotion intensity awareness |
| Coping Toolbox | Match, Fill-blank | Coping strategy identification |
| Zone Check | Odd-one-out, Sort | Zones of Regulation awareness |
| Calm Down Steps | Sequence, Fill-blank | Self-regulation sequencing |
| Big vs Small Feelings | Sort, Odd-one-out | Emotional magnitude discrimination |
| Emotion Scenario | Match, Odd-one-out | Emotional perspective-taking |
| Trigger Identifier | Odd-one-out, Sort | Trigger awareness, prevention |
| Calm Plan Builder | Sequence, Fill-blank | Self-regulation planning |

### 🏃 Motor Skills (5 variants + 1 bonus)

| Game | Mechanics | Skills Targeted |
|------|-----------|----------------|
| Body Part Match | Sort, Match | Body awareness, movement categorization |
| Action Hero | Match, Odd-one-out | Action vocabulary, movement identification |
| Coordination Challenge | Odd-one-out, Fill-blank | Coordination awareness, fine motor concepts |
| Hand Gym | Match, Fill-blank | Fine motor skill recognition |
| Movement Sequence | Sequence, Fill-blank | Gross motor planning, sequencing |
| Action Sounds (bonus) | Sounds engine | Auditory-motor association |

### 📚 Academic Readiness (5 variants + 1 bonus)

| Game | Mechanics | Skills Targeted |
|------|-----------|----------------|
| Shape Sorter | Sort, Odd-one-out | Shape recognition, categorization |
| Color Match | Match, Odd-one-out | Color recognition, naming |
| Number Sequence | Sequence, Fill-blank | Counting, number order |
| Letter Detective | Odd-one-out, Match | Letter recognition, discrimination |
| Math Symbols | Match, Fill-blank | Math symbol recognition |
| Pattern Spotter (bonus) | Pattern engine | Pattern recognition, prediction |

### 🗣️ Speech Therapy (5 variants + 1 bonus)

| Game | Mechanics | Skills Targeted |
|------|-----------|----------------|
| Sound Matcher | Match, Odd-one-out | Sound-mouth shape association, oral motor |
| Mouth Shape Sort | Sort, Odd-one-out | Oral motor awareness, articulation prep |
| Rhyme Finder | Match, Odd-one-out | Phonological awareness, rhyming |
| Word Builder | Sequence, Fill-blank | Word formation, phonemic awareness |
| Articulation Challenge | Odd-one-out, Match | Articulation practice, speech fluency |
| Speech Sounds Pattern (bonus) | Pattern engine | Speech sound patterns |

### 📖 Storytelling (5 variants + 1 bonus)

| Game | Mechanics | Skills Targeted |
|------|-----------|----------------|
| Story Starter | Match, Sort | Narrative initiation, story elements |
| Character Match | Match, Odd-one-out | Character identification |
| Setting Sorter | Sort, Odd-one-out | Setting vs object discrimination |
| Plot Sequencer | Sequence, Fill-blank | Narrative sequencing, cause-effect |
| Story Detective | Odd-one-out, Match | Narrative coherence, critical thinking |
| Story Memory (bonus) | Memory engine | Story element recall |

### 🎓 Educational Learning (5 variants + 1 bonus)

| Game | Mechanics | Skills Targeted |
|------|-----------|----------------|
| Alphabet Adventure | Sequence, Fill-blank | Letter sequencing, alphabetical order |
| Counting Quest | Sequence, Fill-blank | Number sequencing, counting |
| Science Sorter | Sort, Odd-one-out | Scientific categorization |
| Reading Match | Match, Fill-blank | Reading tool identification |
| Knowledge Detective | Odd-one-out, Match | Subject discrimination |
| Learning Patterns (bonus) | Pattern engine | Academic pattern recognition |

### 🧠 Cognitive Development (5 variants + 1 bonus)

| Game | Mechanics | Skills Targeted |
|------|-----------|----------------|
| Brain Trainer | Match, Fill-blank | Memory skills, cognitive recall |
| Memory Challenge | Fill-blank, Odd-one-out | Working memory, visual memory |
| Focus Finder | Odd-one-out, Match | Sustained attention, focus |
| Logic Puzzle | Sort, Odd-one-out | Logical reasoning, categorization |
| Pattern Thinker | Sequence, Fill-blank | Pattern recognition, sequential reasoning |
| Cognitive Memory (bonus) | Memory engine | Memory training |

### Adaptive Difficulty

| Level | Rounds | Items | Target |
|-------|--------|-------|--------|
| Easy | 3 | 3-4 items | Beginners, ages 3-5 |
| Medium | 5 | 4-5 items | Intermediate, ages 6-8 |
| Hard | 7 | 5-6 items | Advanced, ages 9-12 |

\`useAdaptiveDifficulty\` hook auto-adjusts difficulty based on per-game accuracy history.

### Chore System

#### Database Tables

| Table | Purpose |
|-------|---------|
| chore_categories | Category definitions with icons, colors, autism features |
| chore_templates | Reusable blueprints with instructions, difficulty, ages |
| chores | Family-specific instances (from templates or custom) |
| chore_assignments | Assigned chores with status, due dates, recurrence |
| chore_completions | Completion records with points, ratings, photos |

#### Chore Categories & Skill Alignment

| Category | Skills Developed | Autism Accommodations |
|----------|-----------------|----------------------|
| 🛁 Bathroom | Self-care, hygiene, independence | Visual schedules, step-by-step |
| 🍳 Kitchen | Daily living, following instructions | Simplified steps, break reminders |
| 🛏️ Bedroom | Organization, routine, responsibility | Visual checklists, sensory-friendly |
| 🧹 Cleaning | Motor skills, task completion | Timer breaks, noise considerations |
| 🌿 Outdoor | Gross motor, sensory exploration | Sensory prep, flexible timing |
| 🧼 Personal Care | Self-care independence, health | Visual aids, social stories |
| 🎒 School Prep | Executive function, time management | Visual timers, task chunking |
| 🤝 Social Tasks | Social skills, cooperation, empathy | Social stories, role modeling |

#### Difficulty & Points

| Difficulty | Points | Duration | Age |
|------------|--------|----------|-----|
| Easy | 5 pts | 5-10 min | 3-6 |
| Medium | 10 pts | 10-20 min | 6-10 |
| Hard | 20 pts | 20-30 min | 10+ |

#### Autism-Friendly Features

- **Visual Schedules**: Step-by-step visual instructions with photo guides
- **Break Reminders**: Configurable break intervals during chores
- **Sensory Considerations**: Noise, lighting, texture warnings
- **Social Stories**: Pre-chore narratives explaining what to expect
- **Communication Styles**: Visual, auditory, or tactile preference

#### Content Pipeline

\`\`\`
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  80+ Game    │     │  12 Bonus    │     │   Chore      │
│  Variants    │     │  Standalone  │     │  Templates   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │
       ▼                    ▼                     ▼
┌──────────────────────────────────────────────────────────┐
│              content_items table (public catalog)         │
└──────────────────────────┬───────────────────────────────┘
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Public   │    │ Kids     │    │ Parent   │
    │ Catalog  │    │ Portal   │    │ Curation │
    └──────────┘    └──────────┘    └──────────┘
\`\`\``
  },
  {
    id: 'ai-integration',
    title: '11. AI Integration',
    icon: Brain,
    content: `### AI Architecture

The system uses a multi-provider AI strategy:

1. **Lovable AI Gateway** (primary) — ai-chat edge function routes through Lovable's managed gateway
2. **Grok** (secondary) — grok-chat for specialized queries
3. **LLM Failover** — llm-with-failover automatically switches providers on failure

### AI-Powered Features

| Feature | Edge Function | Description |
|---------|--------------|-------------|
| General Chat | ai-chat | AI assistant for parents and children |
| Assessment Review | ai-assessment-review | AI analysis of child skill assessments |
| Daily Plan Generation | generate-daily-plan | Create personalized daily activity schedules |
| Session Assistance | ai-session-helper | Real-time help during activity sessions |
| Text-to-Speech | text-to-speech | Audio support for children with reading difficulties |

### Usage Quotas

Managed via ai_usage_quotas table:
- Per-role daily message limits
- Configurable enable/disable per role
- Usage tracking in ai_messages table`
  },
  {
    id: 'security-model',
    title: '12. Security Model',
    icon: Shield,
    content: `### Defense in Depth

1. **Authentication Layer**: Supabase Auth with JWT, email confirmation
2. **Authorization Layer**: RLS policies on every table, role-based access
3. **Application Layer**: Input validation (Zod), CORS enforcement, rate limiting
4. **Monitoring Layer**: Security event logging, anomaly detection, audit trails

### RLS Policy Patterns

\`\`\`sql
-- Family-scoped access pattern
CREATE POLICY "Users can view own family data"
ON public.chores FOR SELECT
TO authenticated
USING (family_id IN (
  SELECT family_id FROM profiles WHERE user_id = auth.uid()
));

-- Admin bypass pattern
CREATE POLICY "Admins can manage all"
ON public.some_table FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
\`\`\`

### Security Monitoring
- Real-time security event collection via security-monitoring edge function
- Admin Security Center dashboard for threat assessment
- Automated alerting on suspicious activity patterns
- Device fingerprinting in audit logs`
  },
  {
    id: 'performance',
    title: '13. Performance',
    icon: Gauge,
    content: `### Optimization Strategies

1. **Code Splitting**: All admin/parent/kids pages lazy-loaded via React.lazy()
2. **Bundle Optimization**: Vite tree-shaking, chunk splitting by route
3. **State Efficiency**: Zustand selective subscriptions reduce re-renders 40-60%
4. **Virtual Scrolling**: Large lists use windowed rendering
5. **Chart Preloading**: Admin layout preloads chart chunks on mount
6. **Idle Detection**: useIdleDetector pauses unnecessary processing

### Caching Strategy

- **TanStack Query**: Server state caching with configurable stale times
- **Zustand**: Client state persisted selectively
- **Analytics Store**: Built-in cache layer with TTL
- **Materialized Views**: Database-level query result caching

### Performance Monitoring

- usePerformanceMonitoringSafe hook tracks page loads and memory
- Chrome Performance API integration (graceful degradation on other browsers)
- Edge function response times logged in edge_function_health_logs`
  },
  {
    id: 'testing-strategy',
    title: '14. Testing Strategy',
    icon: TestTube,
    content: `### Testing Pyramid

| Level | Tool | Coverage |
|-------|------|----------|
| Unit | Vitest + Testing Library | Hooks, utilities, store logic |
| Component | Vitest + Testing Library | UI component behavior |
| Integration | Vitest | Store + API interactions |
| E2E | Playwright | Critical user flows |
| RLS | Custom SQL suite | Database security policies |
| Security | security-testing edge function | Automated security checks |

### Test Patterns

\`\`\`typescript
// Hook testing pattern
const { result } = renderHook(() => useAdminAuth());
expect(result.current.isAdmin).toBe(true);

// Component testing pattern
render(<ChoreCard chore={mockChore} />);
expect(screen.getByText('Clean Room')).toBeInTheDocument();
\`\`\`

### CI/CD Integration
- Pre-commit hooks run linting and type checking
- Vitest runs on PR creation
- Security scans on deployment`
  },
  {
    id: 'documentation-system',
    title: '15. Documentation System',
    icon: FileText,
    content: `### DocRegistry System

The project uses src/config/docRegistry.ts to track all documentation files:

- **42 registered documents** organized by category
- **File pattern monitoring** for auto-update detection
- **Metadata**: title, description, category, last updated date

### Documentation Categories

| Category | Files | Description |
|----------|-------|-------------|
| Core | 4 | Architecture ebook, project knowledge, README, architecture docs |
| Components | 3 | Component docs, pages docs, graphics tech stack |
| State | 2 | Stores documentation, Zustand design |
| Hooks | 1 | Hooks documentation |
| Types | 2 | Types documentation, TypeScript strictness |
| Security | 4 | Security framework, RLS policies, RLS tests, enterprise security |
| Backend | 4 | Edge functions guide, Supabase schema, API docs, logging standards |
| Testing | 3 | Testing guide, test plan, auth E2E coverage |
| Guides | 7 | Admin features, auth, kids portal, workflows, site flow, routing, parent-child |
| Utils | 3 | Utils docs, JSDoc standards, docs auto-update |
| Status | 8 | Issues, implementation status, bundle optimization, error recovery, etc. |

### Related Documentation Files

| Document | Purpose |
|----------|---------|
| TECHSTACK.md | Authoritative technical reference |
| LOGGING_STANDARDS.md | Structured logging with withWideEvent() |
| ASSESSMENT_PIPELINE.md | Assessment → AI plan → execution pipeline |
| ENTERPRISE_SECURITY_PERFORMANCE.md | Security hardening & performance |
| AUTH_E2E_COVERAGE_REPORT.md | End-to-end auth test coverage |

### Standards
- All docs use "Last Updated" headers
- JSDOC_STANDARDS.md governs code documentation
- Storybook (v8.6.14) provides visual component documentation with 16+ stories`
  },
  {
    id: 'appendix',
    title: '16. Appendix',
    icon: BookOpen,
    content: `### Glossary

| Term | Definition |
|------|-----------|
| RLS | Row Level Security — PostgreSQL policies controlling data access |
| Edge Function | Serverless Deno function running on Supabase infrastructure |
| Security Definer | PostgreSQL function that runs with its creator's privileges |
| Skill Plan | AI-generated personalized learning path for a child |
| Activity Session | A tracked instance of a child completing a learning activity |
| Family Code | Unique code for joining a family group |

### Quick Reference

- **Total Tables**: 59
- **Total Edge Functions**: 32
- **Total Zustand Stores**: 18
- **Total Custom Hooks**: 54
- **Total RLS Policies**: 65+
- **Shared Utilities**: 10 modules
- **Documentation Files**: 42
- **Security Grade**: A+
- **Last Full Audit**: 2026-03-24`
  }
];

// Simple markdown-to-JSX renderer for tables and code blocks
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={key++} className="bg-gray-950 border border-gray-700 rounded-lg p-4 overflow-x-auto my-3 text-sm font-mono text-green-400">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Table
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      // Parse table
      const headers = tableLines[0].split('|').filter(c => c.trim()).map(c => c.trim());
      const rows = tableLines.slice(2).map(row => 
        row.split('|').filter(c => c.trim()).map(c => c.trim())
      );
      elements.push(
        <div key={key++} className="overflow-x-auto my-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-600">
                {headers.map((h, hi) => (
                  <th key={hi} className="text-left py-2 px-3 text-gray-300 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-gray-700/50 hover:bg-gray-800/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-2 px-3 text-gray-400">
                      {cell.startsWith('`') && cell.endsWith('`') 
                        ? <code className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-300 text-xs">{cell.slice(1, -1)}</code>
                        : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className="text-lg font-semibold text-white mt-6 mb-2">{line.slice(4)}</h3>);
      i++;
      continue;
    }
    if (line.startsWith('#### ')) {
      elements.push(<h4 key={key++} className="text-md font-medium text-gray-200 mt-4 mb-2">{line.slice(5)}</h4>);
      i++;
      continue;
    }

    // Bold text
    if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
      elements.push(<p key={key++} className="text-gray-200 font-semibold my-1">{line.replace(/\*\*/g, '')}</p>);
      i++;
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line.trim())) {
      elements.push(
        <p key={key++} className="text-gray-400 my-1 pl-4">
          {renderInlineMarkdown(line.trim())}
        </p>
      );
      i++;
      continue;
    }

    // Bullet list
    if (line.trim().startsWith('- ')) {
      elements.push(
        <p key={key++} className="text-gray-400 my-0.5 pl-4 flex items-start gap-2">
          <span className="text-blue-400 mt-1.5 shrink-0">•</span>
          <span>{renderInlineMarkdown(line.trim().slice(2))}</span>
        </p>
      );
      i++;
      continue;
    }

    // Regular paragraph
    if (line.trim()) {
      elements.push(<p key={key++} className="text-gray-400 my-2">{renderInlineMarkdown(line)}</p>);
    }
    i++;
  }

  return elements;
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Handle bold, inline code, and links
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-gray-200">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-300 text-xs">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default function AdminArchitectureEbook() {
  const [expandedChapter, setExpandedChapter] = useState<string | null>('executive-summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChapters, setFilteredChapters] = useState(chapters);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredChapters(chapters);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredChapters(
      chapters.filter(ch => 
        ch.title.toLowerCase().includes(q) || 
        ch.content.toLowerCase().includes(q)
      )
    );
  }, [searchQuery]);

  const handleDownloadPdf = useCallback(() => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    // Title page
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Chatterbox Architecture Ebook', pageWidth / 2, 60, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Comprehensive Technical Reference — v4.0', pageWidth / 2, 72, { align: 'center' });
    doc.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth / 2, 80, { align: 'center' });
    doc.addPage();

    chapters.forEach((chapter) => {
      // Chapter title
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(chapter.title, maxWidth);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 8 + 4;

      // Chapter body — strip markdown bold/italic markers
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const cleaned = chapter.content
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/^#+\s*/gm, '')
        .replace(/^[-*]\s/gm, '• ');
      const bodyLines: string[] = doc.splitTextToSize(cleaned, maxWidth);
      for (const line of bodyLines) {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 5;
      }
      y += 10;
    });

    doc.save('chatterbox-architecture-ebook.pdf');
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Architecture Ebook</h1>
            <p className="text-gray-400 text-sm">Comprehensive technical reference — v4.0 · Updated 2026-03-24</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Badge variant="outline" className="border-blue-500/50 text-blue-400">
            16 Chapters
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search chapters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
        />
      </div>

      {/* Table of Contents - compact */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
            <BookMarked className="h-4 w-4" />
            Quick Navigation
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <div className="flex flex-wrap gap-2">
            {chapters.map(ch => (
              <Button
                key={ch.id}
                variant="ghost"
                size="sm"
                onClick={() => {
                  setExpandedChapter(ch.id);
                  setSearchQuery('');
                  document.getElementById(`chapter-${ch.id}`)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`text-xs h-7 ${
                  expandedChapter === ch.id 
                    ? 'bg-blue-600/20 text-blue-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {ch.title.split('. ')[1] || ch.title}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chapters */}
      <ScrollArea className="h-[calc(100vh-340px)]">
        <div className="space-y-3 pr-4">
          {filteredChapters.map(chapter => {
            const Icon = chapter.icon;
            const isExpanded = expandedChapter === chapter.id;
            
            return (
              <Card
                key={chapter.id}
                id={`chapter-${chapter.id}`}
                className={`border transition-colors ${
                  isExpanded 
                    ? 'bg-gray-800 border-blue-500/30' 
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                }`}
              >
                <button
                  onClick={() => setExpandedChapter(isExpanded ? null : chapter.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${isExpanded ? 'text-blue-400' : 'text-gray-500'}`} />
                    <span className={`font-medium ${isExpanded ? 'text-white' : 'text-gray-300'}`}>
                      {chapter.title}
                    </span>
                  </div>
                  {isExpanded 
                    ? <ChevronDown className="h-4 w-4 text-gray-400" /> 
                    : <ChevronRight className="h-4 w-4 text-gray-400" />
                  }
                </button>
                
                {isExpanded && (
                  <CardContent className="pt-0 pb-6 px-6 border-t border-gray-700/50">
                    <div className="mt-4">
                      {renderMarkdown(chapter.content)}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Back to top */}
      <Button
        variant="outline"
        size="sm"
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 border-gray-600 text-gray-400 hover:text-white bg-gray-800"
      >
        <ArrowUp className="h-4 w-4 mr-1" />
        Top
      </Button>
    </div>
  );
}
