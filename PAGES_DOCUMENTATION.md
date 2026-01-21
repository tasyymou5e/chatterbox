# Pages Documentation

> **Last Updated:** 2026-01-21  
> **Total Pages:** 35+  
> **Location:** `src/pages/`

## Overview

This document provides comprehensive documentation for all pages in the Chatterbox platform, organized by user role and feature area. Each page includes its route, purpose, key features, and component dependencies.

---

## Table of Contents

1. [Page Architecture](#page-architecture)
2. [Public Pages](#public-pages)
3. [Authentication Pages](#authentication-pages)
4. [Parent Pages](#parent-pages)
5. [Kids Pages](#kids-pages)
6. [Admin Pages](#admin-pages)
7. [Feature Pages](#feature-pages)
8. [Support Pages](#support-pages)
9. [Lazy Loading](#lazy-loading)

---

## Page Architecture

### Directory Structure

```
src/pages/
├── Index.tsx                    # Landing page
├── About.tsx                    # About page
├── Auth.tsx                     # Authentication page
├── NotFound.tsx                 # 404 page
├── GamesCatalog.tsx             # Content catalog
├── GamesCatalogLazy.tsx         # Lazy-loaded catalog
├── ParentDashboard.tsx          # Parent dashboard
├── Reports.tsx                  # Public reports
├── AACDemo.tsx                  # AAC demonstration
├── SubtractionGameDemo.tsx      # Game demo
│
├── admin/                       # Admin pages
│   ├── AdminDashboard.tsx
│   ├── AdminUsers.tsx
│   ├── AdminFamilies.tsx
│   ├── AdminContent.tsx
│   ├── AdminReports.tsx
│   ├── AdminSystemMonitoring.tsx
│   ├── AdminSecurityCenter.tsx
│   ├── AdminLLMMonitoring.tsx
│   ├── AdminLogin.tsx
│   ├── AdminLayout.tsx
│   └── ResetPasswordConfirm.tsx
│
├── parent/                      # Parent pages
│   ├── ParentChoreManagement.tsx
│   ├── ParentConnectionManagement.tsx
│   ├── ParentReports.tsx
│   └── ParentSettings.tsx
│
├── kids/                        # Kids portal
│   └── KidsPortal.tsx
│
├── children/                    # Children-specific
│   └── ChildrenTasksDashboard.tsx
│
├── connect/                     # Connection features
│   ├── CommunityForum.tsx
│   ├── ParentResources.tsx
│   ├── ResearchStudies.tsx
│   └── TherapistTools.tsx
│
├── features/                    # Feature pages
│   ├── CommunicationSupport.tsx
│   ├── EducationalGames.tsx
│   ├── FamilyManagement.tsx
│   └── ProgressTracking.tsx
│
├── support/                     # Support pages
│   ├── ContactUs.tsx
│   ├── HelpCenter.tsx
│   ├── PrivacyPolicy.tsx
│   └── TermsOfService.tsx
│
└── lazy/                        # Lazy-loaded variants
    ├── index.ts
    └── [PageName]Lazy.tsx
```

### Route Configuration

Routes are defined in `src/routes/index.tsx` with:
- Public routes (no auth required)
- Protected routes (auth required)
- Role-based routes (admin/parent/child)

---

## Public Pages

### Index (`/`)

**File:** `src/pages/Index.tsx`

**Purpose:** Landing page for unauthenticated users.

**Key Features:**
- Hero section with value proposition
- Feature highlights
- Portal selection (Kids/Parents/Admin)
- Call-to-action buttons

**Components Used:**
- `Hero`
- `PortalSelection`
- `SiteHeader`

---

### About (`/about`)

**File:** `src/pages/About.tsx`

**Purpose:** Information about the platform and mission.

**Key Features:**
- Mission statement
- Team information
- Autism-friendly design principles
- Contact information

---

### NotFound (`/404`, `/*`)

**File:** `src/pages/NotFound.tsx`

**Purpose:** 404 error page for invalid routes.

**Key Features:**
- Friendly error message
- Navigation links
- Search suggestion

---

## Authentication Pages

### Auth (`/auth`)

**File:** `src/pages/Auth.tsx`

**Purpose:** User authentication (login/signup/password reset).

**Key Features:**
- Sign in form
- Sign up form
- Password reset request
- Social authentication (if enabled)
- Role-based redirect after login

**Components Used:**
- `SignInForm`
- `SignUpForm`
- `ForgotPasswordForm`
- `AuthLayout`
- `PasswordStrengthIndicator`

**Hooks Used:**
- `useAuth`
- `useAuthNavigation`
- `useLoginRateLimiter`

---

### Reset Password (`/admin/reset-password`)

**File:** `src/pages/admin/ResetPasswordConfirm.tsx`

**Purpose:** Password reset confirmation page.

**Key Features:**
- Token validation
- New password form
- Password requirements display
- Success/error feedback

---

## Parent Pages

### Parent Dashboard (`/parent-dashboard`)

**File:** `src/pages/ParentDashboard.tsx`

**Purpose:** Main dashboard for parent users.

**Key Features:**
- Children overview
- Quick actions
- Recent activity
- Chore summary
- Progress highlights

**Components Used:**
- `ChildrenAchievementsPanel`
- `ChildrenContentUsage`
- `WeeklyProgressSummary`
- `ParentNavigation`

---

### Parent Chore Management (`/parent/chores`)

**File:** `src/pages/parent/ParentChoreManagement.tsx`

**Purpose:** Manage chores for children.

**Key Features:**
- Chore list view
- Create/edit chores
- Assign to children
- Verify completions
- Recurring chore setup

**Components Used:**
- `ChoreManagementDashboard`
- `ChoreVerificationDialog`
- `RecurringChoreDialog`

---

### Parent Connection Management (`/parent/connections`)

**File:** `src/pages/parent/ParentConnectionManagement.tsx`

**Purpose:** Manage family connections and invitations.

**Key Features:**
- View family members
- Send invitations
- Manage permissions
- Remove connections

**Components Used:**
- `ConnectionManagementDashboard`
- `InviteConnectionDialog`
- `ConnectionPermissionsDialog`

---

### Parent Reports (`/parent/reports`)

**File:** `src/pages/parent/ParentReports.tsx`

**Purpose:** View family activity and progress reports.

**Key Features:**
- Activity timeline
- Progress charts
- Export options
- Date range filtering

**Components Used:**
- `FamilyActivityReport`
- `ParentActivityLogsTable`
- `ProgressReportExport`

---

### Parent Settings (`/parent/settings`)

**File:** `src/pages/parent/ParentSettings.tsx`

**Purpose:** Family and account settings.

**Key Features:**
- Profile settings
- Privacy preferences
- Notification settings
- Child account management

**Components Used:**
- `PrivacySettingsPage`
- `CreateChildAccountDialog`

---

## Kids Pages

### Kids Portal (`/kids`)

**File:** `src/pages/kids/KidsPortal.tsx`

**Purpose:** Unified portal for child users.

**Key Features:**
- Age-appropriate content display
- Game launcher
- Progress visualization
- Achievement display
- Autism-friendly interface

**Components Used:**
- `KidsPortalLayout`
- `KidsContentCard`
- `KidsGameLauncher`
- `KidsProgressHeader`
- `AgeGroupMenu`
- `StarProgressTracker`
- `MoonProgressBar`

**Hooks Used:**
- `useKidsContentLoader`
- `useStarProgress`
- `useGameSession`

**Design Features:**
- Large touch targets
- Minimal text
- Visual navigation
- Consistent layout
- Calming color palette

---

### Children Tasks Dashboard (`/children/tasks`)

**File:** `src/pages/children/ChildrenTasksDashboard.tsx`

**Purpose:** Task/chore view for children.

**Key Features:**
- Assigned chores list
- Completion interface
- Photo upload for verification
- Points display

**Components Used:**
- `ChildrenChoresDashboard`
- `ChoreCompletionDialog`

---

## Admin Pages

### Admin Dashboard (`/admin/dashboard`)

**File:** `src/pages/admin/AdminDashboard.tsx`

**Purpose:** Main admin overview.

**Key Features:**
- KPI metrics
- Analytics charts
- Quick actions
- System health
- Security overview

**Components Used:**
- `AnalyticsKPICard`
- `EngagementChart`
- `RetentionChart`
- `SystemHealthWidget`
- `EnhancedSecurityDashboard`
- `AdminAPIIntegrations`
- `AdminSiteSettings`

---

### Admin Users (`/admin/users`)

**File:** `src/pages/admin/AdminUsers.tsx`

**Purpose:** User management.

**Key Features:**
- Virtualized user table
- Search and filter
- CRUD operations
- Role management

**Components Used:**
- `VirtualizedUserTable`
- `UserViewDialog`
- `UserEditDialog`
- `UserCreateDialog`
- `UserDeleteDialog`
- `UserPasswordResetDialog`

---

### Admin Families (`/admin/families`)

**File:** `src/pages/admin/AdminFamilies.tsx`

**Purpose:** Family management.

**Key Features:**
- Virtualized family table
- Member management
- Family deletion (cascade)

**Components Used:**
- `VirtualizedFamilyTable`
- `FamilyViewDialog`
- `FamilyEditDialog`
- `FamilyDeleteDialog`
- `AdminMemberManagementDialog`

---

### Admin Content (`/admin/content`)

**File:** `src/pages/admin/AdminContent.tsx`

**Purpose:** Content management.

**Key Features:**
- Content catalog
- Category management
- Content moderation
- Activation/deactivation

**Components Used:**
- `ContentItemDialog`
- `FamilyContentManager`

---

### Admin Reports (`/admin/reports`)

**File:** `src/pages/admin/AdminReports.tsx`

**Purpose:** Analytics and reports.

**Key Features:**
- Advanced analytics dashboard
- Data export
- Custom reports

**Components Used:**
- `AdvancedAnalyticsDashboard`
- `FamilyProgressDashboard`

---

### Admin System Monitoring (`/admin/system-monitoring`)

**File:** `src/pages/admin/AdminSystemMonitoring.tsx`

**Purpose:** System health monitoring.

**Key Features:**
- Service health status
- Error tracking
- Alert management
- Log viewing

**Components Used:**
- `SystemHealthMonitor`
- `SystemErrorsPanel`
- `SystemAlertsPanel`
- `DatabaseLogs`
- `EdgeFunctionLogs`
- `ErrorStatisticsCards`
- `CircuitBreakerAlert`

---

### Admin Security Center (`/admin/security-center`)

**File:** `src/pages/admin/AdminSecurityCenter.tsx`

**Purpose:** Security operations.

**Key Features:**
- Security metrics
- Threat indicators
- Audit trail
- Security tests

**Components Used:**
- `EnhancedSecurityDashboard`
- `SecurityAuditTrail`
- `SecurityDashboard`

---

### Admin LLM Monitoring (`/admin/llm-monitoring`)

**File:** `src/pages/admin/AdminLLMMonitoring.tsx`

**Purpose:** AI/LLM usage and cost tracking.

**Key Features:**
- Usage metrics
- Cost tracking
- Trend analysis
- Threshold alerts

**Components Used:**
- `LLMUsageTrendsChart`
- `LLMCostAlerts`
- `LLMCostThresholdSettings`

---

### Admin Login (`/admin/login`)

**File:** `src/pages/admin/AdminLogin.tsx`

**Purpose:** Admin authentication.

**Key Features:**
- Admin-only login form
- Enhanced security
- Rate limiting

---

### Admin Layout

**File:** `src/pages/admin/AdminLayout.tsx`

**Purpose:** Layout wrapper for admin pages.

**Key Features:**
- Sidebar navigation
- Header with user info
- Responsive design
- Route protection

---

## Feature Pages

### Games Catalog (`/games`)

**File:** `src/pages/GamesCatalog.tsx`

**Purpose:** Educational content catalog.

**Key Features:**
- Content grid
- Category filtering
- Age filtering
- Search
- Autism features filter

**Components Used:**
- `CatalogContentGrid`
- `CatalogHeader`
- `CatalogSearchBar`
- `CategoryFilter`
- `ContentCard`

---

### Reports (`/reports`)

**File:** `src/pages/Reports.tsx`

**Purpose:** Public-facing reports.

**Key Features:**
- Progress overview
- Activity logs
- Export options

---

### AAC Demo (`/aac-demo`)

**File:** `src/pages/AACDemo.tsx`

**Purpose:** Augmentative and Alternative Communication demo.

**Key Features:**
- Symbol-based communication
- Text-to-speech
- Response buttons
- Voice recording

**Components Used:**
- `ParentResponseButton`
- `ResponseTimeIndicator`
- `VoiceRecordingManager`

---

### Subtraction Game Demo (`/subtraction-demo`)

**File:** `src/pages/SubtractionGameDemo.tsx`

**Purpose:** Educational game demonstration.

**Key Features:**
- Interactive math game
- Progress tracking
- Visual feedback

**Components Used:**
- `SubtractionGame`
- `GameWrapper`

---

## Support Pages

### Contact Us (`/contact`)

**File:** `src/pages/support/ContactUs.tsx`

**Purpose:** Contact information and form.

---

### Help Center (`/help`)

**File:** `src/pages/support/HelpCenter.tsx`

**Purpose:** Help documentation and FAQs.

---

### Privacy Policy (`/privacy`)

**File:** `src/pages/support/PrivacyPolicy.tsx`

**Purpose:** Privacy policy document.

---

### Terms of Service (`/terms`)

**File:** `src/pages/support/TermsOfService.tsx`

**Purpose:** Terms of service document.

---

## Lazy Loading

### Lazy-Loaded Pages

All major pages have lazy-loaded variants in `src/pages/lazy/`:

```typescript
// src/pages/lazy/index.ts
export { default as AdminDashboardLazy } from './AdminDashboardLazy';
export { default as AdminUsersLazy } from './AdminUsersLazy';
export { default as AdminFamiliesLazy } from './AdminFamiliesLazy';
export { default as AdminContentLazy } from './AdminContentLazy';
export { default as AdminReportsLazy } from './AdminReportsLazy';
export { default as AdminSystemMonitoringLazy } from './AdminSystemMonitoringLazy';
export { default as AdminSecurityCenterLazy } from './AdminSecurityCenterLazy';
export { default as AdminLLMMonitoringLazy } from './AdminLLMMonitoringLazy';
export { default as ParentDashboardLazy } from './ParentDashboardLazy';
export { default as ParentReportsLazy } from './ParentReportsLazy';
export { default as KidsPortalLazy } from './KidsPortalLazy';
export { default as AACDemoLazy } from './AACDemoLazy';
export { default as SubtractionGameDemoLazy } from './SubtractionGameDemoLazy';
```

### Implementation Pattern

```typescript
// src/pages/lazy/AdminDashboardLazy.tsx
import { lazy, Suspense } from 'react';
import { PageSkeleton } from '@/components/skeletons';

const AdminDashboard = lazy(() => import('../admin/AdminDashboard'));

export default function AdminDashboardLazy() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminDashboard />
    </Suspense>
  );
}
```

### Benefits

1. **Faster Initial Load:** Only load code when needed
2. **Smaller Bundles:** Code splitting per route
3. **Better UX:** Skeleton loading states
4. **Reduced Memory:** Unload unused pages

---

## Route Protection

### Public Routes
- `/`, `/about`, `/auth`, `/privacy`, `/terms`, `/help`, `/contact`

### Authenticated Routes
- `/games`, `/reports`, `/aac-demo`, `/subtraction-demo`

### Parent Routes
- `/parent-dashboard`, `/parent/*`

### Child Routes
- `/kids`, `/children/*`

### Admin Routes
- `/admin/*` (except `/admin/login`)

---

## Page Development Guidelines

### Creating New Pages

1. Create page component in appropriate directory
2. Add route in `src/routes/index.tsx`
3. Create lazy-loaded variant if large
4. Add to navigation if applicable
5. Document in this file

### Page Template

```typescript
import { PageWrapper } from '@/components/wrappers';
import { useAuth } from '@/hooks/useAuth';

export default function NewPage() {
  const { user } = useAuth();

  return (
    <PageWrapper>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Page Title</h1>
        {/* Page content */}
      </div>
    </PageWrapper>
  );
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-21 | Initial documentation |
