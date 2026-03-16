import { useState, useEffect } from 'react';
import { getUserPrivacySettings, hasTrackingConsent, initializePrivacySettings } from '@/utils/privacySettings';
import { useAuth } from './useAuth';

export const usePrivacyConsent = () => {
  const { user } = useAuth();
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkConsentStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkConsentStatus = async () => {
    try {
      setLoading(true);
      
      // Check if user has privacy settings
      const settings = await getUserPrivacySettings();
      
      if (!settings?.id) {
        // New user - initialize default settings and show consent dialog
        await initializePrivacySettings();
        setShowConsentDialog(true);
        setHasConsent(false);
      } else {
        // Existing user - check current consent status
        const consent = await hasTrackingConsent();
        setHasConsent(consent);
      }
    } catch (error) {
      console.error('Error checking consent status:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConsentStatus = async () => {
    const consent = await hasTrackingConsent();
    setHasConsent(consent);
  };

  return {
    showConsentDialog,
    setShowConsentDialog,
    hasConsent,
    loading,
    updateConsentStatus,
    checkConsentStatus
  };
};
