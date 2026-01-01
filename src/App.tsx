import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
// Context providers removed - using Zustand stores now
import { AdminRoute } from "@/components/admin/AdminRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAutoErrorLogging } from "@/hooks/useAutoErrorLogging";
import { SecurityMonitoringProvider } from '@/components/security/SecurityMonitoringService';
import { ProductionSecurityWrapper } from '@/components/security/ProductionSecurityWrapper';
// Performance monitoring temporarily disabled to fix cache issues
// import { usePerformanceMonitoringSafe } from "@/hooks/usePerformanceMonitoringSafe";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import About from "./pages/About";
import ParentDashboard from "./pages/ParentDashboard";
import ParentChoreManagement from "./pages/parent/ParentChoreManagement";
import ParentConnectionManagement from "./pages/parent/ParentConnectionManagement";
import ChildrenTasksDashboard from "./pages/children/ChildrenTasksDashboard";
import Reports from "./pages/Reports";
import GamesCatalogLazy from "./pages/GamesCatalogLazy";
import AdminLogin from "./pages/admin/AdminLogin";
import PasswordReset from "./components/admin/PasswordReset";
import ResetPasswordConfirm from "./pages/admin/ResetPasswordConfirm";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminFamilies from "./pages/admin/AdminFamilies";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminReports from "./pages/admin/AdminReports";
import AdminContent from "./pages/admin/AdminContent";
import AdminSystemMonitoring from "./pages/admin/AdminSystemMonitoring";
import AdminLLMMonitoring from "./pages/admin/AdminLLMMonitoring";
import { AdminSecurityCenter } from "./pages/admin/AdminSecurityCenter";
import { AdminDebugPanel } from "@/components/admin/AdminDebugPanel";
import { AdminBootstrap } from "@/components/admin/AdminBootstrap";
import { AdminBootstrapRoute } from "@/components/admin/AdminBootstrapRoute";
import EducationalGames from "./pages/features/EducationalGames";
import CommunicationSupport from "./pages/features/CommunicationSupport";
import ProgressTracking from "./pages/features/ProgressTracking";
import FamilyManagement from "./pages/features/FamilyManagement";
import HelpCenter from "./pages/support/HelpCenter";
import ContactUs from "./pages/support/ContactUs";
import PrivacyPolicy from "./pages/support/PrivacyPolicy";
import TermsOfService from "./pages/support/TermsOfService";
import CommunityForum from "./pages/connect/CommunityForum";
import ParentResources from "./pages/connect/ParentResources";
import TherapistTools from "./pages/connect/TherapistTools";
import ResearchStudies from "./pages/connect/ResearchStudies";
import AACDemo from "./pages/AACDemo";
import SubtractionGameDemo from "./pages/SubtractionGameDemo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});
// EMERGENCY DEPLOYMENT FIX - v3.1.0 - Critical fixes applied
// Simplified admin routing and enhanced error boundaries

const App = () => {
  // Enable automatic error logging
  useAutoErrorLogging();
  
  // Performance monitoring temporarily disabled to fix cache/hot-reload issues
  // TODO: Re-enable once browser cache is cleared and stable
  
  // Feature flag for performance monitoring (disabled for now)
  const ENABLE_PERFORMANCE_MONITORING = false;
  
  useEffect(() => {
    if (ENABLE_PERFORMANCE_MONITORING) {
      // Performance monitoring will be re-enabled here later
      console.log('Performance monitoring would be initialized here');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ProductionSecurityWrapper>
          <SecurityMonitoringProvider>
            <ErrorBoundary componentName="App">
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/about" element={<About />} />
                <Route path="/parent-dashboard" element={<ParentDashboard />} />
                <Route path="/parent" element={<ParentDashboard />} />
                <Route path="/parent/chores" element={<ParentChoreManagement />} />
                <Route path="/parent/connections" element={<ParentConnectionManagement />} />
                <Route path="/children/tasks" element={<ChildrenTasksDashboard />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/games" element={<GamesCatalogLazy />} />
                
                {/* Features Routes */}
                <Route path="/features/educational-games" element={<EducationalGames />} />
                <Route path="/features/communication-support" element={<CommunicationSupport />} />
                <Route path="/features/progress-tracking" element={<ProgressTracking />} />
                <Route path="/features/family-management" element={<FamilyManagement />} />
                
                {/* Support Routes */}
                <Route path="/support/help-center" element={<HelpCenter />} />
                <Route path="/support/contact" element={<ContactUs />} />
                <Route path="/support/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/support/terms" element={<TermsOfService />} />
                
                {/* Connect Routes */}
                <Route path="/connect/community-forum" element={<CommunityForum />} />
                <Route path="/connect/parent-resources" element={<ParentResources />} />
                <Route path="/connect/therapist-tools" element={<TherapistTools />} />
                <Route path="/connect/research-studies" element={<ResearchStudies />} />
                
                {/* AAC Demo Route */}
                <Route path="/aac-demo" element={<AACDemo />} />
                
                {/* Game Demo Routes */}
                <Route path="/games/subtraction-demo" element={<SubtractionGameDemo />} />
                
                {/* Simplified Admin Routes - No nesting temporarily */}
                {/* Simplified Admin Routes - No nesting temporarily */}
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
                
                {/* Protected Admin Routes */}
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
                      <AdminDashboard />
                    </ErrorBoundary>
                  } />
                  <Route path="security-center" element={
                    <ErrorBoundary componentName="AdminSecurityCenter">
                      <AdminSecurityCenter />
                    </ErrorBoundary>
                  } />
                  <Route path="families" element={
                    <ErrorBoundary componentName="AdminFamilies">
                      <AdminFamilies />
                    </ErrorBoundary>
                  } />
                  <Route path="users" element={
                    <ErrorBoundary componentName="AdminUsers">
                      <AdminUsers />
                    </ErrorBoundary>
                  } />
                  <Route path="reports" element={
                    <ErrorBoundary componentName="AdminReports">
                      <AdminReports />
                    </ErrorBoundary>
                  } />
                  <Route path="content" element={
                    <ErrorBoundary componentName="AdminContent">
                      <AdminContent />
                    </ErrorBoundary>
                  } />
                  <Route path="system-monitoring" element={
                    <ErrorBoundary componentName="AdminSystemMonitoring">
                      <AdminSystemMonitoring />
                    </ErrorBoundary>
                  } />
                  <Route path="llm-monitoring" element={
                    <ErrorBoundary componentName="AdminLLMMonitoring">
                      <AdminLLMMonitoring />
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
    </QueryClientProvider>
  );
};

export default App;
