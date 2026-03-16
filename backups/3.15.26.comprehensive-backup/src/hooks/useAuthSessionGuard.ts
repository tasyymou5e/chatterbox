/**
 * useAuthSessionGuard
 * 
 * @description Centralized auth session hardening hook providing:
 * 1. Cross-tab session sync via BroadcastChannel
 * 2. Proactive session token refresh before expiry
 * 3. Idle timeout with warning + auto-logout
 * 4. Auth state error recovery (role fetch retry, hung state resolution)
 * 
 * Mount once in AppInitializer. Only active when user is authenticated.
 * 
 * @module useAuthSessionGuard
 */
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthSessionStore } from '@/stores/authSessionStore';
import { useAuthRoleStore } from '@/stores/authRoleStore';
import { useAuthActionsStore } from '@/stores/authActionsStore';
import { secureLog } from '@/utils/wideLogger';
import { toast } from '@/hooks/use-toast';

// ─── Configuration ─────────────────────────────────────────────────────────────
const IDLE_WARNING_MS = 30 * 60 * 1000;      // 30 min — show warning toast
const IDLE_LOGOUT_MS = 35 * 60 * 1000;       // 35 min — auto-logout
const REFRESH_CHECK_INTERVAL_MS = 60_000;     // 1 min
const REFRESH_THRESHOLD_MS = 5 * 60_000;      // 5 min before expiry
const ROLE_RECOVERY_DELAY_MS = 5_000;         // 5 sec
const LOADING_RECOVERY_MS = 10_000;           // 10 sec
const ACTIVITY_THROTTLE_MS = 30_000;          // 30 sec
const MAX_REFRESH_RETRIES = 2;

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const;

// ─── BroadcastChannel message types ────────────────────────────────────────────
interface AuthSyncMessage {
  type: 'SIGNED_OUT' | 'SIGNED_IN';
  userId?: string;
  timestamp: number;
}

const CHANNEL_NAME = 'auth-session-sync';

/**
 * Creates a BroadcastChannel safely (SSR / unsupported browser fallback).
 */
function createChannel(): BroadcastChannel | null {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      return new BroadcastChannel(CHANNEL_NAME);
    }
  } catch {
    secureLog.dev('BroadcastChannel not available');
  }
  return null;
}

/**
 * Broadcasts an auth event to other tabs.
 */
