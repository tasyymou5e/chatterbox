import { supabase } from '@/integrations/supabase/client';
import { cError } from '@/utils/conditionalLogger';
import type { ActivityMetadata } from '@/types/interfaces';

// Utility functions for enhanced authentication logging
export const useAuthLogging = () => {
  const getDeviceInfo = () => {
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
  };

  const logActivity = async (
    userId: string,
    activityType: 'login' | 'logout' | 'signup' | 'failed_login' | 'password_reset' | 'session_expired',
    success: boolean = true,
    failureReason?: string,
    metadata: ActivityMetadata = {}
  ) => {
    try {
      const deviceInfo = getDeviceInfo();
      const sessionId = crypto.randomUUID().substring(0, 20);

      await supabase.rpc('log_user_activity', {
        p_user_id: userId,
        p_activity_type: activityType,
        p_device_info: deviceInfo,
        p_session_id: sessionId,
        p_success: success,
        p_failure_reason: failureReason,
        p_metadata: JSON.parse(JSON.stringify({
          ...metadata,
          timestamp: new Date().toISOString(),
          browserInfo: {
            vendor: (navigator as Navigator & { vendor?: string }).vendor || '',
            product: navigator.product || '',
            appName: navigator.appName || '',
            appVersion: navigator.appVersion || ''
          }
        }))
      });

      return sessionId;
    } catch (error) {
      cError('Failed to log activity', error);
      return null;
    }
  };

  const createSession = async (userId: string, familyId?: string) => {
    try {
      const deviceInfo = getDeviceInfo();
      const sessionId = crypto.randomUUID();

      const { data, error } = await supabase.from('user_sessions').insert({
        user_id: userId,
        session_id: sessionId,
        family_id: familyId,
        device_info: deviceInfo,
        user_agent: navigator.userAgent
      }).select().single();

      if (error) {
        cError('Failed to create session', error);
        return null;
      }

      return data;
    } catch (error) {
      cError('Failed to create session', error);
      return null;
    }
  };

  const endSession = async (sessionId: string) => {
    try {
      await supabase.rpc('end_user_session', { session_id: sessionId });
    } catch (error) {
      cError('Failed to end session', error);
    }
  };

  const logFamilyActivity = async (
    familyId: string,
    userId: string,
    memberRole: 'admin' | 'parent' | 'child',
    activityType: string,
    parentUserId?: string,
    activityDetails: ActivityMetadata = {}
  ) => {
    try {
      await supabase.rpc('log_family_activity', {
        p_family_id: familyId,
        p_user_id: userId,
        p_member_role: memberRole,
        p_activity_type: activityType,
        p_parent_user_id: parentUserId,
        p_activity_details: JSON.parse(JSON.stringify({
          ...activityDetails,
          timestamp: new Date().toISOString(),
          deviceInfo: getDeviceInfo()
        }))
      });
    } catch (error) {
      cError('Failed to log family activity', error);
    }
  };

  const getSecuritySummary = async (userId: string, days: number = 7) => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const { data: activities, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (error) {
        cError('Failed to fetch security summary', error);
        return null;
      }

      const summary = {
        totalActivities: activities?.length || 0,
        successfulLogins: activities?.filter(a => a.activity_type === 'login' && a.success).length || 0,
        failedLogins: activities?.filter(a => a.activity_type === 'failed_login').length || 0,
        uniqueDevices: new Set(activities?.map(a => (a.device_info as any)?.platform || 'Unknown')).size,
        lastActivity: activities?.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0],
        securityAlerts: activities?.filter(a => !a.success).length || 0
      };

      return summary;
    } catch (error) {
      cError('Failed to get security summary', error);
      return null;
    }
  };

  return {
    logActivity,
    createSession,
    endSession,
    logFamilyActivity,
    getSecuritySummary,
    getDeviceInfo
  };
};