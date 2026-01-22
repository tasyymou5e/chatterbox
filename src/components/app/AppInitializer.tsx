import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyConsent } from '@/hooks/usePrivacyConsent';
import PrivacyConsentDialog from '@/components/privacy/PrivacyConsentDialog';
import { initLogger } from '@/utils/initializationLogger';
import { secureLog } from '@/utils/secureLogging';

interface AppInitializerProps {
  children: React.ReactNode;
}

// Timeout for initialization phases
const INIT_TIMEOUT_MS = 15000;

/**
 * Handles app-wide initialization tasks like privacy consent
 * Includes comprehensive initialization logging
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Start initialization tracking
  useEffect(() => {
    if (!initStarted.current) {
      initStarted.current = true;
      initLogger.start();
      initLogger.beginPhase('app_initialization');
      initLogger.beginPhase('auth_hydration');
      
      // Set up timeout to detect stalls
      timeoutRef.current = setTimeout(() => {
        const stalledPhases = initLogger.checkForStalls();
        if (stalledPhases.length > 0) {
          secureLog.warn('Initialization stalled', { stalledPhases }, 'AppInitializer');
        }
      }, INIT_TIMEOUT_MS);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
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
      
      // Clear timeout since initialization is complete
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      secureLog.dev('App initialization complete', { 
        hasUser: !!user, 
        showConsentDialog,
        status: initLogger.getStatusSummary()
      });
    }
  }, [consentLoading, showConsentDialog, user]);

  // Show loading state while auth is initializing
  const loading = authLoading || (consentLoading && user);
  
  if (loading) {
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
