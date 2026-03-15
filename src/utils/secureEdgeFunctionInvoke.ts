/**
 * Secure Edge Function Invoke Utility
 * 
 * Provides automatic session refresh before edge function calls
 * to prevent intermittent 401 failures from near-expiry tokens.
 */

import { supabase } from '@/integrations/supabase/client';
import { cLog } from '@/utils/wideLogger';

export interface InvokeOptions {
  refreshThresholdMinutes?: number;
  skipAuth?: boolean;
}

export interface InvokeResult<T> {
  data: T | null;
  error: Error | null;
}

const DEFAULT_REFRESH_THRESHOLD_MINUTES = 5;

/**
 * Parse JWT to extract expiry timestamp (without validation)
 */
function parseJwtExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if token should be refreshed based on expiry threshold
 */
function shouldRefreshToken(token: string, thresholdMinutes: number): boolean {
  const exp = parseJwtExpiry(token);
  if (!exp) return false;
  
  const nowSeconds = Math.floor(Date.now() / 1000);
  const timeToExpirySeconds = exp - nowSeconds;
  const thresholdSeconds = thresholdMinutes * 60;
  
  return timeToExpirySeconds < thresholdSeconds;
}

/**
 * Get time remaining until token expiry in human-readable format
 */
function getTokenTimeRemaining(token: string): string {
  const exp = parseJwtExpiry(token);
  if (!exp) return 'unknown';
  
  const nowSeconds = Math.floor(Date.now() / 1000);
  const remainingSeconds = exp - nowSeconds;
  
  if (remainingSeconds <= 0) return 'expired';
  if (remainingSeconds < 60) return `${remainingSeconds}s`;
  if (remainingSeconds < 3600) return `${Math.floor(remainingSeconds / 60)}m`;
  return `${Math.floor(remainingSeconds / 3600)}h ${Math.floor((remainingSeconds % 3600) / 60)}m`;
}

/**
 * Invoke an edge function with automatic session refresh
 * 
 * @param functionName - Name of the edge function to invoke
 * @param body - Request body to send
 * @param options - Optional configuration
 * @returns Result with data or error
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown>,
  options: InvokeOptions = {}
): Promise<InvokeResult<T>> {
  const { 
    refreshThresholdMinutes = DEFAULT_REFRESH_THRESHOLD_MINUTES,
    skipAuth = false 
  } = options;

  const logPrefix = `[SecureInvoke:${functionName}]`;

  try {
    // Skip auth handling for public endpoints
    if (skipAuth) {
      cLog(`${logPrefix} Skipping auth (public endpoint)`);
      const { data, error } = await supabase.functions.invoke(functionName, { body });
      return { data: data as T, error: error ? new Error(error.message) : null };
    }

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      cLog(`${logPrefix} Session error:`, sessionError.message);
      return { data: null, error: new Error(`Session error: ${sessionError.message}`) };
    }

    if (!session?.access_token) {
      cLog(`${logPrefix} No active session`);
      return { data: null, error: new Error('No active session. Please log in again.') };
    }

    let accessToken = session.access_token;
    const timeRemaining = getTokenTimeRemaining(accessToken);
    cLog(`${logPrefix} Token expires in: ${timeRemaining}`);

    // Proactively refresh if token expires soon
    if (shouldRefreshToken(accessToken, refreshThresholdMinutes)) {
      cLog(`${logPrefix} Token expires soon, refreshing...`);
      
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        cLog(`${logPrefix} Refresh failed:`, refreshError.message);
        // Continue with existing token - it might still work
      } else if (refreshData.session?.access_token) {
        accessToken = refreshData.session.access_token;
        const newTimeRemaining = getTokenTimeRemaining(accessToken);
        cLog(`${logPrefix} Token refreshed, new expiry: ${newTimeRemaining}`);
      }
    }

    // Invoke with explicit Authorization header
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const duration = Date.now() - startTime;

    if (error) {
      cLog(`${logPrefix} Error (${duration}ms):`, error.message);
      return { data: null, error: new Error(error.message) };
    }

    cLog(`${logPrefix} Success (${duration}ms)`);
    return { data: data as T, error: null };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    cLog(`${logPrefix} Unexpected error:`, message);
    return { data: null, error: new Error(message) };
  }
}

/**
 * Invoke edge function with retry logic and automatic session refresh
 */
export async function invokeEdgeFunctionWithRetry<T = unknown>(
  functionName: string,
  body: Record<string, unknown>,
  options: InvokeOptions & {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: unknown, nextDelayMs: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    onRetry,
    ...invokeOptions
  } = options;

  let lastError: Error | null = null;
  let currentDelay = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { data, error } = await invokeEdgeFunction<T>(functionName, body, invokeOptions);
    
    if (!error && data !== null) {
      return data;
    }

    lastError = error;

    if (attempt === maxRetries) {
      break;
    }

    const nextDelay = Math.min(currentDelay, maxDelayMs);
    
    if (onRetry) {
      onRetry(attempt, error, nextDelay);
    }

    cLog(`[SecureInvoke:${functionName}] Retry ${attempt}/${maxRetries} in ${nextDelay}ms`);
    await new Promise(resolve => setTimeout(resolve, nextDelay));
    
    currentDelay *= backoffMultiplier;
  }

  throw lastError ?? new Error('All retry attempts failed');
}
