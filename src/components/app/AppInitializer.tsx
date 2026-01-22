import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyConsent } from '@/hooks/usePrivacyConsent';
import PrivacyConsentDialog from '@/components/privacy/PrivacyConsentDialog';
import { initLogger } from '@/utils/initializationLogger';
import { secureLog } from '@/utils/secureLogging';
import { Button } from '@/components/ui/button';
import { RefreshCw, Trash2, AlertCircle } from 'lucide-react';

interface AppInitializerProps {
  children: React.ReactNode;
}

// Timeout for showing fallback UI (user-facing)
const FALLBACK_TIMEOUT_MS = 8000;
// Timeout for stall detection (logging)
const STALL_DETECTION_MS = 15000;

/**
 * Fallback UI shown when initialization takes too long
 */
function FallbackLoadingState({ 
  onRetry, 
  onClearAndRetry, 
  onContinue 
}: { 
  onRetry: () => void;
  onClearAndRetry: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-6 max-w-md p-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Taking longer than expected
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            The app is having trouble loading. This might be due to a slow connection 
            or a temporary issue.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button onClick={onRetry} variant="default" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          
          <Button onClick={onClearAndRetry} variant="outline" className="w-full">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Cache & Retry
          </Button>
          
          <Button 
            onClick={onContinue} 
            variant="ghost" 
            className="w-full text-muted-foreground"
          >
            Continue anyway
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs text-left w-full">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Debug Info
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
              {initLogger.exportDiagnostics()}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * Handles app-wide initialization tasks like privacy consent
 * Includes comprehensive initialization logging and fallback UI for stalls
 */
export default function AppInitializer({ children }: AppInitializerProps) {
  const { user, loading: authLoading, sessionReady } = useAuth();
  const {
    showConsentDialog,
    setShowConsentDialog,
    updateConsentStatus,
    loading: consentLoading
  } = usePrivacyConsent();

  const initStarted = useRef(false);
  const authPhaseLogged = useRef(false);
  const consentPhaseLogged = useRef(false);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stallTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State for fallback UI
  const [showFallback, setShowFallback] = useState(false);
  const [forceRender, setForceRender] = useState(false);

  // Clear all timeouts helper
  const clearAllTimeouts = () => {
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    if (stallTimeoutRef.current) {
      clearTimeout(stallTimeoutRef.current);
      stallTimeoutRef.current = null;
    }
  };

  // Start initialization tracking
  useEffect(() => {
    if (!initStarted.current) {
      initStarted.current = true;
      initLogger.start();
      initLogger.beginPhase('app_initialization');
      initLogger.beginPhase('auth_hydration');
      
      // Show fallback UI after shorter timeout
      fallbackTimeoutRef.current = setTimeout(() => {
        const stalledPhases = initLogger.checkForStalls();
        if (stalledPhases.length > 0) {
          secureLog.warn('Initialization slow, showing fallback UI', { stalledPhases }, 'AppInitializer');
          setShowFallback(true);
        }
      }, FALLBACK_TIMEOUT_MS);

      // Log stall warning after longer timeout
      stallTimeoutRef.current = setTimeout(() => {
        const stalledPhases = initLogger.checkForStalls();
        if (stalledPhases.length > 0) {
          secureLog.warn('Initialization stalled', { stalledPhases }, 'AppInitializer');
        }
      }, STALL_DETECTION_MS);
    }

    return () => {
      clearAllTimeouts();
    };
  }, []);

  // Track auth hydration completion
  useEffect(() => {
    if (!authPhaseLogged.current && sessionReady) {
      authPhaseLogged.current = true;
      initLogger.completePhase('auth_hydration', { 
        hasUser: !!user,
        sessionReady 
      });
      
      secureLog.dev('Auth hydration complete', { hasUser: !!user, sessionReady });
    }
  }, [sessionReady, user]);

  // Track consent loading completion
  useEffect(() => {
    if (!consentPhaseLogged.current && !consentLoading && authPhaseLogged.current) {
      consentPhaseLogged.current = true;
      initLogger.completePhase('app_initialization', {
        hasUser: !!user,
        consentRequired: showConsentDialog
      });
      
      // Clear timeouts and hide fallback since initialization is complete
      clearAllTimeouts();
      setShowFallback(false);
      
      secureLog.dev('App initialization complete', { 
        hasUser: !!user, 
        showConsentDialog,
        status: initLogger.getStatusSummary()
      });
    }
  }, [consentLoading, showConsentDialog, user]);

  // Recovery handlers
  const handleRetry = () => {
    window.location.reload();
  };

  const handleClearAndRetry = () => {
    // Clear auth-related storage
    try {
      localStorage.removeItem('auth-session-store');
      localStorage.removeItem('auth-role-store');
      localStorage.removeItem('auth-actions-store');
      sessionStorage.clear();
    } catch (e) {
      secureLog.warn('Failed to clear storage', { error: e }, 'AppInitializer');
    }
    window.location.reload();
  };

  const handleContinueAnyway = () => {
    secureLog.warn('User chose to continue despite initialization stall', {}, 'AppInitializer');
    setShowFallback(false);
    setForceRender(true);
  };

  // Show loading state while auth is initializing
  const loading = authLoading || (consentLoading && user);

  // Show fallback if timeout occurred while still loading
  if (loading && showFallback && !forceRender) {
    return (
      <FallbackLoadingState 
        onRetry={handleRetry}
        onClearAndRetry={handleClearAndRetry}
        onContinue={handleContinueAnyway}
      />
    );
  }
  
  // Normal loading state (before timeout)
  if (loading && !forceRender) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-muted-foreground">
              {authLoading ? 'Loading auth...' : 'Loading preferences...'}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      
      {/* Privacy consent dialog for first-time users */}
      <PrivacyConsentDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        onComplete={updateConsentStatus}
        isFirstTime={true}
      />
    </>
  );
}
