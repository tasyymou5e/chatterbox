/**
 * Type definitions for LLM Failover configuration
 */

export interface LLMFailoverConfig {
  id: string;
  primary_provider_key: string;
  backup_provider_key: string;
  priority: number;
  trigger_on_rate_limit: boolean;
  trigger_on_timeout: boolean;
  trigger_on_error: boolean;
  timeout_threshold_ms: number;
  max_retries_before_failover: number;
  cooldown_seconds: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LLMFailoverEvent {
  id: string;
  config_id: string | null;
  primary_provider: string;
  backup_provider: string;
  trigger_reason: 'rate_limit' | 'timeout' | 'error';
  original_error: string | null;
  backup_success: boolean;
  response_time_ms: number | null;
  created_at: string;
}

export interface LLMProviderStatus {
  provider_key: string;
  is_healthy: boolean;
  last_failure_at: string | null;
  failure_count: number;
  cooldown_until: string | null;
  updated_at: string;
}

export interface FailoverConfigFormData {
  primary_provider_key: string;
  backup_provider_key: string;
  priority: number;
  trigger_on_rate_limit: boolean;
  trigger_on_timeout: boolean;
  trigger_on_error: boolean;
  timeout_threshold_ms: number;
  max_retries_before_failover: number;
  cooldown_seconds: number;
  is_active: boolean;
}

export const initialFailoverConfigFormData: FailoverConfigFormData = {
  primary_provider_key: '',
  backup_provider_key: '',
  priority: 1,
  trigger_on_rate_limit: true,
  trigger_on_timeout: true,
  trigger_on_error: true,
  timeout_threshold_ms: 30000,
  max_retries_before_failover: 2,
  cooldown_seconds: 300,
  is_active: true
};
