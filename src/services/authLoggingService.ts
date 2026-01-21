import { supabase } from '@/integrations/supabase/client';
import { getNavigatorVendor } from '@/types/security';

// Non-hook auth logging service for use in Zustand stores
class AuthLoggingService {
  private getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      cookieEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine
    };
  }

  async logActivity(
    userId: string,
    activityType: 'login' | 'logout' | 'signup' | 'failed_login' | 'password_reset' | 'session_expired',
    success: boolean = true,
    failureReason?: string,
    metadata: Record<string, unknown> = {}
  ): Promise<string | null> {
    try {
      const deviceInfo = this.getDeviceInfo();
      const sessionId = crypto.randomUUID().substring(0, 20);

      await supabase.rpc('log_user_activity', {
        p_user_id: userId,
        p_activity_type: activityType,
        p_device_info: deviceInfo,
        p_session_id: sessionId,
        p_success: success,
        p_failure_reason: failureReason,
        p_metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          browserInfo: {
            vendor: getNavigatorVendor(),
            product: navigator.product || '',
            appName: navigator.appName || '',
            appVersion: navigator.appVersion || ''
          }
        }
      });

      return sessionId;
    } catch (error) {
      console.error('AuthLoggingService - Failed to log activity:', error);
      return null;
    }
  }

  async createSession(userId: string, familyId?: string): Promise<{ id: string; session_id: string; user_id: string } | null> {
    try {
      const deviceInfo = this.getDeviceInfo();
      const sessionId = crypto.randomUUID();

      const { data, error } = await supabase.from('user_sessions').insert({
        user_id: userId,
        session_id: sessionId,
        family_id: familyId,
        device_info: deviceInfo,
        user_agent: navigator.userAgent
      }).select().single();

      if (error) {
        console.error('AuthLoggingService - Failed to create session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('AuthLoggingService - Failed to create session:', error);
      return null;
    }
  }

  async endSession(sessionId: string): Promise<void> {
    try {
      await supabase.rpc('end_user_session', { session_id: sessionId });
    } catch (error) {
      console.error('AuthLoggingService - Failed to end session:', error);
    }
  }

  async logFamilyActivity(
    familyId: string,
    userId: string,
    memberRole: 'admin' | 'parent' | 'child',
    activityType: string,
    parentUserId?: string,
    activityDetails: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      await supabase.rpc('log_family_activity', {
        p_family_id: familyId,
        p_user_id: userId,
        p_member_role: memberRole,
        p_activity_type: activityType,
        p_parent_user_id: parentUserId,
        p_activity_details: {
          ...activityDetails,
          timestamp: new Date().toISOString(),
          deviceInfo: this.getDeviceInfo()
        }
      });
    } catch (error) {
      console.error('AuthLoggingService - Failed to log family activity:', error);
    }
  }
}

// Export singleton instance
export const authLoggingService = new AuthLoggingService();