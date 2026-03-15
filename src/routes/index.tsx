/**
 * Route Configuration
 * 
 * @description Centralized route definitions for the application.
 * Routes are organized by category and use lazy loading for performance.
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AdminRoute } from '@/components/admin/AdminRoute';
import AdminLayout from '@/pages/admin/AdminLayout';

// Eagerly loaded pages (critical path only)
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import NotFound from '@/pages/NotFound';
import { AdminBootstrapRoute } from '@/components/admin/AdminBootstrapRoute';
import GamesCatalogLazy from '@/pages/GamesCatalogLazy';

// Lazy loaded pages - Non-critical (reduces initial bundle)
const AboutLazy = React.lazy(() => import('@/pages/About'));
const AdminLoginLazy = React.lazy(() => import('@/pages/admin/AdminLogin'));
const PasswordResetLazy = React.lazy(() => import('@/components/admin/PasswordReset'));
const ResetPasswordConfirmLazy = React.lazy(() => import('@/pages/admin/ResetPasswordConfirm'));
const AdminDebugPanelLazy = React.lazy(() => 
  import('@/components/admin/AdminDebugPanel').then(m => ({ default: m.AdminDebugPanel }))
);
const AdminBootstrapLazy = React.lazy(() => 
  import('@/components/admin/AdminBootstrap').then(m => ({ default: m.AdminBootstrap }))
);

// Lazy loaded pages - Admin
const AdminDashboardLazy = React.lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminFamiliesLazy = React.lazy(() => import('@/pages/admin/AdminFamilies'));
const AdminUsersLazy = React.lazy(() => import('@/pages/admin/AdminUsers'));
const AdminReportsLazy = React.lazy(() => import('@/pages/admin/AdminReports'));
const AdminContentLazy = React.lazy(() => import('@/pages/admin/AdminContent'));
const AdminSystemMonitoringLazy = React.lazy(() => import('@/pages/admin/AdminSystemMonitoring'));
const AdminLLMMonitoringLazy = React.lazy(() => import('@/pages/admin/AdminLLMMonitoring'));
const AdminUptimeReportLazy = React.lazy(() => import('@/pages/admin/UptimeReport'));
const AdminSecurityCenterLazy = React.lazy(() => 
  import('@/pages/admin/AdminSecurityCenter').then(m => ({ default: m.AdminSecurityCenter }))
);
const AdminAutoRepairLogsLazy = React.lazy(() => import('@/pages/admin/AdminAutoRepairLogs'));
const AdminIntegrityManagementLazy = React.lazy(() => import('@/pages/admin/AdminIntegrityManagement'));
const AdminDataHealthLazy = React.lazy(() => import('@/pages/admin/AdminDataHealth'));
const AdminArchitectureEbookLazy = React.lazy(() => import('@/pages/admin/AdminArchitectureEbook'));
const AdminLogsTriageLazy = React.lazy(() => import('@/pages/admin/AdminLogsTriage'));

// Lazy loaded pages - Parent
const ParentDashboardLazy = React.lazy(() => import('@/pages/ParentDashboard'));
const ParentChoreManagementLazy = React.lazy(() => import('@/pages/parent/ParentChoreManagement'));
const ParentConnectionManagementLazy = React.lazy(() => import('@/pages/parent/ParentConnectionManagement'));
const ParentSettingsLazy = React.lazy(() => import('@/pages/parent/ParentSettings'));
const ParentReportsLazy = React.lazy(() => import('@/pages/parent/ParentReports'));

// Lazy loaded pages - Children
const KidsPortalLazy = React.lazy(() => import('@/pages/kids/KidsPortal'));
const ReportsLazy = React.lazy(() => import('@/pages/Reports'));

// Lazy loaded pages - Features
const EducationalGamesLazy = React.lazy(() => import('@/pages/features/EducationalGames'));
const CommunicationSupportLazy = React.lazy(() => import('@/pages/features/CommunicationSupport'));
const ProgressTrackingLazy = React.lazy(() => import('@/pages/features/ProgressTracking'));
const FamilyManagementLazy = React.lazy(() => import('@/pages/features/FamilyManagement'));
const AssessmentLazy = React.lazy(() => import('@/pages/Assessment'));

// Lazy loaded pages - Support
const HelpCenterLazy = React.lazy(() => import('@/pages/support/HelpCenter'));
const ContactUsLazy = React.lazy(() => import('@/pages/support/ContactUs'));
const PrivacyPolicyLazy = React.lazy(() => import('@/pages/support/PrivacyPolicy'));
const TermsOfServiceLazy = React.lazy(() => import('@/pages/support/TermsOfService'));

// Lazy loaded pages - Connect
const CommunityForumLazy = React.lazy(() => import('@/pages/connect/CommunityForum'));
const ParentResourcesLazy = React.lazy(() => import('@/pages/connect/ParentResources'));
const TherapistToolsLazy = React.lazy(() => import('@/pages/connect/TherapistTools'));
const ResearchStudiesLazy = React.lazy(() => import('@/pages/connect/ResearchStudies'));

// Lazy loaded pages - Demos & Games
const AACDemoLazy = React.lazy(() => import('@/pages/AACDemo'));
const SubtractionGameDemoLazy = React.lazy(() => import('@/pages/SubtractionGameDemo'));
const MemoryMatchGameLazy = React.lazy(() => import('@/components/games/MemoryMatchGame'));
const PatternMatchGameLazy = React.lazy(() => import('@/components/games/PatternMatchGame'));
const SoundsMatchGameLazy = React.lazy(() => import('@/components/games/SoundsMatchGame'));

// Suspense wrapper for lazy routes
interface LazyRouteProps {
  children: React.ReactNode;
  variant?: 'dashboard' | 'table' | 'form' | 'game' | 'default';
}

export const LazyRoute: React.FC<LazyRouteProps> = ({ children, variant = 'default' }) => (
  <React.Suspense fallback={<PageSkeleton variant={variant} />}>
    {children}
  </React.Suspense>
);

// Route configuration types
interface RouteConfig {
  path: string;
  element: React.ReactNode;
  children?: RouteConfig[];
}

// Core routes
export const coreRoutes: RouteConfig[] = [
  { path: '/', element: <Index /> },
  { path: '/auth', element: <Auth /> },
  { path: '/about', element: <LazyRoute><AboutLazy /></LazyRoute> },
  { path: '/parent-dashboard', element: <Navigate to="/parent" replace /> },
  { path: '/parent/dashboard', element: <Navigate to="/parent" replace /> },
];

// Parent routes
export const parentRoutes: RouteConfig[] = [
  { path: '/parent', element: <LazyRoute variant="dashboard"><ParentDashboardLazy /></LazyRoute> },
  { path: '/parent/chores', element: <LazyRoute variant="table"><ParentChoreManagementLazy /></LazyRoute> },
  { path: '/parent/connections', element: <LazyRoute variant="table"><ParentConnectionManagementLazy /></LazyRoute> },
  { path: '/parent/reports', element: <LazyRoute variant="dashboard"><ParentReportsLazy /></LazyRoute> },
  { path: '/parent/settings', element: <LazyRoute variant="form"><ParentSettingsLazy /></LazyRoute> },
];

// Kids routes
export const kidsRoutes: RouteConfig[] = [
  { path: '/kids', element: <LazyRoute variant="game"><KidsPortalLazy /></LazyRoute> },
  { path: '/children/tasks', element: <Navigate to="/kids" replace /> },
  { path: '/reports', element: <LazyRoute variant="dashboard"><ReportsLazy /></LazyRoute> },
  { path: '/games', element: <GamesCatalogLazy /> },
];

// Feature routes
export const featureRoutes: RouteConfig[] = [
  { path: '/features/educational-games', element: <LazyRoute><EducationalGamesLazy /></LazyRoute> },
  { path: '/features/communication-support', element: <LazyRoute><CommunicationSupportLazy /></LazyRoute> },
  { path: '/features/progress-tracking', element: <LazyRoute><ProgressTrackingLazy /></LazyRoute> },
  { path: '/features/family-management', element: <LazyRoute><FamilyManagementLazy /></LazyRoute> },
  { path: '/assessment', element: <LazyRoute variant="form"><AssessmentLazy /></LazyRoute> },
];

// Support routes
export const supportRoutes: RouteConfig[] = [
  { path: '/support/help-center', element: <LazyRoute><HelpCenterLazy /></LazyRoute> },
  { path: '/support/contact', element: <LazyRoute><ContactUsLazy /></LazyRoute> },
  { path: '/support/privacy-policy', element: <LazyRoute><PrivacyPolicyLazy /></LazyRoute> },
  { path: '/support/terms', element: <LazyRoute><TermsOfServiceLazy /></LazyRoute> },
];

// Connect routes
export const connectRoutes: RouteConfig[] = [
  { path: '/connect/community-forum', element: <LazyRoute><CommunityForumLazy /></LazyRoute> },
  { path: '/connect/parent-resources', element: <LazyRoute><ParentResourcesLazy /></LazyRoute> },
  { path: '/connect/therapist-tools', element: <LazyRoute><TherapistToolsLazy /></LazyRoute> },
  { path: '/connect/research-studies', element: <LazyRoute><ResearchStudiesLazy /></LazyRoute> },
];

// Demo and game routes
export const gameRoutes: RouteConfig[] = [
  { path: '/aac-demo', element: <LazyRoute variant="game"><AACDemoLazy /></LazyRoute> },
  { path: '/games/subtraction-demo', element: <LazyRoute variant="game"><SubtractionGameDemoLazy /></LazyRoute> },
  { path: '/games/memory-match', element: <LazyRoute variant="game"><MemoryMatchGameLazy onClose={() => window.history.back()} /></LazyRoute> },
  { path: '/games/pattern-match', element: <LazyRoute variant="game"><PatternMatchGameLazy onClose={() => window.history.back()} /></LazyRoute> },
  { path: '/games/sounds-match', element: <LazyRoute variant="game"><SoundsMatchGameLazy onClose={() => window.history.back()} /></LazyRoute> },
];

// Admin auth routes (not protected, lazy-loaded for bundle optimization)
export const adminAuthRoutes: RouteConfig[] = [
  { 
    path: '/admin/login', 
    element: (
      <ErrorBoundary componentName="AdminLogin">
        <LazyRoute><AdminLoginLazy /></LazyRoute>
      </ErrorBoundary>
    )
  },
  { 
    path: '/admin/reset-password', 
    element: (
      <ErrorBoundary componentName="PasswordReset">
        <LazyRoute><PasswordResetLazy /></LazyRoute>
      </ErrorBoundary>
    )
  },
  { 
    path: '/admin/reset-password-confirm', 
    element: (
      <ErrorBoundary componentName="ResetPasswordConfirm">
        <LazyRoute><ResetPasswordConfirmLazy /></LazyRoute>
      </ErrorBoundary>
    )
  },
  { 
    path: '/admin/debug', 
    element: (
      <ErrorBoundary componentName="AdminDebug">
        <AdminRoute>
          <LazyRoute><AdminDebugPanelLazy /></LazyRoute>
        </AdminRoute>
      </ErrorBoundary>
    )
  },
  { 
    path: '/admin/bootstrap', 
    element: (
      <ErrorBoundary componentName="AdminBootstrap">
        <AdminBootstrapRoute>
          <LazyRoute><AdminBootstrapLazy /></LazyRoute>
        </AdminBootstrapRoute>
      </ErrorBoundary>
    )
  },
];

// Admin protected child routes (nested under /admin)
export const adminChildRoutes: RouteConfig[] = [
  { path: '', element: <Navigate to="dashboard" replace /> },
  { 
    path: 'dashboard', 
    element: (
      <ErrorBoundary componentName="AdminDashboard">
        <LazyRoute variant="dashboard"><AdminDashboardLazy /></LazyRoute>
      </ErrorBoundary>
    )
  },
  { 
    path: 'security-center', 
    element: (
      <ErrorBoundary componentName="AdminSecurityCenter">
        <LazyRoute variant="dashboard"><AdminSecurityCenterLazy /></LazyRoute>
      </ErrorBoundary>
    )
  },
  { 
    path: 'families', 
    element: (
      <ErrorBoundary componentName="AdminFamilies">
        <LazyRoute variant="table"><AdminFamiliesLazy /></LazyRoute>
      </ErrorBoundary>
    )
  },
  { 
    path: 'users', 
    element: (
      <ErrorBoundary componentName="AdminUsers">
        <LazyRoute variant="table"><AdminUsersLazy /></LazyRoute>
      </ErrorBoundary>
    )
  },
  { 
    path: 'reports', 
    element: (
      <ErrorBoundary componentName="AdminReports">
        <LazyRoute variant="dashboard"><AdminReportsLazy /></LazyRoute>
      </ErrorBoundary>
    )
  },
  { 
    path: 'content', 
    element: (
      <ErrorBoundary componentName="AdminContent">
        <LazyRoute variant="table"><AdminContentLazy /></LazyRoute>
      </ErrorBoundary>
    )
  },
  { 
    path: 'system-monitoring', 
    element: (
      <ErrorBoundary componentName="AdminSystemMonitoring">
        <LazyRoute variant="dashboard"><AdminSystemMonitoringLazy /></LazyRoute>
      </ErrorBoundary>
    )
  },
  { 
    path: 'llm-monitoring', 
    element: (
      <ErrorBoundary componentName="AdminLLMMonitoring">
        <LazyRoute variant="dashboard"><AdminLLMMonitoringLazy /></LazyRoute>
      </ErrorBoundary>
    )
  },
  { 
    path: 'uptime-report', 
    element: (
      <ErrorBoundary componentName="AdminUptimeReport">
        <LazyRoute variant="dashboard"><AdminUptimeReportLazy /></LazyRoute>
      </ErrorBoundary>
    )
  },
  { 
    path: 'auto-repair-logs', 
    element: (
      <ErrorBoundary componentName="AdminAutoRepairLogs">
        <LazyRoute variant="dashboard"><AdminAutoRepairLogsLazy /></LazyRoute>
      </ErrorBoundary>
    )
  },
  { 
    path: 'integrity', 
    element: (
      <ErrorBoundary componentName="AdminIntegrityManagement">
        <LazyRoute variant="dashboard"><AdminIntegrityManagementLazy /></LazyRoute>
      </ErrorBoundary>
    )
  },
  { 
    path: 'data-health', 
    element: (
      <ErrorBoundary componentName="AdminDataHealth">
        <LazyRoute variant="dashboard"><AdminDataHealthLazy /></LazyRoute>
      </ErrorBoundary>
    )
  },
  { 
    path: 'architecture-ebook', 
    element: (
      <ErrorBoundary componentName="AdminArchitectureEbook">
        <LazyRoute variant="dashboard"><AdminArchitectureEbookLazy /></LazyRoute>
      </ErrorBoundary>
    )
  },
];

// Create the protected admin layout route
export const getAdminLayoutRoute = (): RouteConfig => ({
  path: '/admin',
  element: (
    <ErrorBoundary componentName="AdminRoute">
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    </ErrorBoundary>
  ),
  children: adminChildRoutes,
});

// Not found route
export const notFoundRoute: RouteConfig = {
  path: '*',
  element: <NotFound />,
};

// Export all routes as a flat array for simple iteration
export const getAllRoutes = (): RouteConfig[] => [
  ...coreRoutes,
  ...parentRoutes,
  ...kidsRoutes,
  ...featureRoutes,
  ...supportRoutes,
  ...connectRoutes,
  ...gameRoutes,
  ...adminAuthRoutes,
  getAdminLayoutRoute(),
  notFoundRoute,
];
