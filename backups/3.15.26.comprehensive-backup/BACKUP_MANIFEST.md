# 🔒 Comprehensive Site Backup — 3.15.26
## Git Marker: `3.15.26.comprehensive-backup`

**Created:** 2026-03-16
**Purpose:** Full pre-implementation backup before 3-phase assessment improvement roadmap
**Supabase Project:** `lxuqfgbukrrickanmmic`

---

## What's Backed Up

### ✅ Frontend Source Code (`src/`)
- **Components:** All 30+ directories (assessment, kids, parent, admin, auth, etc.)
- **Pages:** All routes including Assessment, KidsPortal, ParentDashboard, Admin
- **Hooks:** 53 custom hooks
- **Stores:** 19 Zustand stores
- **Types:** 27 type definition files
- **Utils:** 18 utility modules
- **Routes:** Router configuration
- **Config:** docRegistry, design system
- **Data:** Assessment instruments (557 lines, 3 instruments)
- **Services:** UnifiedContentService and related

### ✅ Supabase Backend (`supabase/`)
- **Migrations:** 244 SQL migration files (complete schema history)
- **Edge Functions:** 32 functions with `_shared/` utilities
- **Config:** `config.toml` with JWT and function settings

### ✅ Tests (`tests/`)
- RLS test suite
- Test utilities and helpers

### ✅ Configuration Files
- `package.json` — Dependencies snapshot
- `vite.config.ts` — Build config with PWA, chunking, CSP
- `tailwind.config.ts` — Design system tokens
- `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`
- `index.html` — CSP headers, meta tags, PWA manifest
- `postcss.config.js`, `eslint.config.js`, `components.json`
- `.env` — Environment variables (public keys only)

### ✅ Public Assets (`public/`)
- PWA icons, favicon, OG images, robots.txt

---

## Database Schema Snapshot

### Enums
| Enum | Values |
|------|--------|
| `app_role` | admin, parent, child, therapist, teacher, grandparent, family_friend, read_only |
| `achievement_type` | streak, skill, collaboration, milestone, special |
| `approval_status` | pending, approved, rejected |
| `chore_difficulty` | easy, medium, hard |
| `chore_status` | assigned, in_progress, completed, verified, overdue, needs_redo |
| `content_type` | game, video, website, app |
| `interaction_type` | view, click, launch, complete, favorite |
| `reward_type` | points, custom, privilege, activity |
| `skill_level` | beginner, intermediate, advanced |
| `security_event_type` | authentication_failure, rls_violation, suspicious_access_pattern, bulk_data_access, privilege_escalation, data_exfiltration_attempt, brute_force_attack, session_hijacking, unauthorized_api_access, security_test_failure |
| `connection_role` | grandparent, uncle, aunt, family_friend, caregiver, tutor |

### Key Tables (from types.ts — 60+ tables)
- `profiles`, `user_roles`, `families`, `family_members`, `family_connections`
- `assessment_results`, `skill_plan_schedules`, `life_skill_catalog`, `plan_session_logs`
- `content_items`, `content_categories`, `content_interactions`, `content_favorites`
- `chores`, `chore_assignments`, `chore_completions`, `chore_categories`, `chore_templates`
- `child_accounts`, `child_avatars`, `child_content_preferences`
- `achievements`, `user_achievements`, `daily_streaks`, `certificates`
- `ai_conversations`, `ai_messages`, `ai_usage_quotas`
- `analytics_insights`, `analytics_metrics`, `behavioral_events`, `engagement_metrics`
- `admin_audit_logs`, `user_activity_logs`, `system_errors`
- `edge_function_health_logs`, `edge_function_recovery_attempts`, `edge_function_uptime_daily`
- `data_health_scores`, `data_health_alerts`, `error_patterns`
- `security_events`, `security_alerts`
- `daily_analytics_data`, `comparative_benchmarks`
- `family_activity_logs`, `family_challenges`
- `llm_provider_configs`, `llm_failover_events`, `llm_health_check_logs`
- `site_settings`, `user_sessions`

### Database Functions (70+)
Key security-definer functions:
- `has_role(user_id, role)` — RLS helper
- `check_admin_role_secure(user_id)` — Admin verification
- `create_child_account_secure()` — Secure child account creation
- `complete_child_account_secure()` — PIN-based completion
- `check_rate_limit()`, `check_child_account_rate_limit()` — Rate limiting
- `detect_suspicious_activity()`, `detect_suspicious_patterns()` — Security monitoring
- `compute_daily_analytics()` — Analytics aggregation
- `cleanup_test_families()` — Test data cleanup
- `generate_family_code()`, `generate_child_account_code()` — Code generation

