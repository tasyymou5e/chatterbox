

# Documentation Overhaul: Sync, Audit & Architecture Ebook

## Scope

Three workstreams: (1) update all 40+ docs with current stats/dates, (2) audit and remove/consolidate stale docs, (3) generate a comprehensive architecture ebook.

## 1. Full Docs Sync

Since the CLI (`npm run docs:update`) can't run in Lovable, we manually update all docs that have drifted. Key updates:

- **All "Last Updated" dates** → `2026-03-15` across all 40+ files
- **KIDS_PORTAL_DOCUMENTATION.md** → Rewrite to reflect Phases 4-7: assessment gate, skill plan dashboard, idle auto-pause, session resume, ActivityExecutor
- **ARCHITECTURE_DOCUMENTATION.md** → Update component counts (30+ components → actual), add `assessment/`, `daily-plan/`, `ai/` directories, update hooks count (25+ → 60+), stores count (12 → 19)
- **HOOKS_DOCUMENTATION.md** → Add 35+ hooks missing from the list (useSkillPlanManager, useActivitySession, useIdleDetector, useAIChat, etc.)
- **STORES_DOCUMENTATION.md** → Add 6 missing stores (authActionsStore, authRoleStore, authSessionStore, testResultsStore, gameSessionStore, etc.)
- **EDGE_FUNCTIONS_GUIDE.md** → Add newer functions: manage-skill-plan, ai-session-helper, ai-assessment-review, generate-daily-plan, ai-chat
- **TECHSTACK.md** → Update "Last Updated" date, verify version numbers
- **COMPONENT_DOCUMENTATION.md** → Add new component directories: assessment, daily-plan, ai, composition, wrappers
- **API_DOCUMENTATION.md** → Document manage-skill-plan and ai-session-helper endpoints

## 2. Audit & Consolidate Stale Docs

**Remove (consolidate into ARCHITECTURE_DOCUMENTATION.md or archive section):**
- `IMPLEMENTATION_COMPLETE.md` — one-time status report from Jan 22
- `VERIFICATION_COMPLETE.md` — one-time status report from Jan 22
- `MIGRATION_COMPLETE.md` — one-time migration status
- `IMPLEMENTATION_SUMMARY.md` — superseded by IMPLEMENTATION_STATUS.md
- `ADMIN_IMPROVEMENTS_WEEK1.md` — historical changelog, not living doc

**Consolidate:**
- `RLS_POLICIES_DOCUMENTATION.md` + `RLS_POLICIES_COMPREHENSIVE_GUIDE.md` + `RLS_SECURITY_KNOWLEDGE.md` → merge into single `RLS_POLICIES_DOCUMENTATION.md`
- `SECURITY_FRAMEWORK.md` + `SECURITY_IMPROVEMENTS.md` + `PROJECT_SECURITY_REVIEW.md` + `API_SECURITY_REVIEW.md` → merge into single `SECURITY_FRAMEWORK.md`
- `IMPLEMENTATION_INDEX.md` + `IMPLEMENTATION_STATUS.md` → merge into `IMPLEMENTATION_STATUS.md`

**Update docRegistry.ts** to remove entries for deleted/consolidated files.

## 3. Architecture Ebook — `ARCHITECTURE_EBOOK.md`

A single comprehensive long-form document (~50-80 sections) structured as:

1. **Executive Summary** — What Chatterbox is, who it serves, key metrics (60+ hooks, 19 stores, 32 edge functions, 15+ page routes)
2. **System Architecture** — Frontend/backend split, Supabase integration, authentication flow diagram (ASCII)
3. **Frontend Architecture** — Component hierarchy, lazy loading strategy, composition patterns (AsyncContent, ConditionalRender, WithAuth)
4. **State Management** — Zustand store design, 19 stores categorized (auth, analytics, domain, UI), store template pattern
5. **Routing & Navigation** — Route structure, role-based guards, portal system (admin/parent/kids)
6. **Authentication & Authorization** — Auth flow, role system (admin/parent/child/read_only), RLS integration
7. **Backend: Edge Functions** — All 32 functions categorized (admin, AI, family, monitoring, security), shared types pattern
8. **Database Schema** — Key tables, RLS policy strategy, family/connection model
9. **Kids Portal & Skill Plans** — Assessment gate → plan generation → parent review → daily execution → session tracking pipeline
10. **AI Integration** — Lovable AI gateway, ai-session-helper, ai-assessment-review, grok-chat, text-to-speech
11. **Security Model** — RLS policies, CORS, rate limiting, security monitoring, pre-commit checks
12. **Performance** — Bundle optimization, virtual scrolling, lazy loading, idle detection
13. **Testing Strategy** — Vitest unit tests, Playwright E2E, RLS test suite
14. **Documentation System** — docRegistry, extractors, auto-update pipeline
15. **Appendix** — Glossary, file tree, hook reference table, store reference table

## Files Modified

- ~15 existing `.md` files updated with current content and dates
- ~8 stale `.md` files deleted or consolidated
- `src/config/docRegistry.ts` — remove entries for deleted docs, add entry for ARCHITECTURE_EBOOK.md
- `ARCHITECTURE_EBOOK.md` — new comprehensive file

## Approach

Will tackle in order: (1) stale doc audit/cleanup first, (2) sync existing docs, (3) generate ebook. Each workstream as a separate task batch.

