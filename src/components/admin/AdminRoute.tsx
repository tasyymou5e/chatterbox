import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { loading, user, isAdmin, signingOut } = useAdminAuth();
  
  // Emergency timeouts to prevent infinite loading states - increased timeouts to allow for slower auth
  const [emergencyLoadingTimeout, setEmergencyLoadingTimeout] = React.useState(false);
  const [emergencySignOutTimeout, setEmergencySignOutTimeout] = React.useState(false);
  const [authDebugInfo, setAuthDebugInfo] = React.useState<string>('');

  // Debug auth state changes
  React.useEffect(() => {
    const debugInfo = `Loading: ${loading}, User: ${user ? 'present' : 'null'}, IsAdmin: ${isAdmin}, SigningOut: ${signingOut}`;
    setAuthDebugInfo(debugInfo);
    console.log('🛡️ AdminRoute auth state:', debugInfo);
  }, [loading, user, isAdmin, signingOut]);

  React.useEffect(() => {
    if (loading) {
      console.log('⏳ AdminRoute: Starting loading timeout (20s)');
      const timeout = setTimeout(() => {
        console.warn('🚨 Emergency timeout: Loading took too long (>20s)');
        setEmergencyLoadingTimeout(true);
      }, 20000); // Increased to 20 seconds

      return () => clearTimeout(timeout);
    } else {
      setEmergencyLoadingTimeout(false);
    }
  }, [loading]);

  React.useEffect(() => {
    if (signingOut) {
      console.log('⏳ AdminRoute: Starting sign out timeout (10s)');
      const timeout = setTimeout(() => {
        console.warn('🚨 Emergency timeout: Sign out took too long (>10s)');
        setEmergencySignOutTimeout(true);
      }, 10000); // Increased to 10 seconds

      return () => clearTimeout(timeout);
    } else {
      setEmergencySignOutTimeout(false);
    }
  }, [signingOut]);

  // Show loading state with debug info
  if (loading && !emergencyLoadingTimeout) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading admin panel...</p>
          <p className="mt-2 text-xs text-gray-500">{authDebugInfo}</p>
        </div>
      </div>
    );
  }

  // Show sign out state
  if (signingOut && !emergencySignOutTimeout) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Signing out...</p>
        </div>
      </div>
    );
  }

  // Emergency fallback UI with recovery options
  if (emergencyLoadingTimeout || emergencySignOutTimeout) {
    const handleEmergencyReset = () => {
      console.log('🚨 Emergency reset triggered');
      // Clear all auth state and redirect to login
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/admin/login';
    };

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-red-400 font-semibold mb-2">Authentication Timeout</h2>
          <p className="text-gray-300 mb-2 text-sm">
            The authentication process is taking longer than expected.
          </p>
          <p className="text-xs text-gray-500 mb-4">{authDebugInfo}</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
            >
              Refresh Page
            </button>
            <button
              onClick={handleEmergencyReset}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
            >
              Reset & Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Improved session validation - ensure we have both user and session
  if (!user || !isAdmin) {
    console.log('🔄 AdminRoute: Redirecting to login - User:', !!user, 'IsAdmin:', isAdmin);
    return <Navigate to="/admin/login" replace />;
  }

  // Additional validation: ensure we have a complete auth state
  console.log('✅ AdminRoute: Auth validated, rendering protected content');
  return <>{children}</>;
};