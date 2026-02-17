# Admin Features Guide

> **Last Updated:** 2026-02-17  
> **Admin Portal:** `/admin/*`  
> **Authorization:** Requires `admin` role

## Overview

This guide documents all administrative features, workflows, and capabilities available in the Chatterbox Admin Portal. It covers user management, family administration, content moderation, system monitoring, and security operations.

---

## Table of Contents

1. [Access & Authentication](#access--authentication)
2. [Dashboard Overview](#dashboard-overview)
3. [User Management](#user-management)
4. [Family Management](#family-management)
5. [Content Management](#content-management)
6. [System Monitoring](#system-monitoring)
7. [Security Center](#security-center)
8. [LLM Monitoring](#llm-monitoring)
9. [Reports & Analytics](#reports--analytics)
10. [Debug Tools](#debug-tools)

---

## Access & Authentication

### Admin Login

**Route:** `/admin/login`

**Requirements:**
- Valid admin email and password
- Account must have `admin` role in `user_roles` table
- Server-side role verification via `has_role` RPC

**Security Features:**
- Rate limiting (5 attempts per 15 minutes)
- Session logging for audit trail
- Device fingerprinting
- Automatic logout on inactivity

### Admin Route Protection

```typescript
// src/components/admin/AdminRoute.tsx
- Verifies admin role via RPC call
- Redirects unauthorized users to /admin/login
- Shows loading state during verification
- Prevents route access without valid session
```

### Password Reset

**Route:** `/admin/reset-password`

**Flow:**
1. Admin requests password reset via email
2. Receives secure reset link
3. Sets new password meeting security requirements
4. Audit log entry created

---

## Dashboard Overview

### Route: `/admin/dashboard`

### Key Metrics (KPI Cards)

| Metric | Description | Data Source |
|--------|-------------|-------------|
| Total Families | Count of all families | `families` table |
| Total Users | Count of all users | `profiles` table |
| Active Users | Users active in last 7 days | `user_activity_logs` |
| Total Logins | Login events in period | `user_activity_logs` |
| Recent Signups | New users in last 30 days | `profiles.created_at` |

### Dashboard Widgets

1. **Analytics Overview**
   - Engagement chart (line graph)
   - Retention chart (cohort analysis)
   
2. **System Health Widget**
   - Service status indicators
   - Response time metrics
   - Error rate trends

3. **Quick Actions**
   - Create Test Family
   - View Families
   - Manage Users
   - View Reports
   - LLM Monitoring

4. **API Integrations Status**
   - External API connectivity
   - Integration health checks

5. **Enhanced Security Dashboard**
   - Security alerts summary
   - RLS violation counts
   - Threat indicators

---

## User Management

### Route: `/admin/users`

### Features

#### User List
- Virtualized table for performance (1000+ users)
- Search by name, email
- Filter by role, status, family
- Sort by any column
- Pagination controls

#### User Actions

| Action | Description | Edge Function |
|--------|-------------|---------------|
| View | Read-only user details | - |
| Edit | Update profile, role | `admin-update-user` |
| Create | Add new user | `admin-create-user` |
| Delete | Remove user permanently | `admin-delete-user` |
| Reset Password | Send password reset email | - |
| Bulk Delete | Delete multiple selected users | `admin-delete-user` (sequential) |

### Bulk Delete

**Component:** `BulkDeleteConfirmDialog.tsx`

- Checkbox-based multi-select in user table
- Select All / Deselect All controls
- Floating action bar shows selected count with "Delete Selected" button
- Typed confirmation required (e.g., `DELETE 5 USERS`)
- Progress indicator during sequential deletion
- Results summary with success/failure counts
- Self-deletion prevention: admin cannot select themselves

### User View Dialog

**Component:** `UserViewDialog.tsx`

Displays:
- Profile information (name, email, avatar)
- Account status (active, suspended)
- Role assignments
- Family membership
- Activity history
- Last login timestamp

### User Edit Dialog

**Component:** `UserEditDialog.tsx`

Editable fields:
- First name, Last name
- Email (with validation)
- Role assignment
- Family assignment
- Account status

### User Create Dialog

**Component:** `UserCreateDialog.tsx`

Required fields:
- Email (unique)
- Password (meets security requirements)
- First name, Last name
- Role selection
- Optional: Family assignment

### Password Reset Dialog

**Component:** `UserPasswordResetDialog.tsx`

- Sends password reset email
- Logs action in audit trail
- Shows confirmation

---

## Family Management

### Route: `/admin/families`

### Features

#### Family List
- Virtualized table for performance
- Search by family name
- Filter by member count, status
- Sort capabilities
- Member count display

#### Family Actions

| Action | Description | Edge Function |
|--------|-------------|---------------|
| View | Family details, members | - |
| Edit | Update family name | - |
| Delete | Remove family (cascade) | `delete-family-comprehensive` |
| Add Member | Add user to family | `admin-add-family-member` |
| Remove Member | Remove user from family | `admin-remove-family-member` |
| Bulk Delete | Delete multiple selected families | `delete-family-comprehensive` (sequential) |

### Bulk Delete

**Component:** `BulkDeleteConfirmDialog.tsx` (shared with user bulk delete)

- Checkbox-based multi-select per family row
- Select All checkbox in family list header
- Floating action bar with selected count and "Delete Selected" button
- Typed confirmation required (e.g., `DELETE 3 FAMILIES`)
- Progress indicator during sequential deletion
- Test families: deletes all member auth accounts
- Regular families: preserves member auth accounts (`preserveUserAccounts: true`)
- Results summary with success/failure counts

### Family View Dialog

**Component:** `FamilyViewDialog.tsx`

Displays:
- Family name and ID
- Created date
- Creator information
- Member list with roles
- Associated children accounts
- Activity summary

### Family Edit Dialog

**Component:** `FamilyEditDialog.tsx`

Editable fields:
- Family name
- Settings/preferences

### Family Delete Dialog

**Component:** `FamilyDeleteDialog.tsx`

**Cascade Deletion (via `delete-family-comprehensive` edge function):**
1. Removes all family members
2. Deletes child accounts
3. Deletes family record (cascades to 24+ dependent tables)
4. Removes user roles for all members
5. Conditionally deletes auth user accounts (test families only)

**Safety:**
- Requires typed confirmation (family code)
- Shows affected data count
- Test families: warns that all user accounts will be deleted
- Regular families: confirms user accounts will be preserved
- Audit log entry via edge function

### Member Management Dialog

**Component:** `AdminMemberManagementDialog.tsx`

- Add existing user to family
- Remove member from family
- Change member role within family

---

## Content Management

### Route: `/admin/content`

### Features

#### Content Catalog
- Grid view of all content items
- Category filtering
- Age range filtering
- Content type filtering
- Active/inactive toggle

#### Content Actions

| Action | Description |
|--------|-------------|
| View | Content details, statistics |
| Edit | Update metadata, settings |
| Create | Add new content item |
| Activate/Deactivate | Toggle visibility |
| Reorder | Change sort order |

### Content Item Dialog

**Component:** `ContentItemDialog.tsx`

Fields:
- Title, Description
- Content type (game, video, lesson)
- URL, Thumbnail URL
- Age range (min, max)
- Category assignment
- Tags
- Autism features flags
- Active status

### Content Categories

- Manage category hierarchy
- Set category icons
- Reorder categories
- Activate/deactivate categories

---

## System Monitoring

### Route: `/admin/system-monitoring`

### Monitoring Tabs

#### 1. System Health

**Component:** `SystemHealthMonitor.tsx`

Metrics displayed:
- Service status (healthy/degraded/down)
- Response times
- Uptime percentages
- Error rates
- Memory usage

#### 2. Error Statistics

**Component:** `ErrorStatisticsCards.tsx`

Cards showing:
- Total errors (all time)
- Critical errors
- High/Medium/Low severity breakdown
- Resolved vs unresolved
- Top error components
- Error rate trend graph

#### 3. System Errors Panel

**Component:** `SystemErrorsPanel.tsx`

- List of recent errors
- Filter by severity, component
- Error details modal
- Resolution actions
- Stack trace viewing

#### 4. System Alerts Panel

**Component:** `SystemAlertsPanel.tsx`

- Active alerts list
- Severity indicators
- Acknowledge action
- Resolve action
- Alert history

#### 5. Database Logs

**Component:** `DatabaseLogs.tsx`

- Postgres logs (errors, warnings)
- Auth logs
- Query performance logs
- Real-time log streaming

#### 6. Edge Function Logs

**Component:** `EdgeFunctionLogs.tsx`

- Function execution logs
- Response times
- Error rates
- Status codes
- Deployment versions

### Circuit Breaker

**Component:** `CircuitBreakerAlert.tsx`

- Automatic failure detection
- Service degradation alerts
- Recovery monitoring
- Manual reset option

#### 7. E2E Test Coverage

**Component:** `AuthE2ETestCoverage.tsx`

Dashboard for authentication E2E test coverage:
- Test suite summary cards (162 tests across 5 suites)
- Coverage matrix (components, hooks, stores, edge functions)
- Gap analysis with priority indicators
- CLI commands to run tests locally

**Related Files:**
- `src/components/admin/testing/TestSuiteSummaryCards.tsx`
- `src/components/admin/testing/TestCoverageMatrix.tsx`
- `src/components/admin/testing/RunTestsPanel.tsx`
- `src/components/admin/testing/CoverageGapAnalysis.tsx`

See `AUTH_E2E_COVERAGE_REPORT.md` for detailed coverage data.

---

## Security Center

### Route: `/admin/security-center`

### Security Dashboard

**Component:** `EnhancedSecurityDashboard.tsx`

#### Security Metrics

| Metric | Description |
|--------|-------------|
| Total Alerts | Security events requiring attention |
| RLS Violations | Failed RLS policy access attempts |
| Failed Activities | Failed login attempts, etc. |
| System Errors | Security-related errors |

#### Threat Indicators

- Real-time threat detection
- Severity classification
- IP address tracking
- User association
- Event details

### Security Audit Trail

**Component:** `SecurityAuditTrail.tsx`

Logged events:
- Login attempts (success/failure)
- Role changes
- Data access patterns
- Admin operations
- Suspicious activities

### Security Tests

**Component:** via `security-testing` edge function

Test categories:
- RLS policy enforcement
- Authentication flow security
- Input validation
- Rate limiting effectiveness

---

## LLM Monitoring

### Route: `/admin/llm-monitoring`

### Cost Tracking

**Component:** `AdminLLMMonitoring.tsx`

Metrics:
- Total API calls
- Token usage (prompt + completion)
- Cost by function
- Cost trends over time
- Budget vs actual

### Cost Alerts

**Component:** `LLMCostAlerts.tsx`

- Threshold-based alerting
- Daily/weekly/monthly limits
- Email notifications
- Automatic rate limiting

### Usage Trends

**Component:** `LLMUsageTrendsChart.tsx`

- Token usage over time
- Cost per user
- Most expensive operations
- Optimization opportunities

---

## Reports & Analytics

### Route: `/admin/reports`

### Available Reports

1. **Family Activity Report**
   - Activity by family
   - Engagement metrics
   - Growth trends

2. **User Analytics**
   - Active user counts
   - Session duration
   - Feature usage

3. **Content Performance**
   - Most played content
   - Completion rates
   - User ratings

4. **Progress Analytics**
   - Learning progress aggregates
   - Achievement distribution
   - Skill level progression

### Export Options

- CSV export
- Date range selection
- Filter by family/user

---

## Debug Tools

### Route: `/admin/debug` (Development Only)

**Component:** `AdminDebugPanel.tsx`

### Available Tools

1. **Session Inspector**
   - Current session details
   - Token information
   - Role verification status

2. **Database Inspector**
   - Direct query execution
   - Table inspection
   - RLS policy testing

3. **Test Family Creator**
   - Create test families
   - Generate test data
   - Cleanup test data

4. **Console Logger**
   - Enable/disable verbose logging
   - Filter log categories
   - Export logs

### Security

- Only available in development environment
- Additional authentication required
- All actions logged

---

## Navigation Structure

```
/admin
├── /dashboard        # Main overview
├── /users            # User management
├── /families         # Family management
├── /content          # Content management
├── /reports          # Analytics & reports
├── /system-monitoring # System health
├── /security-center  # Security operations
├── /llm-monitoring   # AI cost tracking
├── /login            # Admin authentication
├── /reset-password   # Password reset
└── /debug            # Debug tools (dev only)
```

---

## Permissions Matrix

| Feature | Admin | Parent | Child |
|---------|-------|--------|-------|
| View Dashboard | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| Manage Families | ✅ | ❌ | ❌ |
| Manage Content | ✅ | ❌ | ❌ |
| View Reports | ✅ | ❌ | ❌ |
| System Monitoring | ✅ | ❌ | ❌ |
| Security Center | ✅ | ❌ | ❌ |
| LLM Monitoring | ✅ | ❌ | ❌ |
| Debug Tools | ✅* | ❌ | ❌ |

*Development environment only

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-21 | Initial documentation |
| 1.1.0 | 2026-02-17 | Added admin-delete-user edge function, bulk delete for users and families, updated delete-family-comprehensive with preserveUserAccounts parameter |
