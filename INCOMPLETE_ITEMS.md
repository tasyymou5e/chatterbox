# Incomplete Items & Development Backlog

> **Last Audit:** January 24, 2026  
> **Total Tracked Items:** 65  
> **Related:** [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) | [AUTH_E2E_COVERAGE_REPORT.md](./AUTH_E2E_COVERAGE_REPORT.md)

---

## Overview & Metrics

| Category | Count | Status |
|----------|-------|--------|
| 🔴 Critical Priority | 5 | Requires immediate attention |
| 🟠 High Priority | 8 | Core feature gaps |
| 🟡 Medium Priority | 6 | User-facing placeholders |
| 🟢 Low Priority (Testing) | 6 | Testing gaps |
| 🟢 Low Priority (Storybook) | 12 | Component documentation |
| 🔵 In-Progress Features | 20 | Active development |
| ⚙️ Feature Flags | 4 | Conditional logic |
| ⚠️ Empty Handlers | 4 | Silent failure points |

---

## 🔴 Critical Priority - Security & Infrastructure

Items requiring immediate attention for security or infrastructure stability.

| Item | Location | Description | Recommendation |
|------|----------|-------------|----------------|
| GDPR DELETE Policies | `RLS_POLICIES_COMPREHENSIVE_GUIDE.md:1259` | Archive tables missing DELETE policies for GDPR data erasure compliance | Add DELETE policies to `archived_user_activity_logs`, `archived_system_errors` |
| Duplicate RLS Policies | `RLS_POLICIES_COMPREHENSIVE_GUIDE.md:1260` | Overlapping SELECT policies on `analytics_metrics` may cause performance issues | Consolidate into single optimized policies |
| Expired Token Test Placeholder | `supabase/functions/security-testing/index.ts:474-481` | Security test returns success without real token validation | Implement actual expired token testing logic |
| RLS Policy Counting | `scripts/extractors/index.ts:82-84` | Uses placeholder count - needs SQL parser for accuracy | Implement SQL parsing for accurate policy counts |
| Database Trigger Audit | Memory: `admin-user-creation-fix` | Triggers may reference deprecated `profiles.email` column | Audit all triggers and update via migration |

---

## 🟠 High Priority - Core Feature Gaps

Features that are expected by users but not yet implemented.

| Item | Location | Description | Status |
|------|----------|-------------|--------|
| Profile Editing | `src/pages/parent/ParentSettings.tsx:100` | "Coming Soon" toast - no edit profile functionality | Not started |
| Password Change | `src/pages/parent/ParentSettings.tsx:108` | "Coming Soon" toast - no password change flow | Not started |
| Detailed Chore Analytics | `src/components/chores/ChoreManagementDashboard.tsx:527-544` | Placeholder tab with TrendingUp icon only | Not started |
| Create Test Family Handler | `src/pages/admin/AdminFamilies.tsx:528-529` | Empty `() => {}` handler for admin test family creation | Needs implementation |
| Family Messaging | `IMPLEMENTATION_STATUS.md:181` | Internal family communication system | 85% complete |
| Real-Time Notifications | `IMPLEMENTATION_STATUS.md:182` | Push notifications for achievements/events | 75% complete |
| Reward Redemption System | `IMPLEMENTATION_STATUS.md:110` | Point spending with parent approval workflow | 70% complete |
| Recurrence Patterns | `IMPLEMENTATION_STATUS.md:119` | Automated recurring chore assignments | 75% complete |

---

## 🟡 Medium Priority - User-Facing Placeholders

"Coming Soon" features visible to users that affect perceived completeness.

| Item | Location | Description | User Impact |
|------|----------|-------------|-------------|
| Community Forum - Guest Browsing | `src/pages/connect/CommunityForum.tsx:106` | "Coming Soon" toast on browse button | Users cannot preview forum without signup |
| Parent Resources - Free Browsing | `src/pages/connect/ParentResources.tsx:126` | "Coming Soon" toast on free resources | Users cannot preview resources without signup |
| Kids Game "Coming Soon" | `src/components/kids/KidsGameLauncher.tsx:264-266` | Placeholder screen for unreleased games | Games show placeholder instead of content |
| Forum Categories | `src/pages/connect/CommunityForum.tsx:140` | All category clicks trigger "Coming Soon" | No functional forum category navigation |
| Research Studies - Learn More | `src/pages/connect/ResearchStudies.tsx` | Toast notification for research inquiries | No direct contact flow for researchers |
| Therapist Tools - Schedule Demo | `src/pages/connect/TherapistTools.tsx` | Toast notification for demo scheduling | No scheduling flow for professionals |

---

## 🟢 Low Priority - Testing Gaps

Test coverage improvements needed for comprehensive validation.

| Item | Location | Description | Effort |
|------|----------|-------------|--------|
| `create-child-account` E2E | `AUTH_E2E_COVERAGE_REPORT.md:712` | Parent-initiated child account flow not directly E2E tested | High |
| MFA Flow Tests | `src/hooks/useAuthE2ECoverage.ts:264-270` | MFA not implemented; tests pending feature | High |
| Social Login Tests | `src/hooks/useAuthE2ECoverage.ts:273-279` | OAuth providers not integrated; tests pending | High |
| Visual Regression Tests | `src/hooks/useAuthE2ECoverage.ts:255-261` | No screenshot comparison testing framework | Medium |
| Cross-Tab Session Sync | `src/hooks/useAuthE2ECoverage.ts:282-288` | Multi-tab session synchronization not tested | Medium |
| RLS Integration Tests | `RLS_TEST_SUITE_DOCUMENTATION.md:79` | End-to-end RLS enforcement scenarios | Medium |

