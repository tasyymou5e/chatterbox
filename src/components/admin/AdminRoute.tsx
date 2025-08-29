import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { loading, user, isAdmin, signingOut } = useAdminAuth();

  // Emergency timeout - if loading takes too long, show fallback
  const [showEmergencyFallback, setShowEmergencyFallback] = React.useState(false);
  
  React.useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setShowEmergencyFallback(true);
      }, 15000); // 15 second emergency timeout
      
      return () => clearTimeout(timeout);
    } else {
      setShowEmergencyFallback(false);
    }
  }, [loading]);

  // Emergency timeout for stuck signOut
  React.useEffect(() => {
    if (signingOut) {
      const timeout = setTimeout(() => {
        console.warn('🔐 AdminRoute - SignOut timeout detected, triggering emergency logout');
        // Access emergency logout from auth store
        const authStore = (window as any).__authStore;
        if (authStore) {
          authStore.getState().emergencyLogout();
        }
      }, 8000); // 8 second timeout for signOut (reduced for faster recovery)
      
      return () => clearTimeout(timeout);
    }
  }, [signingOut]);

  // Show emergency fallback if loading takes too long
  if (showEmergencyFallback) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">System Loading Issue</h2>
          <p className="text-muted-foreground mb-4">
            The admin system is taking longer than expected to load.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  // Show loading for admin check or during signOut
  if (loading || signingOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">
          {signingOut ? 'Signing out...' : 'Verifying admin access...'}
        </p>
      </div>
    );
  }

  // Only redirect if not signing out (to prevent race condition)
  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};