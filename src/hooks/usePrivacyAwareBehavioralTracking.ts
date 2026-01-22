import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { hasTrackingConsent } from '@/utils/privacySettings';
import { cLog } from '@/utils/conditionalLogger';

interface BehavioralEvent {
  event_type: string;
  event_category: string;
  event_data?: Record<string, any>;
  family_id?: string;
  session_id?: string;
  page_path?: string;
  device_type?: string;
  interaction_element?: string;
  duration_seconds?: number;
}

export const usePrivacyAwareBehavioralTracking = () => {
  const trackBehavioralEvent = useCallback(async (eventData: BehavioralEvent) => {
    try {
      // Check for user consent before tracking
      const hasConsent = await hasTrackingConsent();
      if (!hasConsent) {
        cLog('Behavioral tracking skipped - no user consent');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Log the behavioral event with privacy protection
      await supabase
        .from('behavioral_events')
        .insert({
          user_id: user.id,
          family_id: eventData.family_id,
          event_type: eventData.event_type,
          event_category: eventData.event_category,
          event_data: eventData.event_data || {},
          session_id: eventData.session_id || sessionStorage.getItem('session_id'),
          page_path: eventData.page_path || window.location.pathname,
          device_type: eventData.device_type || (window.innerWidth > 768 ? 'desktop' : 'mobile'),
          interaction_element: eventData.interaction_element,
          duration_seconds: eventData.duration_seconds
        });

    } catch (error) {
      console.error('Error tracking behavioral event:', error);
    }
  }, []);

  const trackPageView = useCallback(async (page: string, familyId?: string) => {
    await trackBehavioralEvent({
      event_type: 'page_view',
      event_category: 'navigation',
      page_path: page,
      family_id: familyId
    });
  }, [trackBehavioralEvent]);

  const trackUserInteraction = useCallback(async (
    element: string, 
    action: string, 
    familyId?: string,
    metadata?: Record<string, any>
  ) => {
    await trackBehavioralEvent({
      event_type: 'user_interaction',
      event_category: 'engagement',
      interaction_element: element,
      family_id: familyId,
      event_data: { action, ...metadata }
    });
  }, [trackBehavioralEvent]);

  const trackFeatureUsage = useCallback(async (
    featureName: string,
    usageType: 'start' | 'complete' | 'error',
    familyId?: string,
    duration?: number
  ) => {
    await trackBehavioralEvent({
      event_type: 'feature_usage',
      event_category: 'functionality',
      family_id: familyId,
      duration_seconds: duration,
      event_data: { feature: featureName, usage_type: usageType }
    });
  }, [trackBehavioralEvent]);

  return {
    trackBehavioralEvent,
    trackPageView,
    trackUserInteraction,
    trackFeatureUsage
  };
};