---

## 🟢 Low Priority - Storybook Documentation

Component stories needed for design system documentation.

| Component | Location | Priority |
|-----------|----------|----------|
| Input | `STORYBOOK_GUIDE.md:548` | Low |
| Select | `STORYBOOK_GUIDE.md:549` | Low |
| Dialog | `STORYBOOK_GUIDE.md:550` | Low |
| Alert | `STORYBOOK_GUIDE.md:551` | Low |
| Toast | `STORYBOOK_GUIDE.md:552` | Low |
| Table | `STORYBOOK_GUIDE.md:553` | Low |
| Tabs | `STORYBOOK_GUIDE.md:554` | Low |
| Sidebar | `STORYBOOK_GUIDE.md:555` | Low |
| ChoreCard | `STORYBOOK_GUIDE.md:561` | Low |
| GameCard | `STORYBOOK_GUIDE.md:562` | Low |
| ProgressBar | `STORYBOOK_GUIDE.md:563` | Low |
| AchievementBadge | `STORYBOOK_GUIDE.md:564` | Low |

---

## 🔵 In-Progress Features

Features actively being developed (from IMPLEMENTATION_STATUS.md).

### Communication Platform Enhancement (Week 1-2)
| Feature | Progress | Notes |
|---------|----------|-------|
| Family Messaging | 85% | Internal communication system |
| Real-Time Notifications | 75% | Push notifications for achievements |
| Achievement Sharing | 70% | Social sharing capabilities |
| Progress Celebrations | 80% | Milestone celebration animations |

### Mobile Optimization (Week 2-3)
| Feature | Progress | Notes |
|---------|----------|-------|
| PWA Features | 85% | Progressive web app capabilities |
| Touch Interactions | 90% | Mobile-optimized touch handlers |
| Mobile-First Redesign | 80% | Responsive layout improvements |
| Offline Functionality | 65% | Offline-first data sync |

### Advanced Analytics (Week 3-4)
| Feature | Progress | Notes |
|---------|----------|-------|
| Predictive Insights | 85% | ML-based predictions |
| Behavioral Analysis | 80% | Pattern recognition |
| Recommendation Engine | 75% | Personalized suggestions |
| Export Features | 90% | Data export capabilities |

### Ongoing Development
| Feature | Module | Progress |
|---------|--------|----------|
| Content Recommendations | Educational | 80% |
| Family Leaderboards | Gamification | 75% |
| Reward Redemption | Gamification | 70% |
| Recurrence Patterns | Chores | 75% |
| Parent Verification | Chores | 80% |
| Predictive Analytics | Reporting | 85% |
| Automated Alerting | Security | 95% |
| Compliance Reporting | Security | 90% |

---

## ⚙️ Feature Flags & Conditional Logic

Runtime feature toggles and conditional settings.

| Flag/Setting | Location | Purpose | Current State |
|--------------|----------|---------|---------------|
| `parent_signup_enabled` | `site_settings` table | Control new parent registrations | Active |
| `site_maintenance_mode` | `site_settings` table | Enable site-wide maintenance mode | Inactive |
| `is_enabled` | `edge_function_alert_config` | Per-function health monitoring | Per-function |
| Game `isReady` flag | Games catalog data | Control individual game availability | Per-game |

---

## ⚠️ Empty Error Handlers

Silent failure points that may mask issues in production.

| Location | Issue | Risk Level |
|----------|-------|------------|
| `src/utils/chartPreloader.ts:25-30` | Empty `.catch(() => {})` blocks | Medium - Chart preload failures hidden |
| `src/utils/chartPreloader.ts:39-40` | Empty catch for performance charts | Medium - Missing error visibility |
| `src/utils/chartPreloader.ts:44` | Empty catch for progress charts | Medium - Missing error visibility |
| `src/utils/chartPreloader.ts:48` | Empty catch for admin charts | Medium - Missing error visibility |

**Recommendation:** Add error logging to catch blocks:
```typescript
.catch((err) => {
  console.warn('[ChartPreloader] Failed to preload:', err.message);
});
```

---

## Maintenance Notes

### Weekly Review Checklist
- [ ] Review Critical Priority items for security impact
- [ ] Update In-Progress percentages from team standups
- [ ] Move completed items to "Recently Completed" section
- [ ] Cross-reference with sprint planning

### Item Lifecycle
1. **New Item Discovered** → Add to appropriate priority section
2. **Work Begins** → Move to In-Progress with percentage
3. **Completed** → Mark with completion date
4. **30 Days Post-Completion** → Remove from document

### Related Documentation
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - Overall project progress
- [AUTH_E2E_COVERAGE_REPORT.md](./AUTH_E2E_COVERAGE_REPORT.md) - Testing coverage
- [RLS_POLICIES_COMPREHENSIVE_GUIDE.md](./RLS_POLICIES_COMPREHENSIVE_GUIDE.md) - Security policies
- [PROJECT_KNOWLEDGE.md](./PROJECT_KNOWLEDGE.md) - Architecture overview

---

## Recently Completed

| Item | Completed Date | Notes |
|------|----------------|-------|
| Parent Sign-In Redirect | 2026-01-24 | Fixed race condition in auth navigation |
| Auth Session Hydration | 2026-01-24 | Added explicit navigation after sign-in |

---

*Last updated: January 24, 2026*