export function broadcastAuthEvent(type: AuthSyncMessage['type'], userId?: string) {
  try {
    const channel = createChannel();
    if (channel) {
      channel.postMessage({ type, userId, timestamp: Date.now() } satisfies AuthSyncMessage);
      channel.close();
    }
  } catch {
    // Silent fail — cross-tab sync is best-effort
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAuthSessionGuard() {
  const navigate = useNavigate();

  // Refs for timers and tracking
  const idleWarningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleLogoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roleRecoveryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRecoveryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());
  const refreshRetriesRef = useRef(0);
  const idleWarningShownRef = useRef(false);
  const mountedRef = useRef(true);

  // ─── Cleanup helper ────────────────────────────────────────────────────────
  const clearAllTimers = useCallback(() => {
    if (idleWarningRef.current) clearTimeout(idleWarningRef.current);
    if (idleLogoutRef.current) clearTimeout(idleLogoutRef.current);
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    if (roleRecoveryRef.current) clearTimeout(roleRecoveryRef.current);
    if (loadingRecoveryRef.current) clearTimeout(loadingRecoveryRef.current);
    idleWarningRef.current = null;
    idleLogoutRef.current = null;
    refreshIntervalRef.current = null;
    roleRecoveryRef.current = null;
    loadingRecoveryRef.current = null;
  }, []);

  // ─── Idle auto-logout ──────────────────────────────────────────────────────
  const performIdleLogout = useCallback(() => {
    if (!mountedRef.current) return;
    const user = useAuthSessionStore.getState().user;
    if (!user) return;

    secureLog.security('idle_auto_logout', { userId: user.id }, 'medium');

    const { emergencyLogout } = useAuthActionsStore.getState();
    emergencyLogout();
    broadcastAuthEvent('SIGNED_OUT');

    toast({
      title: 'Session expired',
      description: 'You were logged out due to inactivity.',
      variant: 'destructive',
    });

    navigate('/auth', { replace: true });
  }, [navigate]);

  const startIdleTimers = useCallback(() => {
    // Clear existing
    if (idleWarningRef.current) clearTimeout(idleWarningRef.current);
    if (idleLogoutRef.current) clearTimeout(idleLogoutRef.current);
    idleWarningShownRef.current = false;

    idleWarningRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      const user = useAuthSessionStore.getState().user;
      if (!user) return;

      idleWarningShownRef.current = true;
      toast({
        title: 'Are you still there?',
        description: 'You will be logged out in 5 minutes due to inactivity.',
      });
    }, IDLE_WARNING_MS);

    idleLogoutRef.current = setTimeout(() => {
      performIdleLogout();
    }, IDLE_LOGOUT_MS);
  }, [performIdleLogout]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Throttle: only process if enough time has passed
    if (now - lastActivityRef.current < ACTIVITY_THROTTLE_MS) return;
    lastActivityRef.current = now;

    const user = useAuthSessionStore.getState().user;
    if (!user) return;

    startIdleTimers();
  }, [startIdleTimers]);

  // ─── 1. Cross-tab sync ────────────────────────────────────────────────────
  useEffect(() => {
    const channel = createChannel();
    if (!channel) return;

    const handleMessage = (event: MessageEvent<AuthSyncMessage>) => {
      const { type, userId } = event.data;

      if (type === 'SIGNED_OUT') {
        secureLog.dev('Cross-tab: received SIGNED_OUT');
        const { emergencyLogout } = useAuthActionsStore.getState();
        emergencyLogout();
        navigate('/auth', { replace: true });
      } else if (type === 'SIGNED_IN') {
        secureLog.dev('Cross-tab: received SIGNED_IN', { userId });
        // Re-fetch session to pick up the new auth state
        supabase.auth.getSession().catch(() => {
          secureLog.warn('Cross-tab: failed to re-fetch session after SIGNED_IN', {}, 'AuthSessionGuard');
        });
      }
    };

    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [navigate]);

  // ─── 2. Proactive session refresh ─────────────────────────────────────────
  useEffect(() => {
    const checkAndRefresh = async () => {
      const { session, user } = useAuthSessionStore.getState();
      if (!session || !user || !session.expires_at) return;

      const expiresAtMs = session.expires_at * 1000;
      const remaining = expiresAtMs - Date.now();

      if (remaining > REFRESH_THRESHOLD_MS) {
        // Token is fine, reset retries
        refreshRetriesRef.current = 0;
        return;
      }

      secureLog.dev('Session nearing expiry, refreshing proactively', {
        minutesRemaining: Math.round(remaining / 60_000),
      });

      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        refreshRetriesRef.current += 1;
        secureLog.warn('Proactive refresh failed', {
          attempt: refreshRetriesRef.current,
          error: error?.message,
        }, 'AuthSessionGuard');

        if (refreshRetriesRef.current >= MAX_REFRESH_RETRIES) {
          secureLog.security('session_refresh_exhausted', { userId: user.id }, 'high');
          const { emergencyLogout } = useAuthActionsStore.getState();
          emergencyLogout();
          broadcastAuthEvent('SIGNED_OUT');

          toast({
            title: 'Session expired',
            description: 'Your session could not be refreshed. Please sign in again.',
            variant: 'destructive',
          });

          // Navigate handled by emergencyLogout clearing state
        }
      } else {
        refreshRetriesRef.current = 0;
        secureLog.dev('Session refreshed proactively');
      }
    };

    refreshIntervalRef.current = setInterval(checkAndRefresh, REFRESH_CHECK_INTERVAL_MS);
    // Also check immediately on mount
    checkAndRefresh();

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, []);

  // ─── 3. Idle timeout with activity tracking ───────────────────────────────
  useEffect(() => {
    const user = useAuthSessionStore.getState().user;
    if (!user) return;

    // Start idle timers
    startIdleTimers();

    // Listen for activity
    ACTIVITY_EVENTS.forEach((event) =>
      document.addEventListener(event, handleActivity, { passive: true })
    );

    // Pause/resume on visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Check if we should have timed out while hidden
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= IDLE_LOGOUT_MS) {
          performIdleLogout();
        } else if (elapsed >= IDLE_WARNING_MS && !idleWarningShownRef.current) {
          idleWarningShownRef.current = true;
          toast({
            title: 'Are you still there?',
            description: 'You will be logged out soon due to inactivity.',
          });
        }
        // Restart timers from now
        handleActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      ACTIVITY_EVENTS.forEach((event) =>
        document.removeEventListener(event, handleActivity)
      );
      document.removeEventListener('visibilitychange', handleVisibility);
      if (idleWarningRef.current) clearTimeout(idleWarningRef.current);
      if (idleLogoutRef.current) clearTimeout(idleLogoutRef.current);
    };
  }, [handleActivity, startIdleTimers, performIdleLogout]);

  // ─── 4. Auth state error recovery ─────────────────────────────────────────

  // 4a. Role recovery: if user exists but role is missing after delay, retry
  useEffect(() => {
    const unsubSession = useAuthSessionStore.subscribe(
      (state) => ({ user: state.user, sessionReady: state.sessionReady }),
      ({ user, sessionReady }) => {
        if (!sessionReady || !user) {
          if (roleRecoveryRef.current) clearTimeout(roleRecoveryRef.current);
          return;
        }

        roleRecoveryRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          const { userRole, isCheckingRole } = useAuthRoleStore.getState();
          const currentUser = useAuthSessionStore.getState().user;

          if (currentUser && !userRole && !isCheckingRole) {
            secureLog.warn('Role missing after delay, retrying fetchUserRole', {
              userId: currentUser.id,
            }, 'AuthSessionGuard');

            useAuthRoleStore.getState().fetchUserRole(currentUser.id).then((role) => {
              if (!role && mountedRef.current) {
                secureLog.warn('Role recovery failed, defaulting to parent', {
                  userId: currentUser.id,
                }, 'AuthSessionGuard');
                useAuthRoleStore.getState().setUserRole('parent');
              }
            }).catch(() => {
              if (mountedRef.current) {
                secureLog.warn('Role recovery errored, defaulting to parent', {}, 'AuthSessionGuard');
                useAuthRoleStore.getState().setUserRole('parent');
              }
            });
          }
        }, ROLE_RECOVERY_DELAY_MS);
      },
      { fireImmediately: true }
    );

    return () => {
      unsubSession();
      if (roleRecoveryRef.current) clearTimeout(roleRecoveryRef.current);
    };
  }, []);

  // 4b. Loading recovery: if loading is stuck for too long, force resolve
  useEffect(() => {
    const unsubLoading = useAuthSessionStore.subscribe(
      (state) => ({ loading: state.loading, sessionReady: state.sessionReady }),
      ({ loading, sessionReady }) => {
        if (loadingRecoveryRef.current) clearTimeout(loadingRecoveryRef.current);

        if (loading && !sessionReady) {
          loadingRecoveryRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            const current = useAuthSessionStore.getState();
            if (current.loading && !current.sessionReady) {
              secureLog.warn('Auth loading stuck, force-resolving', {}, 'AuthSessionGuard');
              current.setLoading(false);
              current.setSessionReady(true);
            }
          }, LOADING_RECOVERY_MS);
        }
      },
      { fireImmediately: true }
    );

    return () => {
      unsubLoading();
      if (loadingRecoveryRef.current) clearTimeout(loadingRecoveryRef.current);
    };
  }, []);

  // ─── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearAllTimers();
    };
  }, [clearAllTimers]);
}
