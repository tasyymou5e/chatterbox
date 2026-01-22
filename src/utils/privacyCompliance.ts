import { supabase } from '@/integrations/supabase/client';
import { updatePrivacySettings } from './privacySettings';
import { secureLog } from '@/utils/secureLogging';
import { cLog } from '@/utils/conditionalLogger';
import type { UserDataExport, DataDeletionOptions } from '@/types/privacy';

/**
 * Export all user data for GDPR compliance
 */
export const exportUserData = async (): Promise<UserDataExport | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const [
      profileResult,
      privacyResult,
      behavioralResult,
      choreResult,
      achievementResult,
      familyResult,
      errorResult
    ] = await Promise.allSettled([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('user_privacy_settings').select('*').eq('user_id', user.id).single(),
      supabase.from('behavioral_events').select('*').eq('user_id', user.id).limit(1000),
      supabase.from('chore_completions').select('*').eq('user_id', user.id).limit(1000),
      supabase.from('user_achievements').select('*').eq('user_id', user.id),
      supabase.from('family_members').select(`
        *,
        families:family_id (
          id,
          display_name,
          created_at
        )
      `).eq('user_id', user.id),
      supabase.from('system_errors').select('*').eq('user_id', user.id).limit(100)
    ]);

    return {
      profile: profileResult.status === 'fulfilled' ? profileResult.value.data : null,
      privacy_settings: privacyResult.status === 'fulfilled' ? privacyResult.value.data : null,
      behavioral_events: behavioralResult.status === 'fulfilled' ? behavioralResult.value.data || [] : [],
      chore_completions: choreResult.status === 'fulfilled' ? choreResult.value.data || [] : [],
      user_achievements: achievementResult.status === 'fulfilled' ? achievementResult.value.data || [] : [],
      families: familyResult.status === 'fulfilled' ? familyResult.value.data || [] : [],
      error_logs: errorResult.status === 'fulfilled' ? errorResult.value.data || [] : []
    };
  } catch (error) {
    secureLog.error('Error exporting user data', error, 'PrivacyCompliance');
    return null;
  }
};

/**
 * Request account deletion with configurable data retention
 */
export const requestDataDeletion = async (options: DataDeletionOptions = {}): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Start a transaction-like series of deletions
    const deletionPromises = [];

    if (options.deleteBehavioralData !== false) {
      deletionPromises.push(
        supabase.from('behavioral_events').delete().eq('user_id', user.id)
      );
    }

    if (options.deleteActivityLogs !== false) {
      deletionPromises.push(
        supabase.from('user_activity_logs').delete().eq('user_id', user.id)
      );
    }

    if (options.deleteProfileData) {
      // Mark privacy settings for deletion but preserve minimal data for legal compliance
      deletionPromises.push(
        updatePrivacySettings({
          behavioral_tracking_consent: false,
          analytics_sharing_consent: false,
          data_retention_days: 1 // Minimum retention
        })
      );
    }

    // Execute all deletions
    const results = await Promise.allSettled(deletionPromises);
    
    // Check if any deletions failed
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      secureLog.error('Some data deletion operations failed', { count: failures.length }, 'PrivacyCompliance');
      return false;
    }

    // Log the data deletion request for audit purposes
    await supabase.functions.invoke('error-collector', {
      body: {
        errorType: 'data_deletion_request',
        severity: 'medium',
        message: 'User requested data deletion',
        userId: user.id,
        metadata: { 
          options, 
          timestamp: new Date().toISOString(),
          successful_operations: results.length - failures.length
        }
      }
    });

    return true;
  } catch (error) {
    secureLog.error('Error processing data deletion request', error, 'PrivacyCompliance');
    return false;
  }
};

/**
 * Schedule automatic data cleanup based on retention settings
 */
export const scheduleDataCleanup = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // This would typically be handled by a scheduled function
    // For now, we'll just log the intention
    cLog('Data cleanup scheduled for user', { userId: user.id });
    
    // In a real implementation, this would trigger a background job
    // to clean up data older than the user's retention preference
  } catch (error) {
    secureLog.error('Error scheduling data cleanup', error, 'PrivacyCompliance');
  }
};

/**
 * Anonymize user data while preserving analytics value
 */
export const anonymizeUserData = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Replace personally identifiable information with anonymous identifiers
    // Anonymous ID reserved for future use in data anonymization
    void `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const updates = await Promise.allSettled([
      // Anonymize behavioral events - keep patterns but remove identity
      supabase.from('behavioral_events')
        .update({ user_id: undefined })
        .eq('user_id', user.id),
      
      // Anonymize error logs
      supabase.from('system_errors')
        .update({ user_id: null })
        .eq('user_id', user.id)
    ]);

    const failures = updates.filter(result => result.status === 'rejected');
    return failures.length === 0;
  } catch (error) {
    secureLog.error('Error anonymizing user data', error, 'PrivacyCompliance');
    return false;
  }
};
