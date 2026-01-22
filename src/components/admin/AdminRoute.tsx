import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthSessionStore } from '@/stores/authSessionStore';
import { useAuthRoleStore } from '@/stores/authRoleStore';
import { useAuthActionsStore } from '@/stores/authActionsStore';
import { RefreshCw, AlertCircle, Shield, Bug } from 'lucide-react';
import { cLog, cWarn, cInfo, cError } from '@/utils/conditionalLogger';

interface AdminRouteProps {
  children: React.ReactNode;
}

// Maximum time to wait for auth checks before showing timeout UI
const LOADING_TIMEOUT_MS = 10000; // 10 seconds
const ROLE_CHECK_TIMEOUT_MS = 5000; // 5 seconds for role check
const SIGNOUT_TIMEOUT_MS = 5000; // 5 seconds for sign out
const INIT_RETRY_DELAY_MS = 100; // Delay before retrying initialization

// Debug mode storage key
const DEBUG_MODE_KEY = 'admin_route_debug_mode';

// State transition types for logging
type AuthStateTransition = {
  timestamp: number;
  elapsed: number;
  event: string;
  state: Record<string, unknown>;
};

// Debug logger class for tracking state transitions
class AuthDebugLogger {
  private startTime: number;
  private transitions: AuthStateTransition[] = [];
  private enabled: boolean;

