# Component Documentation
*Complete component reference for Spectrum Harmony Family Task Management System*

## 📚 Table of Contents
- [Page Components](#-page-components)
- [Feature Components](#-feature-components)
- [UI Components](#-ui-components)
- [Custom Hooks](#-custom-hooks)
- [State Management](#-state-management)
- [Component Relationships](#-component-relationships)
- [Props and Interfaces](#-props-and-interfaces)

---

## 📄 Page Components

### Admin Pages (`src/pages/admin/`)

#### **AdminDashboard.tsx**
- **Purpose**: Main admin control panel with system overview
- **Features**: KPI cards, quick actions, system health status
- **Dependencies**: `useAnalytics`, `systemHealthStore`, various admin components
- **Route**: `/admin/dashboard`

#### **AdminUsers.tsx** 
- **Purpose**: Complete user management interface
- **Features**: User listing, search/filter, CRUD operations, password reset
- **Key Components**: 
  - `UserViewDialog` - Display user details
  - `UserEditDialog` - Edit user info and roles  
  - `UserDeleteDialog` - Safe user deletion
  - `UserPasswordResetDialog` - Admin password reset functionality
- **State**: Users list, loading states, dialog visibility
- **Route**: `/admin/users`

#### **AdminFamilies.tsx**
- **Purpose**: Family management and oversight
- **Features**: Family listing, creation, member management
- **Key Components**:
  - `CreateTestFamilyButton` - Bulk family creation for testing
  - `CreateTestFamilyDialog` - Test family creation form
  - `FamilyViewDialog` - Family details display
  - `FamilyEditDialog` - Family information editing
  - `FamilyDeleteDialog` - Family deletion with confirmation
  - `FamilyNameSuggestions` - AI-powered name suggestions
- **Route**: `/admin/families`

#### **AdminContent.tsx**
- **Purpose**: Content moderation and management
- **Features**: Content approval, categorization, metadata editing
- **Key Components**: `ContentItemDialog` - Content details and approval
- **Route**: `/admin/content`

#### **AdminReports.tsx**
- **Purpose**: System-wide analytics and reporting
- **Features**: Advanced analytics, custom date ranges, export functionality
- **Key Components**: Various chart and analytics components
- **Route**: `/admin/reports`

#### **AdminSystemMonitoring.tsx**
- **Purpose**: Real-time system health monitoring
- **Features**: Performance metrics, error tracking, system alerts
- **Key Components**:
  - `SystemHealthLogs` - System performance logs
  - `ApplicationLogs` - Application error logs
  - `UserActivityLogs` - User activity monitoring
- **Route**: `/admin/system`

#### **AdminLayout.tsx**
- **Purpose**: Common layout wrapper for admin pages
- **Features**: Navigation, breadcrumbs, admin-specific styling
- **Usage**: Wraps all admin pages for consistent layout

#### **AdminLogin.tsx**
- **Purpose**: Secure admin authentication
- **Features**: Enhanced security, rate limiting warnings, debug access
- **Dependencies**: `useAdminAuth`, password reset functionality
- **Route**: `/admin/login`

#### **ResetPasswordConfirm.tsx**
- **Purpose**: Password reset confirmation handling
- **Features**: Token validation, new password form
- **Route**: `/admin/reset-password-confirm`

### Parent Pages (`src/pages/parent/`)

#### **ParentDashboard.tsx**
- **Purpose**: Family overview and management dashboard
- **Features**: Family activity, child progress, quick actions
- **Dependencies**: Family data, child accounts, analytics
- **Route**: `/parent/dashboard`

#### **ParentChoreManagement.tsx**
- **Purpose**: Chore creation and assignment interface
- **Features**: Chore templates, assignment tracking, progress monitoring
- **Key Components**: `ChoreManagementDashboard`
- **Route**: `/parent/chores`

### Child Pages (`src/pages/children/`)

#### **ChildrenTasksDashboard.tsx**
- **Purpose**: Child's task and activity interface
- **Features**: Assigned tasks, progress tracking, gamification elements
- **Key Components**: `ChildrenChoresDashboard`
- **Route**: `/children/tasks`

### General Pages (`src/pages/`)

#### **Index.tsx**
- **Purpose**: Landing page with portal selection
- **Features**: Role-based navigation, portal descriptions
- **Key Components**: `Hero`, `PortalSelection`
- **Route**: `/`

#### **Auth.tsx**
- **Purpose**: General authentication for parents/children
- **Features**: Login/signup forms, role detection
- **Dependencies**: `useAuth` hook
- **Route**: `/auth`

#### **GamesCatalog.tsx**
- **Purpose**: Educational games and content browser
- **Features**: Content filtering, favorites, interaction tracking
- **Key Components**: `CategoryFilter`, `ContentCard`
- **Route**: `/games`

#### **Reports.tsx**
- **Purpose**: Family-specific reporting and analytics
- **Features**: Family activity reports, progress tracking
- **Key Components**: `FamilyActivityReport`, `ActivityLogsTable`
- **Route**: `/reports`

#### **About.tsx**
- **Purpose**: Information about the platform
- **Route**: `/about`

#### **NotFound.tsx** 
- **Purpose**: 404 error page
- **Route**: `*` (catch-all)

---

## 🧩 Feature Components

### Admin Components (`src/components/admin/`)

#### **User Management Components**

**UserViewDialog.tsx**
- **Purpose**: Display comprehensive user information
- **Props**: `open`, `onOpenChange`, `user`
- **Features**: Profile details, role badges, family associations
- **Dependencies**: User interface, badge components

**UserEditDialog.tsx**
- **Purpose**: Edit user profiles and role assignments  
- **Props**: `open`, `onOpenChange`, `user`, `onSuccess`
- **Features**: 
  - Profile editing (name, email)
  - Role management with checkboxes
  - Password reset integration
  - Form validation and error handling
- **State**: Form data, selected roles, loading states
- **Key Features**: Password reset section with `UserPasswordResetDialog`

**UserDeleteDialog.tsx**
- **Purpose**: Safe user deletion with confirmation
- **Props**: `open`, `onOpenChange`, `user`, `onSuccess`
- **Features**: Confirmation dialog, cascade deletion warning
- **Safety**: Multiple confirmation steps, data preservation options

**UserPasswordResetDialog.tsx** 🆕
- **Purpose**: Admin-controlled password reset functionality
- **Props**: `open`, `onOpenChange`, `user`, `onSuccess`
- **Features**:
  - Secure password generation (12+ chars, mixed case, numbers, symbols)
  - Password strength indicator with visual feedback
  - Copy-to-clipboard functionality
  - Force password change option
  - Real-time password validation
- **Security**: Admin role verification, activity logging
- **API**: Calls `admin-update-user` edge function

#### **Family Management Components**

**FamilyViewDialog.tsx**
- **Purpose**: Display family details and member information
- **Features**: Family code, member list, creation date, statistics

**FamilyEditDialog.tsx**
- **Purpose**: Edit family information and settings
- **Features**: Name editing, display name updates, member management

**FamilyDeleteDialog.tsx**
- **Purpose**: Family deletion with member handling
- **Safety**: Member reassignment, data preservation warnings

**CreateTestFamilyButton.tsx**
- **Purpose**: Bulk family creation for development/testing
- **Features**: Async family creation, progress feedback

**CreateTestFamilyDialog.tsx**
- **Purpose**: Test family creation configuration
- **Features**: Family count selection, naming patterns

**FamilyNameSuggestions.tsx**
- **Purpose**: AI-powered family name suggestions
- **Features**: Name generation, customization options

#### **Content Management**

**ContentItemDialog.tsx**
- **Purpose**: Content moderation and approval interface
- **Features**: Content preview, approval workflow, metadata editing

#### **System Monitoring**

**AdminDebugPanel.tsx**
- **Purpose**: Development and debugging information
- **Features**: State inspection, API testing, log viewing

**SystemHealthLogs.tsx**
- **Purpose**: System performance monitoring
- **Features**: Real-time metrics, performance graphs

**ApplicationLogs.tsx**
- **Purpose**: Application error and event logging
- **Features**: Error tracking, log filtering, resolution tracking

**UserActivityLogs.tsx**
- **Purpose**: User activity monitoring and audit trails
- **Features**: Activity filtering, user behavior analysis

#### **Security & Bootstrap**

**AdminBootstrap.tsx**
- **Purpose**: Initial admin account creation
- **Features**: First-time setup, admin user creation

**AdminBootstrapRoute.tsx**
- **Purpose**: Route protection for bootstrap functionality
- **Security**: Prevents unauthorized access to bootstrap

**AdminRoute.tsx**
- **Purpose**: Admin route protection middleware
- **Security**: Role verification, redirect handling

**AdminErrorBoundary.tsx**
- **Purpose**: Admin-specific error handling
- **Features**: Enhanced error reporting, admin context

**PasswordReset.tsx**
- **Purpose**: Self-service password reset for admins
- **Features**: Email-based reset, security questions

### Chore Management (`src/components/chores/`)

#### **ChoreManagementDashboard.tsx**
- **Purpose**: Parent interface for chore management
- **Features**: Chore creation, assignment, progress tracking
- **Components**: Chore forms, assignment tracking, analytics

#### **ChildrenChoresDashboard.tsx**
- **Purpose**: Child interface for viewing and completing tasks
- **Features**: Task list, completion interface, progress visualization
- **Gamification**: Points display, streak tracking, achievements

### Games & Content (`src/components/games/`)

#### **CategoryFilter.tsx**
- **Purpose**: Content category filtering interface
- **Features**: Category selection, age-based filtering
- **Props**: Categories, selected filters, filter handlers

#### **ContentCard.tsx**
- **Purpose**: Individual content item display
- **Features**: Content preview, interaction buttons, favorites
- **Props**: Content item data, interaction handlers

### Analytics & Reports (`src/components/analytics/`)

#### **AnalyticsKPICard.tsx**
- **Purpose**: Key performance indicator display cards
- **Features**: Metric visualization, trend indicators
- **Props**: Metric data, formatting options

#### **EngagementChart.tsx**
- **Purpose**: User engagement visualization
- **Features**: Time-series charts, engagement metrics
- **Dependencies**: Chart.js or similar charting library

#### **RetentionChart.tsx**
- **Purpose**: User retention analysis visualization
- **Features**: Cohort analysis, retention curves
- **Data**: User retention metrics by time periods

#### **SystemHealthWidget.tsx**
- **Purpose**: Real-time system status display
- **Features**: Service status, performance indicators
- **Updates**: Real-time data via WebSocket or polling

### Reports (`src/components/reports/`)

#### **FamilyActivityReport.tsx**
- **Purpose**: Family-specific activity reporting
- **Features**: Activity summaries, member contributions
- **Time Ranges**: Daily, weekly, monthly reporting

#### **ActivityLogsTable.tsx**
- **Purpose**: Tabular display of activity logs
- **Features**: Sorting, filtering, pagination
- **Data**: User and family activity records

### Common Components (`src/components/`)

#### **Hero.tsx**
- **Purpose**: Landing page hero section
- **Features**: Brand messaging, call-to-action buttons

#### **PortalSelection.tsx**
- **Purpose**: Role-based portal selection interface
- **Features**: Portal cards, role descriptions, navigation

#### **ErrorBoundary.tsx**
- **Purpose**: Global error handling wrapper
- **Features**: Error capture, fallback UI, error reporting

---

## 🎨 UI Components (`src/components/ui/`)

### Layout Components

#### **sidebar.tsx**
- **Components**: `Sidebar`, `SidebarContent`, `SidebarGroup`, `SidebarMenu`, etc.
- **Purpose**: Navigation sidebar with collapsible functionality
- **Features**: Mini-collapse, group management, responsive design

#### **card.tsx**
- **Components**: `Card`, `CardHeader`, `CardContent`, `CardFooter`
- **Purpose**: Content containers with consistent styling

#### **sheet.tsx**
- **Components**: `Sheet`, `SheetContent`, `SheetHeader`, `SheetFooter`
- **Purpose**: Slide-out panels for mobile-friendly interfaces

### Form Components

#### **form.tsx**
- **Components**: `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`
- **Purpose**: React Hook Form integration with validation
- **Dependencies**: `react-hook-form`, `@hookform/resolvers`

#### **input.tsx**
- **Component**: `Input`
- **Purpose**: Text input with consistent styling
- **Variants**: Standard, error states, disabled

#### **textarea.tsx**
- **Component**: `Textarea` 
- **Purpose**: Multi-line text input
- **Features**: Auto-resize, character limits

#### **select.tsx**
- **Components**: `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`
- **Purpose**: Dropdown selection with search functionality

#### **checkbox.tsx**
- **Component**: `Checkbox`
- **Purpose**: Boolean selection with custom styling

#### **radio-group.tsx**
- **Components**: `RadioGroup`, `RadioGroupItem`
- **Purpose**: Single selection from multiple options

#### **calendar.tsx**
- **Component**: `Calendar`
- **Purpose**: Date selection with month/year navigation
- **Features**: Date ranges, disabled dates, custom formatting

### Interactive Components

#### **button.tsx**
- **Component**: `Button`
- **Variants**: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- **Sizes**: `default`, `sm`, `lg`, `icon`
- **Features**: Loading states, disabled states, icon support

#### **dialog.tsx**
- **Components**: `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter`
- **Purpose**: Modal dialogs with overlay and focus management
- **Features**: Close on escape, click outside, accessibility

#### **dropdown-menu.tsx**
- **Components**: `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`
- **Purpose**: Contextual menus with keyboard navigation

#### **popover.tsx**
- **Components**: `Popover`, `PopoverContent`, `PopoverTrigger`
- **Purpose**: Floating content with positioning

#### **tooltip.tsx**
- **Components**: `Tooltip`, `TooltipContent`, `TooltipTrigger`
- **Purpose**: Hover information with delay and positioning

### Display Components

#### **table.tsx**
- **Components**: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`
- **Purpose**: Data tables with sorting and responsive design

#### **badge.tsx**
- **Component**: `Badge`
- **Variants**: `default`, `secondary`, `destructive`, `outline`
- **Purpose**: Status indicators and labels

#### **avatar.tsx**
- **Components**: `Avatar`, `AvatarImage`, `AvatarFallback`
- **Purpose**: User profile images with fallback text

#### **progress.tsx**
- **Component**: `Progress`
- **Purpose**: Progress bars with percentage display

#### **skeleton.tsx**
- **Component**: `Skeleton`
- **Purpose**: Loading placeholders with animation

### Navigation Components

#### **breadcrumb.tsx**
- **Components**: `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`
- **Purpose**: Navigation breadcrumbs with separators

#### **navigation-menu.tsx**
- **Components**: `NavigationMenu`, `NavigationMenuItem`, `NavigationMenuContent`
- **Purpose**: Complex navigation with dropdown support

#### **pagination.tsx**
- **Components**: `Pagination`, `PaginationContent`, `PaginationItem`
- **Purpose**: Page navigation with numbers and controls

### Feedback Components

#### **toast.tsx** & **sonner.tsx**
- **Components**: `Toast`, `ToastAction`, `Toaster`
- **Purpose**: Notification system with actions and auto-dismiss
- **Integration**: Sonner library for enhanced toast functionality

#### **alert.tsx**
- **Components**: `Alert`, `AlertDescription`, `AlertTitle`
- **Variants**: `default`, `destructive`
- **Purpose**: Important messages and warnings

### Data Visualization

#### **chart.tsx**
- **Components**: `ChartContainer`, `ChartTooltip`, `ChartLegend`
- **Purpose**: Chart components with Recharts integration
- **Features**: Responsive charts, theme integration

#### **carousel.tsx**
- **Components**: `Carousel`, `CarouselContent`, `CarouselItem`
- **Purpose**: Image and content carousels with navigation

### Utility Components

#### **separator.tsx**
- **Component**: `Separator`
- **Purpose**: Visual content separation
- **Orientations**: Horizontal, vertical

#### **scroll-area.tsx**
- **Components**: `ScrollArea`, `ScrollBar`
- **Purpose**: Custom scrollbars with smooth scrolling

#### **resizable.tsx**
- **Components**: `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`
- **Purpose**: Resizable layouts and panels

#### **collapsible.tsx**
- **Components**: `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`
- **Purpose**: Expandable content sections

---

## 🎣 Custom Hooks (`src/hooks/`)

### Authentication Hooks

#### **useAuth.tsx**
- **Purpose**: General authentication state management
- **Returns**: `user`, `session`, `userRole`, `loading`, auth methods
- **Features**: Session persistence, role detection, auto-redirect

#### **useAdminAuth.tsx**
- **Purpose**: Admin-specific authentication with enhanced security
- **Returns**: Enhanced auth state with admin checks
- **Features**: Admin role verification, security logging

#### **useAuthLogging.ts**
- **Purpose**: Authentication event logging
- **Features**: Login/logout tracking, failure logging
- **Integration**: User activity logs

#### **useAuthNavigation.tsx**
- **Purpose**: Role-based navigation and routing
- **Features**: Automatic redirects, portal routing

### Data Management Hooks

#### **useChoreManagement.ts** & **useChoreManagement.tsx**
- **Purpose**: Chore and task data management
- **Features**: CRUD operations, assignment tracking, completion handling
- **State**: Chore lists, assignment status, loading states

#### **useGamification.ts** & **useGamification.tsx**
- **Purpose**: Points, levels, achievements system
- **Features**: Point calculations, level progression, achievement unlocking
- **Integration**: User progress tracking

#### **useAnalytics.tsx**
- **Purpose**: Analytics data fetching and caching
- **Features**: KPI calculations, trend analysis, report generation
- **Caching**: Intelligent data caching for performance

#### **useAnalyticsWithSession.tsx**
- **Purpose**: Session-aware analytics with user context
- **Features**: User-specific analytics, session tracking

### System Monitoring Hooks

#### **useErrorTracking.ts**
- **Purpose**: Error logging and tracking
- **Features**: Automatic error capture, error categorization
- **Integration**: System error logs

#### **useAutoErrorLogging.tsx**
- **Purpose**: Automatic error boundary integration
- **Features**: Silent error capture, error reporting

#### **usePerformanceMonitoring.ts**
- **Purpose**: Performance metrics collection
- **Features**: Timing data, resource usage, bottleneck detection

#### **useAdminDebug.tsx**
- **Purpose**: Admin debugging tools and information
- **Features**: State inspection, API testing, log access

### UI and Utility Hooks

#### **use-toast.ts**
- **Purpose**: Toast notification management
- **Features**: Success/error notifications, action handling
- **Integration**: Global notification system

#### **use-mobile.tsx**
- **Purpose**: Responsive design utilities
- **Features**: Mobile detection, breakpoint management

---

## 🗂️ State Management (`src/stores/`)

### **authStore.ts**
- **Purpose**: Centralized authentication state
- **State**: User, session, roles, loading states
- **Actions**: Sign in/out, role fetching, session management
- **Persistence**: Role and admin status persistence
- **Features**: Activity logging, error handling

### **adminStore.ts**
- **Purpose**: Admin-specific state management
- **State**: Admin data, system metrics, user management
- **Actions**: User CRUD, system monitoring, analytics

### **choreStore.ts**
- **Purpose**: Chore and task management state
- **State**: Chores, assignments, completions, templates
- **Actions**: Task management, progress tracking

### **gamificationStore.ts**
- **Purpose**: Gamification system state
- **State**: Points, levels, achievements, streaks
- **Actions**: Point calculations, level progression, achievement unlocking

### **analyticsStore.ts**
- **Purpose**: Analytics data caching and management
- **State**: Metrics, reports, charts data
- **Actions**: Data fetching, cache management, report generation

### **systemHealthStore.ts**
- **Purpose**: System monitoring and health data
- **State**: Performance metrics, error rates, system status
- **Actions**: Health checks, metric collection, alerting

### **uiStore.ts**
- **Purpose**: UI state and preferences
- **State**: Theme, layout preferences, dialog states
- **Actions**: Theme switching, layout management

---

## 🔗 Component Relationships

### **Admin User Management Flow**
```
AdminUsers.tsx
├── UserViewDialog.tsx
├── UserEditDialog.tsx
│   └── UserPasswordResetDialog.tsx ← 🆕
├── UserDeleteDialog.tsx
└── UserPasswordResetDialog.tsx ← 🆕
```

### **Authentication Flow**
```
App.tsx
├── Auth.tsx (Parents/Children)
│   └── useAuth()
│       └── authStore
└── AdminLogin.tsx (Admins)
    ├── useAdminAuth()
    │   └── authStore
    └── PasswordReset.tsx
        └── ResetPasswordConfirm.tsx
```

### **Chore Management Flow**
```
ParentChoreManagement.tsx
└── ChoreManagementDashboard.tsx
    ├── useChoreManagement()
    └── choreStore

ChildrenTasksDashboard.tsx
└── ChildrenChoresDashboard.tsx
    ├── useChoreManagement()
    ├── useGamification()
    └── gamificationStore
```

### **Analytics Flow**
```
AdminReports.tsx
├── AnalyticsKPICard.tsx
├── EngagementChart.tsx
├── RetentionChart.tsx
└── useAnalytics()
    └── analyticsStore

Reports.tsx (Family)
├── FamilyActivityReport.tsx
├── ActivityLogsTable.tsx
└── useAnalyticsWithSession()
```

---

## 📋 Props and Interfaces

### **Common Interface Patterns**

#### **Dialog Component Pattern**
```typescript
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
```

#### **User Entity Interface**
```typescript
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  roles: string[];
  families: { family_code: string; display_name: string }[];
}
```

#### **Component Props with User**
```typescript
interface UserComponentProps extends DialogProps {
  user: User | null;
}
```

### **New Password Reset Interface**
```typescript
interface UserPasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  } | null;
  onSuccess?: () => void;
}

interface PasswordResetFormData {
  password: string;
  confirmPassword: string;
  forcePasswordChange: boolean;
}
```

### **Chore Management Interfaces**
```typescript
interface Chore {
  id: string;
  family_id: string;
  title: string;
  description?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  base_points: number;
  estimated_duration: number;
  created_at: string;
}

interface ChoreAssignment {
  id: string;
  chore_id: string;
  assigned_to: string;
  assigned_by: string;
  due_date?: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'verified';
  points_earned: number;
}
```

### **Analytics Interfaces**
```typescript
interface KPIData {
  label: string;
  value: number;
  change?: number;
  trend: 'up' | 'down' | 'stable';
}

interface ChartData {
  date: string;
  value: number;
  [key: string]: any;
}
```

---

## 🚀 Recent Additions & Updates

### **New Password Reset System** 🆕
- **UserPasswordResetDialog.tsx**: Complete password reset interface
- **admin-update-user Edge Function**: Secure backend password updates
- **Integration**: Added to AdminUsers table and UserEditDialog
- **Security**: Admin role verification, activity logging, secure password generation

### **Enhanced User Management**
- **Improved UserEditDialog**: Added password reset section
- **Better Error Handling**: Comprehensive error states and user feedback
- **Activity Logging**: All admin actions now logged for audit trails

### **State Management Migration**
- **Zustand Integration**: All stores now use Zustand for state management
- **Bridge Adapters**: Maintained compatibility with existing hook interfaces
- **Performance**: Improved state updates and reduced re-renders

---

*This documentation is maintained alongside the codebase and should be updated when components are added, modified, or removed.*

**Last Updated**: 2025-08-29