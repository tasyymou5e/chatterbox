/**
 * useSystemMonitoring Hook
 * 
 * @description Custom hook that manages system monitoring state including
 * error statistics, recent errors, and system alerts. Includes circuit breaker
 * pattern, request deduplication, and real-time subscriptions.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { debugLog } from '@/utils/debugLogger';
import type { SystemError, SystemAlert, ErrorStatistics } from '@/types/systemHealth';
import type { AuthDebugInfo, CircuitBreakerState, CallFrequencyTracker } from '@/types/logs';

// Debounce utility
const debounce = <T extends (...args: unknown[]) => void>(func: T, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Configuration constants
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_BASE_TIMEOUT = 30000;
const MAX_REFRESH_FREQUENCY = 5;
const REFRESH_COOLDOWN = 10000;
const DEBOUNCE_TIME = 5000;

export interface UseSystemMonitoringResult {
  errors: SystemError[];
  statistics: ErrorStatistics | null;
  alerts: SystemAlert[];
  loading: boolean;
  authDebugInfo: AuthDebugInfo | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  isCircuitBreakerOpen: () => boolean;
  refreshData: () => Promise<void>;
  resolveError: (errorId: string) => Promise<void>;
  resolveAllErrors: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resetCircuitBreaker: () => void;
  circuitBreakerState: CircuitBreakerState;
}

export const useSystemMonitoring = (): UseSystemMonitoringResult => {
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [statistics, setStatistics] = useState<ErrorStatistics | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [authDebugInfo, setAuthDebugInfo] = useState<AuthDebugInfo | null>(null);

  // Circuit breaker state
  const circuitBreakerRef = useRef<CircuitBreakerState>({
    consecutiveFailures: 0,
    lastFailureTime: 0,
    isCircuitOpen: false,
    nextRetryTime: 0,
    backoffMultiplier: 1
  });

  // Request deduplication tracking
  const activeRequestsRef = useRef(new Set<string>());
  
  // Loop detection tracking
  const callFrequencyRef = useRef<CallFrequencyTracker>({
    lastRefresh: 0,
    refreshCount: 0,
    windowStart: Date.now()
  });
  
  const lastRefreshTimeRef = useRef(0);
  const refreshDataRef = useRef<() => Promise<void>>();

  const { toast } = useToast();
  const { user, session, isAdmin, loading: isAuthenticating } = useAdminAuth();
  const isAuthenticated = !!user && isAdmin;

  const isCircuitBreakerOpen = useCallback(() => {
    const state = circuitBreakerRef.current;
    if (!state.isCircuitOpen) return false;
    
    const now = Date.now();
    if (now > state.nextRetryTime) {
      debugLog.info('useSystemMonitoring', 'Circuit breaker reset after timeout');
      circuitBreakerRef.current = {
        consecutiveFailures: 0,
        lastFailureTime: 0,
        isCircuitOpen: false,
        nextRetryTime: 0,
        backoffMultiplier: 1
      };
      return false;
    }
    return true;
  }, []);

  const recordFailure = useCallback(() => {
    const now = Date.now();
    const state = circuitBreakerRef.current;
    const newFailureCount = state.consecutiveFailures + 1;
    const newBackoffMultiplier = Math.min(state.backoffMultiplier * 2, 8);
    const timeout = CIRCUIT_BREAKER_BASE_TIMEOUT * newBackoffMultiplier;
    
    circuitBreakerRef.current = {
      consecutiveFailures: newFailureCount,
      lastFailureTime: now,
      isCircuitOpen: newFailureCount >= CIRCUIT_BREAKER_THRESHOLD,
      nextRetryTime: now + timeout,
      backoffMultiplier: newBackoffMultiplier
    };
    
    if (newFailureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      toast({
        title: 'System Monitoring Disabled',
        description: `Too many consecutive failures. Monitoring will resume in ${timeout / 1000} seconds.`,
        variant: 'destructive',
      });
    }
  }, [toast]);

  const recordSuccess = useCallback(() => {
    circuitBreakerRef.current = {
      consecutiveFailures: 0,
      lastFailureTime: 0,
      isCircuitOpen: false,
      nextRetryTime: 0,
      backoffMultiplier: 1
    };
  }, []);

  const resetCircuitBreaker = useCallback(() => {
    circuitBreakerRef.current = {
      consecutiveFailures: 0,
      lastFailureTime: 0,
      isCircuitOpen: false,
      nextRetryTime: 0,
      backoffMultiplier: 1
    };
  }, []);

  const fetchErrorStatistics = useCallback(async () => {
    const requestId = 'error-statistics';
    if (isCircuitBreakerOpen() || activeRequestsRef.current.has(requestId)) return;

    try {
      activeRequestsRef.current.add(requestId);
      const { data, error } = await supabase.rpc('get_error_statistics', { days_back: 7 });
      if (error) throw error;
      setStatistics(data[0] || null);
      recordSuccess();
    } catch (error) {
      debugLog.error('useSystemMonitoring', 'Error fetching statistics', error);
      recordFailure();
    } finally {
      activeRequestsRef.current.delete(requestId);
    }
  }, [isCircuitBreakerOpen, recordSuccess, recordFailure]);

  const fetchRecentErrors = useCallback(async () => {
    const requestId = 'recent-errors';
    if (isCircuitBreakerOpen() || activeRequestsRef.current.has(requestId)) return;

    try {
      activeRequestsRef.current.add(requestId);
      const { data, error } = await supabase
        .from('system_errors')
        .select('id, error_type, message, stack_trace, component_name, route_path, severity, user_id, session_id, browser_info, device_info, metadata, resolved, resolved_at, resolved_by, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setErrors((data || []).map(err => ({
        ...err,
        severity: err.severity as 'critical' | 'high' | 'medium' | 'low',
        browser_info: err.browser_info && typeof err.browser_info === 'object' 
          ? err.browser_info as Record<string, unknown>
          : undefined,
        device_info: err.device_info && typeof err.device_info === 'object' 
          ? err.device_info as Record<string, unknown>
          : undefined,
        metadata: err.metadata && typeof err.metadata === 'object' 
          ? err.metadata as Record<string, unknown>
          : undefined,
      })));
      recordSuccess();
    } catch (error) {
      debugLog.error('useSystemMonitoring', 'Error fetching recent errors', error);
      recordFailure();
    } finally {
      activeRequestsRef.current.delete(requestId);
    }
  }, [isCircuitBreakerOpen, recordSuccess, recordFailure]);

  const fetchSystemAlerts = useCallback(async () => {
    const requestId = 'system-alerts';
    if (isCircuitBreakerOpen() || activeRequestsRef.current.has(requestId)) return;

    try {
      activeRequestsRef.current.add(requestId);
      const { data, error } = await supabase
        .from('system_alerts')
        .select('id, alert_type, title, description, severity, triggered_by, metadata, resolved, resolved_at, acknowledged, acknowledged_at, acknowledged_by, created_at, updated_at')
        .eq('resolved', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAlerts((data || []).map(alert => ({
        ...alert,
        severity: alert.severity as 'critical' | 'high' | 'medium' | 'low',
        metadata: (typeof alert.metadata === 'object' && alert.metadata !== null) 
          ? alert.metadata as Record<string, unknown>
          : {}
      })));
      recordSuccess();
    } catch (error) {
      debugLog.error('useSystemMonitoring', 'Error fetching alerts', error);
      recordFailure();
    } finally {
      activeRequestsRef.current.delete(requestId);
    }
  }, [isCircuitBreakerOpen, recordSuccess, recordFailure]);

  const stableRefreshData = useCallback(async () => {
    if (isCircuitBreakerOpen() || !isAuthenticated) return;
    
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < REFRESH_COOLDOWN) return;
    
    const callTracker = callFrequencyRef.current;
    if (now - callTracker.windowStart > 60000) {
      callTracker.windowStart = now;
      callTracker.refreshCount = 0;
    }
    
    callTracker.refreshCount++;
    if (callTracker.refreshCount > MAX_REFRESH_FREQUENCY) {
      toast({
        title: 'System Protection',
        description: 'Too many refresh attempts. Please wait a moment.',
        variant: 'destructive',
      });
      return;
    }
    
    lastRefreshTimeRef.current = now;
    
    try {
      setLoading(true);
      await Promise.all([
        fetchErrorStatistics(),
        fetchRecentErrors(),
        fetchSystemAlerts()
      ]);
    } catch (error) {
      debugLog.error('useSystemMonitoring', 'Error refreshing data', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, fetchErrorStatistics, fetchRecentErrors, fetchSystemAlerts, isCircuitBreakerOpen, toast]);

  refreshDataRef.current = stableRefreshData;

  const resolveError = useCallback(async (errorId: string) => {
    try {
      const { error } = await supabase.rpc('resolve_system_error', { error_id: errorId });
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Error marked as resolved' });
      await stableRefreshData();
    } catch (error) {
      console.error('Failed to resolve error:', error);
      toast({ title: 'Error', description: 'Failed to resolve error', variant: 'destructive' });
    }
  }, [stableRefreshData, toast]);

  const resolveAllErrors = useCallback(async () => {
    const unresolvedIds = errors.filter(e => !e.resolved).map(e => e.id);
    if (unresolvedIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('system_errors')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .in('id', unresolvedIds);

      if (error) throw error;

      toast({ title: 'Success', description: `Resolved ${unresolvedIds.length} errors` });
      await stableRefreshData();
    } catch (error) {
      console.error('Failed to resolve all errors:', error);
      toast({ title: 'Error', description: 'Failed to resolve errors', variant: 'destructive' });
    }
  }, [errors, stableRefreshData, toast]);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('system_alerts')
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq('id', alertId);
      
      if (error) throw error;
      toast({ title: 'Success', description: 'Alert acknowledged' });
      await stableRefreshData();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      toast({ title: 'Error', description: 'Failed to acknowledge alert', variant: 'destructive' });
    }
  }, [stableRefreshData, toast]);

  // Set up real-time subscriptions
  useEffect(() => {
    let mounted = true;
    let periodicRefreshInterval: NodeJS.Timeout;
    let errorChannel: ReturnType<typeof supabase.channel>;
    let alertChannel: ReturnType<typeof supabase.channel>;

    const initializeData = async () => {
      if (!mounted || isAuthenticating || !isAuthenticated) return;
      
      // Set auth debug info
      setAuthDebugInfo({
        hasUser: !!user,
        hasSession: !!session,
        userId: user?.id,
        userEmail: user?.email,
        isAdmin,
        authUid: session?.user?.id || null,
        status: 'connected'
      });
      
      await refreshDataRef.current?.();
    };

    const setupRealtimeSubscriptions = () => {
      if (!isAuthenticated) return;

      const debouncedRefresh = debounce(() => {
        if (!mounted || isCircuitBreakerOpen()) return;
        const now = Date.now();
        if (now - lastRefreshTimeRef.current < REFRESH_COOLDOWN) return;
        refreshDataRef.current?.();
      }, DEBOUNCE_TIME);

      errorChannel = supabase
        .channel('system_errors_monitoring')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'system_errors' }, debouncedRefresh)
        .subscribe();

      alertChannel = supabase
        .channel('system_alerts_monitoring')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'system_alerts' }, debouncedRefresh)
        .subscribe();
    };

    initializeData();
    setupRealtimeSubscriptions();

    periodicRefreshInterval = setInterval(() => {
      if (mounted && !isCircuitBreakerOpen()) {
        refreshDataRef.current?.();
      }
    }, 120000);

    return () => {
      mounted = false;
      if (periodicRefreshInterval) clearInterval(periodicRefreshInterval);
      if (errorChannel) supabase.removeChannel(errorChannel);
      if (alertChannel) supabase.removeChannel(alertChannel);
      activeRequestsRef.current.clear();
    };
  }, [isAuthenticating, isAuthenticated, user, session, isAdmin, isCircuitBreakerOpen]);

  return {
    errors,
    statistics,
    alerts,
    loading,
    authDebugInfo,
    isAuthenticated,
    isAuthenticating,
    isCircuitBreakerOpen,
    refreshData: stableRefreshData,
    resolveError,
    resolveAllErrors,
    acknowledgeAlert,
    resetCircuitBreaker,
    circuitBreakerState: circuitBreakerRef.current
  };
};
