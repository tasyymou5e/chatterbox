import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { cLog, cWarn, cInfo, cError } from '@/utils/conditionalLogger';
import type { ErrorContext } from '@/types/interfaces';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { loading, user, isAdmin, signingOut } = useAdminAuth();
  
  // Emergency timeouts to prevent infinite loading states - increased timeouts to allow for slower auth
  const [emergencyLoadingTimeout, setEmergencyLoadingTimeout] = React.useState(false);
  const [emergencySignOutTimeout, setEmergencySignOutTimeout] = React.useState(false);
  const [authDebugInfo, setAuthDebugInfo] = React.useState<string>('');

  const handleError = (error: unknown, context: ErrorContext) => {
    cError('Auth error in AdminRoute', error, context);
  };

  // Debug auth state changes
  React.useEffect(() => {
    const debugInfo = `Loading: ${loading}, User: ${user ? 'present' : 'null'}, IsAdmin: ${isAdmin}, SigningOut: ${signingOut}`;
    setAuthDebugInfo(debugInfo);
    cLog('AdminRoute auth state', debugInfo);
  }, [loading, user, isAdmin, signingOut]);

  React.useEffect(() => {
    if (loading) {
      cInfo('Starting loading timeout (15s)');
      const timeout = setTimeout(() => {
        cWarn('Loading timeout exceeded - providing recovery options');
        setEmergencyLoadingTimeout(true);
      }, 15000); // Reduced to 15 seconds with better UX

      return () => clearTimeout(timeout);
    } else {
      setEmergencyLoadingTimeout(false);
    }
  }, [loading]);

  React.useEffect(() => {
    if (signingOut) {
      cInfo('Starting sign out timeout (8s)');
      const timeout = setTimeout(() => {
        cWarn('Sign out timeout exceeded - providing recovery options');
        setEmergencySignOutTimeout(true);
      }, 8000); // Reduced to 8 seconds with better UX

      return () => clearTimeout(timeout);
    } else {
      setEmergencySignOutTimeout(false);
    }
  }, [signingOut]);

  // Show enhanced loading state with progress indicators
  if (loading && !emergencyLoadingTimeout) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-6 text-gray-300 text-lg font-medium">Loading Admin Panel</p>
          <p className="mt-2 text-sm text-gray-400">Authenticating and loading dashboard...</p>
          <div className="mt-4 px-4 py-2 bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-500">{authDebugInfo}</p>
          </div>
          <div className="mt-6">
            <p className="text-xs text-gray-600">Taking longer than expected?</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 text-blue-400 hover:text-blue-300 text-sm underline flex items-center gap-1 mx-auto"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh Page
            </button>
          </div>
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

  // Enhanced emergency fallback UI with better guidance
  if (emergencyLoadingTimeout || emergencySignOutTimeout) {
    const handleEmergencyReset = () => {
      cInfo('Emergency reset triggered by user');
      // Clear all auth state and redirect to login
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/admin/login';
    };

    const isSignOutIssue = emergencySignOutTimeout;

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-amber-500 rounded-lg p-8 max-w-lg text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-amber-500" />
          </div>
          <h2 className="text-amber-400 font-semibold text-xl mb-3">
            {isSignOutIssue ? 'Sign Out Timeout' : 'Authentication Timeout'}
          </h2>
          <p className="text-gray-300 mb-3 text-sm leading-relaxed">
            {isSignOutIssue 
              ? 'The sign out process is taking longer than expected. This might be due to network issues.'
              : 'The authentication process is taking longer than expected. This could be due to network connectivity or server response issues.'
            }
          </p>
          
          <div className="bg-gray-700 rounded-lg p-3 mb-6">
            <p className="text-xs text-gray-400 font-mono">{authDebugInfo}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </button>
            <button
              onClick={handleEmergencyReset}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              Clear Cache & Return to Login
            </button>
          </div>
          
          <p className="mt-4 text-xs text-gray-500">
            If this issue persists, please check your network connection or contact support.
          </p>
        </div>
      </div>
    );
  }

  // Improved session validation - ensure we have both user and session
  if (!user || !isAdmin) {
    cInfo('Redirecting to login', { hasUser: !!user, isAdmin });
    return <Navigate to="/admin/login" replace />;
  }

  // Additional validation: ensure we have a complete auth state
  cInfo('Auth validated, rendering protected content');
  return <>{children}</>;
};