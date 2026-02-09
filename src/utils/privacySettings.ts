import { supabase } from '@/integrations/supabase/client';

export interface PrivacySettings {
  id?: string;
  user_id: string;
  behavioral_tracking_consent: boolean;
  data_retention_days: number;
  analytics_sharing_consent: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get current user's privacy settings
 */
export const getUserPrivacySettings = async (): Promise<PrivacySettings | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_privacy_settings')
      .select('id, user_id, behavioral_tracking_consent, data_retention_days, analytics_sharing_consent, created_at, updated_at')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching privacy settings:', error);
      return null;
    }

    // Return default settings if none exist
    if (!data) {
      return {
        user_id: user.id,
        behavioral_tracking_consent: false,
        data_retention_days: 90,
        analytics_sharing_consent: false
      };
    }

    return data;
  } catch (error) {
    console.error('Error in getUserPrivacySettings:', error);
    return null;
  }
};

/**
 * Update user's privacy settings
 */
export const updatePrivacySettings = async (settings: Partial<PrivacySettings>): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }

    // Check if settings already exist for this user
    const { data: existingData, error: fetchError } = await supabase
      .from('user_privacy_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking existing privacy settings:', fetchError);
      return false;
    }

    if (existingData) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_privacy_settings')
        .update({
          behavioral_tracking_consent: settings.behavioral_tracking_consent,
          data_retention_days: settings.data_retention_days,
          analytics_sharing_consent: settings.analytics_sharing_consent,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating privacy settings:', updateError);
        return false;
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('user_privacy_settings')
        .insert({
          user_id: user.id,
          behavioral_tracking_consent: settings.behavioral_tracking_consent ?? false,
          data_retention_days: settings.data_retention_days ?? 90,
          analytics_sharing_consent: settings.analytics_sharing_consent ?? false
        });

      if (insertError) {
        console.error('Error inserting privacy settings:', insertError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in updatePrivacySettings:', error);
    return false;
  }
};

/**
 * Check if user has given consent for behavioral tracking
 */
export const hasTrackingConsent = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.rpc('has_behavioral_tracking_consent', {
      p_user_id: user.id
    });

    if (error) {
      console.error('Error checking tracking consent:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error in hasTrackingConsent:', error);
    return false;
  }
};

/**
 * Initialize default privacy settings for new users
 */
export const initializePrivacySettings = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if settings already exist
    const existing = await getUserPrivacySettings();
    if (existing?.id) return; // Settings already exist

    await updatePrivacySettings({
      behavioral_tracking_consent: false,
      data_retention_days: 90,
      analytics_sharing_consent: false
    });
  } catch (error) {
    console.error('Error initializing privacy settings:', error);
  }
};