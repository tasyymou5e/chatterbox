import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
// QueryClient is provided by main.tsx - no duplicate needed here
import { Routes, Route, Navigate } from "react-router-dom";
import React, { useEffect, Suspense } from "react";
// Context providers removed - using Zustand stores now
import { AdminRoute } from "@/components/admin/AdminRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAutoErrorLogging } from "@/hooks/useAutoErrorLogging";
import { SecurityMonitoringProvider } from '@/components/security/SecurityMonitoringService';
import { ProductionSecurityWrapper } from '@/components/security/ProductionSecurityWrapper';
// Performance monitoring re-enabled
import { usePerformanceMonitoringSafe } from "@/hooks/usePerformanceMonitoringSafe";
import { PageSkeleton } from "@/components/skeletons/PageSkeleton";

// Eagerly loaded pages (core routes - small and critical)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

// Admin auth pages (eagerly loaded - needed for login flow)
import AdminLogin from "./pages/admin/AdminLogin";
import PasswordReset from "./components/admin/PasswordReset";
import ResetPasswordConfirm from "./pages/admin/ResetPasswordConfirm";
import AdminLayout from "./pages/admin/AdminLayout";
import { AdminDebugPanel } from "@/components/admin/AdminDebugPanel";
import { AdminBootstrap } from "@/components/admin/AdminBootstrap";
import { AdminBootstrapRoute } from "@/components/admin/AdminBootstrapRoute";

// Lazy loaded pages - Admin routes
const AdminDashboardLazy = React.lazy(() => import("./pages/admin/AdminDashboard"));
const AdminFamiliesLazy = React.lazy(() => import("./pages/admin/AdminFamilies"));
const AdminUsersLazy = React.lazy(() => import("./pages/admin/AdminUsers"));
const AdminReportsLazy = React.lazy(() => import("./pages/admin/AdminReports"));
const AdminContentLazy = React.lazy(() => import("./pages/admin/AdminContent"));
const AdminSystemMonitoringLazy = React.lazy(() => import("./pages/admin/AdminSystemMonitoring"));
const AdminLLMMonitoringLazy = React.lazy(() => import("./pages/admin/AdminLLMMonitoring"));
const AdminSecurityCenterLazy = React.lazy(() => 
  import("./pages/admin/AdminSecurityCenter").then(m => ({ default: m.AdminSecurityCenter }))
);

// Lazy loaded pages - Parent routes
const ParentDashboardLazy = React.lazy(() => import("./pages/ParentDashboard"));
const ParentChoreManagementLazy = React.lazy(() => import("./pages/parent/ParentChoreManagement"));
const ParentConnectionManagementLazy = React.lazy(() => import("./pages/parent/ParentConnectionManagement"));
const ParentSettingsLazy = React.lazy(() => import("./pages/parent/ParentSettings"));
const ParentReportsLazy = React.lazy(() => import("./pages/parent/ParentReports"));

// Lazy loaded pages - Children routes
const ChildrenTasksDashboardLazy = React.lazy(() => import("./pages/children/ChildrenTasksDashboard"));

// Lazy loaded pages - Reports
const ReportsLazy = React.lazy(() => import("./pages/Reports"));

// Lazy loaded pages - Games (already has GamesCatalogLazy)
import GamesCatalogLazy from "./pages/GamesCatalogLazy";

// Lazy loaded pages - Features (single chunk)
const EducationalGamesLazy = React.lazy(() => import("./pages/features/EducationalGames"));
const CommunicationSupportLazy = React.lazy(() => import("./pages/features/CommunicationSupport"));
const ProgressTrackingLazy = React.lazy(() => import("./pages/features/ProgressTracking"));
const FamilyManagementLazy = React.lazy(() => import("./pages/features/FamilyManagement"));

// Lazy loaded pages - Support (single chunk)
const HelpCenterLazy = React.lazy(() => import("./pages/support/HelpCenter"));
const ContactUsLazy = React.lazy(() => import("./pages/support/ContactUs"));
const PrivacyPolicyLazy = React.lazy(() => import("./pages/support/PrivacyPolicy"));
const TermsOfServiceLazy = React.lazy(() => import("./pages/support/TermsOfService"));

// Lazy loaded pages - Connect (single chunk)
const CommunityForumLazy = React.lazy(() => import("./pages/connect/CommunityForum"));
const ParentResourcesLazy = React.lazy(() => import("./pages/connect/ParentResources"));
const TherapistToolsLazy = React.lazy(() => import("./pages/connect/TherapistTools"));
const ResearchStudiesLazy = React.lazy(() => import("./pages/connect/ResearchStudies"));

