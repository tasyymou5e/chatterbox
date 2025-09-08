import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyConsent } from '@/hooks/usePrivacyConsent';
import PrivacyConsentDialog from '@/components/privacy/PrivacyConsentDialog';

interface AppInitializerProps {
  children: React.ReactNode;
}

/**
 * Handles app-wide initialization tasks like privacy consent
 */
export default function AppInitializer({ children }: AppInitializerProps) {
  const { user } = useAuth();
  const {
    showConsentDialog,
    setShowConsentDialog,
    updateConsentStatus,
    loading
  } = usePrivacyConsent();

  // Don't render anything while loading consent status
  if (loading && user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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