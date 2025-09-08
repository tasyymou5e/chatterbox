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
      .select('*')
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
    if (!user) return false;

    // First, try to update existing record
    const { data: updateData, error: updateError } = await supabase
      .from('user_privacy_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select();

    if (updateError) {
      console.error('Error updating existing privacy settings:', updateError);
      return false;
    }

    // If no rows were updated, insert a new record
    if (!updateData || updateData.length === 0) {
      const { error: insertError } = await supabase
        .from('user_privacy_settings')
        .insert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error inserting new privacy settings:', insertError);
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