  constructor() {
    this.startTime = performance.now();
    this.enabled = typeof window !== 'undefined' && localStorage.getItem(DEBUG_MODE_KEY) === 'true';
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEBUG_MODE_KEY, enabled ? 'true' : 'false');
    }
    if (enabled) {
      this.reset();
      this.log('DEBUG_MODE_ENABLED', { message: 'Debug logging activated' });
    }
  }

  isEnabled() {
    return this.enabled;
  }

  reset() {
    this.startTime = performance.now();
    this.transitions = [];
  }

  log(event: string, state: Record<string, unknown>) {
    if (!this.enabled) return;

    const now = performance.now();
    const transition: AuthStateTransition = {
      timestamp: now,
      elapsed: Math.round(now - this.startTime),
      event,
      state
    };
    this.transitions.push(transition);

    // Log to console with timing
    cInfo(`[AdminRoute Debug] ${event} (+${transition.elapsed}ms)`, state);
  }

  getTransitions() {
    return [...this.transitions];
  }

  getSummary() {
    return {
      totalTime: Math.round(performance.now() - this.startTime),
      transitionCount: this.transitions.length,
      transitions: this.transitions.map(t => ({
        event: t.event,
        elapsed: `+${t.elapsed}ms`
      }))
    };
  }
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  // Read directly from source stores - this is the most reliable approach
  // Avoids any potential race conditions from the facade store
  const { loading: sessionLoading, user, sessionReady, initialize, isHydrated } = useAuthSessionStore();
  const { isAdmin, isCheckingRole, fetchUserRole } = useAuthRoleStore();
  const { signingOut } = useAuthActionsStore();
  
  // Debug logger instance (persists across renders)
  const debugLoggerRef = useRef<AuthDebugLogger>(new AuthDebugLogger());
  const debugLogger = debugLoggerRef.current;
  
  // Debug mode UI toggle state
  const [debugModeEnabled, setDebugModeEnabled] = useState(() => debugLogger.isEnabled());
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Track initialization attempts to prevent infinite loops
  const [initAttempts, setInitAttempts] = useState(0);
  const MAX_INIT_ATTEMPTS = 3;
  
  // Combined loading state - only show loading if session isn't ready yet
  // Also check isHydrated to ensure persisted state has been loaded
  const loading = sessionLoading || (!sessionReady && !user) || !isHydrated;

  // Timeout states
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [roleCheckTimeout, setRoleCheckTimeout] = useState(false);
  const [signOutTimeout, setSignOutTimeout] = useState(false);
  
  // Track mount state to prevent state updates after unmount
  const mountedRef = useRef(true);
  
  // Track if we've already triggered role fetch to prevent loops
  const roleFetchedRef = useRef(false);
  
  // Track if initialization has been triggered
  const initTriggeredRef = useRef(false);
  
  // Previous state for transition detection
  const prevStateRef = useRef<Record<string, unknown>>({});
  
  // Debug info for troubleshooting
  const authDebugInfo = `Session: ${sessionReady ? 'ready' : 'pending'}, User: ${user ? 'present' : 'null'}, Admin: ${isAdmin}, Loading: ${loading}, RoleCheck: ${isCheckingRole}, Hydrated: ${isHydrated}`;

  // Toggle debug mode
  const toggleDebugMode = useCallback(() => {
    const newEnabled = !debugModeEnabled;
    setDebugModeEnabled(newEnabled);
    debugLogger.setEnabled(newEnabled);
  }, [debugModeEnabled, debugLogger]);

  // Log state transitions when debug mode is enabled
  useEffect(() => {
    if (!debugLogger.isEnabled()) return;

    const currentState = {
      sessionLoading,
      sessionReady,
      hasUser: !!user,
      userId: user?.id?.substring(0, 8),
      isAdmin,
      isCheckingRole,
      isHydrated,
      signingOut,
      loading,
      initAttempts
    };

    // Detect what changed
    const changes: string[] = [];
    Object.keys(currentState).forEach(key => {
      if (prevStateRef.current[key] !== currentState[key as keyof typeof currentState]) {
        changes.push(key);
      }
    });

    if (changes.length > 0) {
      debugLogger.log(`STATE_CHANGE: ${changes.join(', ')}`, currentState);
    }

    prevStateRef.current = currentState;
  }, [sessionLoading, sessionReady, user, isAdmin, isCheckingRole, isHydrated, signingOut, loading, initAttempts, debugLogger]);

  useEffect(() => {
    mountedRef.current = true;
    debugLogger.log('COMPONENT_MOUNT', { timestamp: Date.now() });
    return () => {
      mountedRef.current = false;
      debugLogger.log('COMPONENT_UNMOUNT', { summary: debugLogger.getSummary() });
    };
  }, [debugLogger]);

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
  // This is the critical fix - we need to handle corrupted/stale persisted state
  useEffect(() => {
    // Wait for hydration before attempting initialization
    if (!isHydrated) {
      cInfo('AdminRoute: Waiting for store hydration...');
      return;
    }

    // If session is ready, no need to initialize
    if (sessionReady) {
      cInfo('AdminRoute: Session already ready, skipping initialization');
      initTriggeredRef.current = false;
      return;
    }

    // If already loading, don't trigger another initialization
    if (sessionLoading) {
      cInfo('AdminRoute: Session loading in progress...');
      return;
    }

    // Prevent duplicate initialization attempts
    if (initTriggeredRef.current) {
      return;
    }

    // Check if we've exceeded max attempts
    if (initAttempts >= MAX_INIT_ATTEMPTS) {
      cError('AdminRoute: Max initialization attempts exceeded, forcing redirect');
      return;
    }

    // Trigger initialization
    cInfo('AdminRoute: Initializing auth session', { attempt: initAttempts + 1 });
    debugLogger.log('INIT_TRIGGERED', { attempt: initAttempts + 1, maxAttempts: MAX_INIT_ATTEMPTS });
    initTriggeredRef.current = true;
    setInitAttempts(prev => prev + 1);
    
    // Use a small delay to allow for any pending state updates
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        debugLogger.log('INIT_EXECUTING', { attempt: initAttempts + 1 });
        initialize();
      }
    }, INIT_RETRY_DELAY_MS);

    return () => clearTimeout(timer);
  }, [sessionReady, sessionLoading, initialize, isHydrated, initAttempts, debugLogger]);

  // Trigger role check when user is present but role not checked
  // Uses a ref to prevent duplicate fetches
  useEffect(() => {
    if (user && !isAdmin && !isCheckingRole && sessionReady && !roleFetchedRef.current) {
      cInfo('AdminRoute: Triggering role check for user', user.id);
      debugLogger.log('ROLE_CHECK_STARTED', { userId: user.id.substring(0, 8) });
      roleFetchedRef.current = true;
      fetchUserRole(user.id).then((role) => {
        debugLogger.log('ROLE_CHECK_COMPLETED', { role, isAdmin: role === 'admin' || role === 'super_admin' });
        // Reset ref after a delay to allow re-fetch if needed
        setTimeout(() => {
          if (mountedRef.current) {
            roleFetchedRef.current = false;
          }
        }, 1000);
      });
    }
  }, [user, isAdmin, isCheckingRole, sessionReady, fetchUserRole, debugLogger]);

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

  // Debug panel component
  const DebugPanel = () => {
    if (!showDebugPanel) return null;
    
    const summary = debugLogger.getSummary();
    const transitions = debugLogger.getTransitions();
    
    return (
      <div className="fixed bottom-4 right-4 w-96 max-h-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
        <div className="bg-gray-800 px-3 py-2 flex items-center justify-between border-b border-gray-700">
          <span className="text-sm font-medium text-gray-200">Auth Debug Log</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{summary.totalTime}ms total</span>
            <button 
              onClick={() => setShowDebugPanel(false)}
              className="text-gray-400 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-2 overflow-y-auto max-h-60 font-mono text-xs">
          {transitions.length === 0 ? (
            <p className="text-gray-500">No transitions logged yet</p>
          ) : (
            transitions.map((t, i) => (
              <div key={i} className="mb-2 pb-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-blue-400">{t.event}</span>
                  <span className="text-gray-500">+{t.elapsed}ms</span>
                </div>
                <pre className="text-gray-400 mt-1 whitespace-pre-wrap break-all">
                  {JSON.stringify(t.state, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Debug toggle button (always visible in bottom-left when debug mode enabled)
  const DebugToggle = () => (
    <button
      onClick={() => setShowDebugPanel(prev => !prev)}
      className={`fixed bottom-4 left-4 p-2 rounded-full shadow-lg z-50 transition-colors ${
        debugModeEnabled 
          ? 'bg-amber-600 hover:bg-amber-700 text-white' 
          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      }`}
      title={debugModeEnabled ? 'View Debug Log' : 'Debug Mode Disabled'}
    >
      <Bug className="h-5 w-5" />
    </button>
  );
  
  if (showLoadingState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        {debugModeEnabled && <DebugToggle />}
        {debugModeEnabled && <DebugPanel />}
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
          {debugModeEnabled && (
            <p className="mt-2 text-xs text-amber-500/70 font-mono">
              Debug: {authDebugInfo}
            </p>
          )}
          <div className="mt-6 space-y-2">
            <button 
              onClick={handleRefresh}
              className="text-blue-400 hover:text-blue-300 text-sm underline flex items-center gap-1 mx-auto"
            >
              <RefreshCw className="h-3 w-3" />
              Taking too long? Refresh
            </button>
            <button 
              onClick={toggleDebugMode}
              className={`text-sm flex items-center gap-1 mx-auto transition-colors ${
                debugModeEnabled ? 'text-amber-400 hover:text-amber-300' : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              <Bug className="h-3 w-3" />
              {debugModeEnabled ? 'Debug Mode ON' : 'Enable Debug Mode'}
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
        {debugModeEnabled && <DebugToggle />}
        {debugModeEnabled && <DebugPanel />}
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Signing out...</p>
        </div>
      </div>
    );
  }

  // Show timeout/error state
  if (loadingTimeout || roleCheckTimeout || signOutTimeout) {
    debugLogger.log('TIMEOUT_DISPLAYED', { loadingTimeout, roleCheckTimeout, signOutTimeout });
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        {debugModeEnabled && <DebugToggle />}
        {debugModeEnabled && <DebugPanel />}
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
    debugLogger.log('REDIRECT_TO_LOGIN', { hasUser: !!user, isAdmin, reason: !user ? 'no_user' : 'not_admin' });
    return <Navigate to="/admin/login" replace />;
  }

  // All checks passed - render protected content
  cInfo('AdminRoute: Rendering protected content');
  debugLogger.log('RENDER_PROTECTED_CONTENT', { userId: user.id.substring(0, 8), summary: debugLogger.getSummary() });
  return (
    <>
      {debugModeEnabled && <DebugToggle />}
      {debugModeEnabled && <DebugPanel />}
      {children}
    </>
  );
};
