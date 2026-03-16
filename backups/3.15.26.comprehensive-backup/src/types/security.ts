/**
 * Security-related type definitions
 */

export interface ThreatIndicator {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  event_details: Record<string, unknown>;
  timestamp?: string;
  user_id?: string;
  ip_address?: string;
}

export interface SecurityMetrics {
  total_alerts: number;
  rls_violations: number;
  failed_activities: number;
  system_errors: number;
  severity_breakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  top_threat_indicators: ThreatIndicator[];
}

export interface SecurityTest {
  name: string;
  description: string;
  test_type: string;
  severity: string;
  passed: boolean;
  error_message?: string;
  execution_time_ms: number;
}

export interface DeviceInfo {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  colorDepth: number;
  pixelDepth: number;
  cookieEnabled: boolean;
  onlineStatus: boolean;
}

export interface BrowserInfo {
  vendor: string;
  product: string;
  appName: string;
  appVersion: string;
}

/**
 * Navigator with optional vendor property access
 * Use this for type-safe access to navigator.vendor
 */
export function getNavigatorVendor(): string {
  return (navigator as { vendor?: string }).vendor || '';
}

/**
 * Realtime postgres changes configuration
 */
export interface PostgresChangesConfig {
  event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  filter?: string;
}

/**
 * Site settings value type - can be boolean, number, or string
 */
export type SiteSettingValue = boolean | number | string;

/**
 * Family member profile from joined query
 */
export interface FamilyMemberProfile {
  first_name?: string;
  last_name?: string;
  email?: string;
}

/**
 * Audio context type for browser compatibility
 */
export interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}
