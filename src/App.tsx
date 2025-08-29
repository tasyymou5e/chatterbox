import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminAuthProvider } from "@/hooks/useAdminAuth";
import { AdminRoute } from "@/components/admin/AdminRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import About from "./pages/About";
import ParentDashboard from "./pages/ParentDashboard";
import ParentChoreManagement from "./pages/parent/ParentChoreManagement";
import ChildrenTasksDashboard from "./pages/children/ChildrenTasksDashboard";
import Reports from "./pages/Reports";
import GamesCatalog from "./pages/GamesCatalog";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminFamilies from "./pages/admin/AdminFamilies";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminReports from "./pages/admin/AdminReports";
import AdminContent from "./pages/admin/AdminContent";
import AdminSystemMonitoring from "./pages/admin/AdminSystemMonitoring";
import { AdminDebugPanel } from "@/components/admin/AdminDebugPanel";
import { AdminBootstrap } from "@/components/admin/AdminBootstrap";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AdminAuthProvider>
        <TooltipProvider>
          <ErrorBoundary componentName="App">
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/about" element={<About />} />
              <Route path="/parent-dashboard" element={<ParentDashboard />} />
              <Route path="/parent" element={<ParentDashboard />} />
              <Route path="/parent/chores" element={<ParentChoreManagement />} />
              <Route path="/children/tasks" element={<ChildrenTasksDashboard />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/games" element={<GamesCatalog />} />
              
              {/* Simplified Admin Routes - No nesting temporarily */}
              <Route path="/admin/login" element={
                <ErrorBoundary componentName="AdminLogin">
                  <AdminLogin />
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
                  <AdminRoute>
                    <AdminBootstrap />
                  </AdminRoute>
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
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </AdminAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