// Lazy loaded pages - Demos
const AACDemoLazy = React.lazy(() => import("./pages/AACDemo"));
const SubtractionGameDemoLazy = React.lazy(() => import("./pages/SubtractionGameDemo"));

// QueryClient is created and provided in main.tsx to avoid duplication

// Wrapper component for lazy-loaded routes with consistent fallback
const LazyRoute: React.FC<{ children: React.ReactNode; variant?: 'dashboard' | 'table' | 'form' | 'game' | 'default' }> = ({ 
  children, 
  variant = 'default' 
}) => (
  <Suspense fallback={<PageSkeleton variant={variant} />}>
    {children}
  </Suspense>
);

const App = () => {
  // Enable automatic error logging
  useAutoErrorLogging();
  
  // Performance monitoring hooks
  const { measurePageLoad, measureMemoryUsage } = usePerformanceMonitoringSafe();
  
  // Feature flag for performance monitoring
  const ENABLE_PERFORMANCE_MONITORING = true;
  
  useEffect(() => {
    if (!ENABLE_PERFORMANCE_MONITORING) {
      return;
    }
    
    // Measure page load after initial render
    const timer = setTimeout(() => {
      measurePageLoad();
      measureMemoryUsage();
    }, 1000);
    
    // Set up periodic memory monitoring (every minute)
    const memoryInterval = setInterval(() => {
      measureMemoryUsage();
    }, 60000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(memoryInterval);
    };
  }, [ENABLE_PERFORMANCE_MONITORING, measurePageLoad, measureMemoryUsage]);

  return (
    <TooltipProvider>
      <ProductionSecurityWrapper>
        <SecurityMonitoringProvider>
          <ErrorBoundary componentName="App">
            <Toaster />
            <Sonner />
              <Routes>
                {/* Core routes - eagerly loaded */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/about" element={<About />} />
                <Route path="/parent-dashboard" element={<Navigate to="/parent" replace />} />
                
                {/* Parent routes - lazy loaded */}
                <Route path="/parent" element={
                  <LazyRoute variant="dashboard">
                    <ParentDashboardLazy />
                  </LazyRoute>
                } />
                <Route path="/parent/chores" element={
                  <LazyRoute variant="table">
                    <ParentChoreManagementLazy />
                  </LazyRoute>
                } />
                <Route path="/parent/connections" element={
                  <LazyRoute variant="table">
                    <ParentConnectionManagementLazy />
                  </LazyRoute>
                } />
                <Route path="/parent/reports" element={
                  <LazyRoute variant="dashboard">
                    <ParentReportsLazy />
                  </LazyRoute>
                } />
                <Route path="/parent/settings" element={
                  <LazyRoute variant="form">
                    <ParentSettingsLazy />
                  </LazyRoute>
                } />
                
                {/* Children routes - lazy loaded */}
                <Route path="/children/tasks" element={
                  <LazyRoute variant="dashboard">
                    <ChildrenTasksDashboardLazy />
                  </LazyRoute>
                } />
                
                {/* Reports - lazy loaded */}
                <Route path="/reports" element={
                  <LazyRoute variant="dashboard">
                    <ReportsLazy />
                  </LazyRoute>
                } />
                
                {/* Games - already lazy loaded */}
                <Route path="/games" element={<GamesCatalogLazy />} />
                
                {/* Features Routes - lazy loaded */}
                <Route path="/features/educational-games" element={
                  <LazyRoute><EducationalGamesLazy /></LazyRoute>
                } />
                <Route path="/features/communication-support" element={
                  <LazyRoute><CommunicationSupportLazy /></LazyRoute>
                } />
                <Route path="/features/progress-tracking" element={
                  <LazyRoute><ProgressTrackingLazy /></LazyRoute>
                } />
                <Route path="/features/family-management" element={
                  <LazyRoute><FamilyManagementLazy /></LazyRoute>
                } />
                
                {/* Support Routes - lazy loaded */}
                <Route path="/support/help-center" element={
                  <LazyRoute><HelpCenterLazy /></LazyRoute>
                } />
                <Route path="/support/contact" element={
                  <LazyRoute><ContactUsLazy /></LazyRoute>
                } />
                <Route path="/support/privacy-policy" element={
                  <LazyRoute><PrivacyPolicyLazy /></LazyRoute>
                } />
                <Route path="/support/terms" element={
                  <LazyRoute><TermsOfServiceLazy /></LazyRoute>
                } />
                
                {/* Connect Routes - lazy loaded */}
                <Route path="/connect/community-forum" element={
                  <LazyRoute><CommunityForumLazy /></LazyRoute>
                } />
                <Route path="/connect/parent-resources" element={
                  <LazyRoute><ParentResourcesLazy /></LazyRoute>
                } />
                <Route path="/connect/therapist-tools" element={
                  <LazyRoute><TherapistToolsLazy /></LazyRoute>
                } />
                <Route path="/connect/research-studies" element={
                  <LazyRoute><ResearchStudiesLazy /></LazyRoute>
                } />
                
                {/* Demo Routes - lazy loaded */}
                <Route path="/aac-demo" element={
                  <LazyRoute variant="game"><AACDemoLazy /></LazyRoute>
                } />
                <Route path="/games/subtraction-demo" element={
                  <LazyRoute variant="game"><SubtractionGameDemoLazy /></LazyRoute>
                } />
                
                {/* Admin Routes - auth pages eagerly loaded */}
                <Route path="/admin/login" element={
                  <ErrorBoundary componentName="AdminLogin">
                    <AdminLogin />
                  </ErrorBoundary>
                } />
                <Route path="/admin/reset-password" element={
                  <ErrorBoundary componentName="PasswordReset">
                    <PasswordReset />
                  </ErrorBoundary>
                } />
                <Route path="/admin/reset-password-confirm" element={
                  <ErrorBoundary componentName="ResetPasswordConfirm">
                    <ResetPasswordConfirm />
                  </ErrorBoundary>
                } />
                <Route path="/admin/debug" element={
                  <ErrorBoundary componentName="AdminDebug">
                    <AdminRoute>
                      <AdminDebugPanel />
                    </AdminRoute>
                  </ErrorBoundary>
                } />
                <Route path="/admin/bootstrap" element={
                  <ErrorBoundary componentName="AdminBootstrap">
                    <AdminBootstrapRoute>
                      <AdminBootstrap />
                    </AdminBootstrapRoute>
                  </ErrorBoundary>
                } />
                
                {/* Protected Admin Routes - lazy loaded */}
                <Route path="/admin" element={
                  <ErrorBoundary componentName="AdminRoute">
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  </ErrorBoundary>
                }>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={
                    <ErrorBoundary componentName="AdminDashboard">
                      <LazyRoute variant="dashboard">
                        <AdminDashboardLazy />
                      </LazyRoute>
                    </ErrorBoundary>
                  } />
                  <Route path="security-center" element={
                    <ErrorBoundary componentName="AdminSecurityCenter">
                      <LazyRoute variant="dashboard">
                        <AdminSecurityCenterLazy />
                      </LazyRoute>
                    </ErrorBoundary>
                  } />
                  <Route path="families" element={
                    <ErrorBoundary componentName="AdminFamilies">
                      <LazyRoute variant="table">
                        <AdminFamiliesLazy />
                      </LazyRoute>
                    </ErrorBoundary>
                  } />
                  <Route path="users" element={
                    <ErrorBoundary componentName="AdminUsers">
                      <LazyRoute variant="table">
                        <AdminUsersLazy />
                      </LazyRoute>
                    </ErrorBoundary>
                  } />
                  <Route path="reports" element={
                    <ErrorBoundary componentName="AdminReports">
                      <LazyRoute variant="dashboard">
                        <AdminReportsLazy />
                      </LazyRoute>
                    </ErrorBoundary>
                  } />
                  <Route path="content" element={
                    <ErrorBoundary componentName="AdminContent">
                      <LazyRoute variant="table">
                        <AdminContentLazy />
                      </LazyRoute>
                    </ErrorBoundary>
                  } />
                  <Route path="system-monitoring" element={
                    <ErrorBoundary componentName="AdminSystemMonitoring">
                      <LazyRoute variant="dashboard">
                        <AdminSystemMonitoringLazy />
                      </LazyRoute>
                    </ErrorBoundary>
                  } />
                  <Route path="llm-monitoring" element={
                    <ErrorBoundary componentName="AdminLLMMonitoring">
                      <LazyRoute variant="dashboard">
                        <AdminLLMMonitoringLazy />
                      </LazyRoute>
                    </ErrorBoundary>
                  } />
                </Route>
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
          </ErrorBoundary>
        </SecurityMonitoringProvider>
      </ProductionSecurityWrapper>
    </TooltipProvider>
  );
};

export default App;