### RLS Policies (169 policies across all public tables)
All tables have RLS enabled. Key patterns:
- **User-owned data:** `user_id = auth.uid()`
- **Family-scoped:** Via `family_members` join
- **Admin access:** Via `has_role(auth.uid(), 'admin')`
- **Service role only:** System tables (health logs, alerts)
- **Public read:** Active content items with approved status

---

## Edge Functions (32)

### Authenticated (JWT validated in code)
1. `admin-create-user` — Admin user creation
2. `admin-update-user` — Admin user updates
3. `admin-delete-user` — Admin user deletion
4. `admin-add-family-member` — Admin family member addition
5. `admin-remove-family-member` — Admin family member removal
6. `create-child-account` — Parent creates child account
7. `create-test-family` — Admin test family creation
8. `cleanup-test-families` — Admin test cleanup
9. `delete-family-comprehensive` — Admin family deletion
10. `send-family-email` — Family email sending
11. `update-site-settings` — Site settings management
12. `manage-llm-provider` — LLM provider config
13. `supabase-analytics-query` — Admin analytics
14. `llm-with-failover` — LLM calls with failover
15. `family-integrity-check` — Admin data integrity
16. `security-testing` — Admin security tests
17. `security-monitoring` — Admin security monitoring
18. `api-integration-status` — Integration status
19. `ai-chat` — AI chat with rate limiting
20. `ai-assessment-review` — Assessment AI review
21. `generate-daily-plan` — AI plan generation
22. `manage-skill-plan` — Skill plan CRUD
23. `ai-session-helper` — Activity session management
24. `grok-chat` — Grok AI integration
25. `text-to-speech` — TTS with rate limiting

### Unauthenticated / System
26. `complete-child-account` — PIN-based auth
27. `scheduled-health-check` — System cron
28. `edge-function-health-check` — System cron
29. `process-recurring-chores` — System cron
30. `data-health-alerter` — System alerting
31. `error-collector` — Client error reporting

### Shared Utilities (`_shared/`)
- `cors.ts`, `auth-validator.ts`, `rate-limiter.ts`
- `security-headers.ts`, `api-types.ts`
- `email-sender.ts`, `email-templates.ts`
- `password-validator.ts`, `wide-event.ts`

---

## Restore Instructions

### Full Frontend Restore
```bash
# Copy entire src/ back
cp -r backups/3.15.26.comprehensive-backup/src/ ./src/
cp -r backups/3.15.26.comprehensive-backup/public/ ./public/
cp backups/3.15.26.comprehensive-backup/package.json ./
cp backups/3.15.26.comprehensive-backup/vite.config.ts ./
cp backups/3.15.26.comprehensive-backup/tailwind.config.ts ./
cp backups/3.15.26.comprehensive-backup/tsconfig*.json ./
cp backups/3.15.26.comprehensive-backup/index.html ./
cp backups/3.15.26.comprehensive-backup/postcss.config.js ./
cp backups/3.15.26.comprehensive-backup/eslint.config.js ./
cp backups/3.15.26.comprehensive-backup/components.json ./
cp backups/3.15.26.comprehensive-backup/.env ./
npm install
```

### Supabase Edge Functions Restore
```bash
cp -r backups/3.15.26.comprehensive-backup/supabase/functions/ ./supabase/functions/
cp backups/3.15.26.comprehensive-backup/supabase/config.toml ./supabase/config.toml
# Edge functions auto-deploy on push
```

### Database Schema Restore
The migrations in `supabase/migrations/` contain the complete schema history.
To restore the database to this exact state:
1. Create a new Supabase project
2. Copy migrations: `cp -r backups/3.15.26.comprehensive-backup/supabase/migrations/ ./supabase/migrations/`
3. Run: `supabase db push`

### Selective Restore
To restore individual components:
```bash
# Example: restore just assessment pipeline
cp -r backups/3.15.26.comprehensive-backup/src/components/assessment/ ./src/components/assessment/
cp -r backups/3.15.26.comprehensive-backup/src/components/kids/ ./src/components/kids/
cp backups/3.15.26.comprehensive-backup/src/pages/Assessment.tsx ./src/pages/
```

---

## Git Restore Point

To restore from git history, use Lovable's built-in version history or revert to the message tagged with `3.15.26.comprehensive-backup`.

### Alternative: Lovable History
1. Click "History" tab in the chat
2. Find this backup point
3. Click "Revert" to restore the entire project state

---

*This backup represents the complete, working state of Chatterbox Life as of 2026-03-16, before implementing the 3-phase assessment improvement roadmap.*
