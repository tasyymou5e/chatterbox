import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthSessionStore } from '@/stores/authSessionStore';
import { useAuthRoleStore } from '@/stores/authRoleStore';
import { useAuthActionsStore } from '@/stores/authActionsStore';
import { RefreshCw, AlertCircle, Shield } from 'lucide-react';
import { cLog, cWarn, cInfo } from '@/utils/conditionalLogger';

interface AdminRouteProps {
  children: React.ReactNode;
}

// Maximum time to wait for auth checks before showing timeout UI
const LOADING_TIMEOUT_MS = 10000; // 10 seconds
const ROLE_CHECK_TIMEOUT_MS = 5000; // 5 seconds for role check
const SIGNOUT_TIMEOUT_MS = 5000; // 5 seconds for sign out

export const AdminRoute = ({ children }: AdminRouteProps) => {
  // Read directly from source stores - this is the most reliable approach
  // Avoids any potential race conditions from the facade store
  const { loading: sessionLoading, user, sessionReady, initialize } = useAuthSessionStore();
  const { isAdmin, isCheckingRole, fetchUserRole } = useAuthRoleStore();
  const { signingOut } = useAuthActionsStore();
  
  // Combined loading state - only show loading if session isn't ready yet
  const loading = sessionLoading || (!sessionReady && !user);

  // Timeout states
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [roleCheckTimeout, setRoleCheckTimeout] = useState(false);
  const [signOutTimeout, setSignOutTimeout] = useState(false);
  
  // Track mount state to prevent state updates after unmount
  const mountedRef = useRef(true);
  
  // Track if we've already triggered role fetch to prevent loops
  const roleFetchedRef = useRef(false);
  
  // Debug info for troubleshooting
  const authDebugInfo = `Session: ${sessionReady ? 'ready' : 'pending'}, User: ${user ? 'present' : 'null'}, Admin: ${isAdmin}, Loading: ${loading}, RoleCheck: ${isCheckingRole}`;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Log state changes for debugging
  useEffect(() => {
    cLog('AdminRoute state', {
      sessionReady,
      hasUser: !!user,
      isAdmin,
      loading,
      isCheckingRole,
      signingOut
    });
  }, [sessionReady, user, isAdmin, loading, isCheckingRole, signingOut]);

  // Initialize auth on mount if not already initialized
  useEffect(() => {
    if (!sessionReady && !sessionLoading) {
      cInfo('AdminRoute: Initializing auth session');
      initialize();
    }
  }, [sessionReady, sessionLoading, initialize]);

  // Trigger role check when user is present but role not checked
  // Uses a ref to prevent duplicate fetches
  useEffect(() => {
    if (user && !isAdmin && !isCheckingRole && sessionReady && !roleFetchedRef.current) {
      cInfo('AdminRoute: Triggering role check for user', user.id);
      roleFetchedRef.current = true;
      fetchUserRole(user.id).then(() => {
        // Reset ref after a delay to allow re-fetch if needed
        setTimeout(() => {
          if (mountedRef.current) {
            roleFetchedRef.current = false;
          }
        }, 1000);
      });
    }
  }, [user, isAdmin, isCheckingRole, sessionReady, fetchUserRole]);

  // Reset role fetched ref when user changes
  useEffect(() => {
    if (!user) {
      roleFetchedRef.current = false;
    }
  }, [user]);

  // Loading timeout handler
  useEffect(() => {
    if (loading && !loadingTimeout) {
      const timeout = setTimeout(() => {
        if (mountedRef.current) {
          cWarn('AdminRoute: Loading timeout exceeded');
          setLoadingTimeout(true);
        }
      }, LOADING_TIMEOUT_MS);
      return () => { clearTimeout(timeout); };
    }
    if (!loading) {
      setLoadingTimeout(false);
    }
    return undefined;
  }, [loading, loadingTimeout]);

  // Role check timeout handler
  useEffect(() => {
    if (isCheckingRole && !roleCheckTimeout) {
      const timeout = setTimeout(() => {
        if (mountedRef.current) {
          cWarn('AdminRoute: Role check timeout exceeded');
          setRoleCheckTimeout(true);
        }
      }, ROLE_CHECK_TIMEOUT_MS);
      return () => { clearTimeout(timeout); };
    }
    if (!isCheckingRole) {
      setRoleCheckTimeout(false);
    }
    return undefined;
  }, [isCheckingRole, roleCheckTimeout]);

  // Sign out timeout handler
  useEffect(() => {
    if (signingOut && !signOutTimeout) {
      const timeout = setTimeout(() => {
        if (mountedRef.current) {
          cWarn('AdminRoute: Sign out timeout exceeded');
          setSignOutTimeout(true);
        }
      }, SIGNOUT_TIMEOUT_MS);
      return () => { clearTimeout(timeout); };
    }
    if (!signingOut) {
      setSignOutTimeout(false);
    }
    return undefined;
  }, [signingOut, signOutTimeout]);

  // Emergency reset handler
  const handleEmergencyReset = useCallback(() => {
    cInfo('AdminRoute: Emergency reset triggered');
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/admin/login';
  }, []);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  // Show loading state - but not if we've timed out or have a role check timeout
  const showLoadingState = (loading || isCheckingRole) && !loadingTimeout && !roleCheckTimeout;
  
  if (showLoadingState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="relative">
            <Shield className="h-16 w-16 text-blue-500 mx-auto opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          </div>
          <p className="mt-6 text-gray-300 text-lg font-medium">
            {isCheckingRole ? 'Verifying permissions...' : 'Loading Admin Panel'}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {isCheckingRole ? 'Checking admin access' : 'Authenticating...'}
          </p>
          <div className="mt-6">
            <button 
              onClick={handleRefresh}
              className="text-blue-400 hover:text-blue-300 text-sm underline flex items-center gap-1 mx-auto"
            >
              <RefreshCw className="h-3 w-3" />
              Taking too long? Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show signing out state
  if (signingOut && !signOutTimeout) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Signing out...</p>
        </div>
      </div>
    );
  }

  // Show timeout/error state
  if (loadingTimeout || roleCheckTimeout || signOutTimeout) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-amber-500/50 rounded-lg p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-amber-400 font-semibold text-xl mb-3">
            {signOutTimeout ? 'Sign Out Issue' : roleCheckTimeout ? 'Permission Check Failed' : 'Connection Timeout'}
          </h2>
          <p className="text-gray-400 mb-4 text-sm">
            {signOutTimeout 
              ? 'The sign out process encountered an issue.'
              : roleCheckTimeout
              ? 'Unable to verify your admin permissions.'
              : 'Authentication is taking longer than expected.'}
          </p>
          
          <div className="bg-gray-900/50 rounded p-3 mb-6">
            <p className="text-xs text-gray-500 font-mono">{authDebugInfo}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </button>
            <button
              onClick={handleEmergencyReset}
              className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              Clear Session & Login Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not admin
  if (!user || !isAdmin) {
    cInfo('AdminRoute: Redirecting to login', { hasUser: !!user, isAdmin });
    return <Navigate to="/admin/login" replace />;
  }

  // All checks passed - render protected content
  cInfo('AdminRoute: Rendering protected content');
  return <>{children}</>;
};
