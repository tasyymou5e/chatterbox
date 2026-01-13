export interface SystemHealthMetric {
  service_name: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time?: number;
  uptime_percentage?: number;
  error_rate?: number;
  metadata?: Record<string, any>;
}

export interface ErrorStatistics {
  total_errors: number;
  critical_errors: number;
  high_errors: number;
  medium_errors: number;
  low_errors: number;
  resolved_errors: number;
  top_error_components: string[];
  error_rate_trend: number[];
}

export interface SystemError {
  id: string;
  error_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  component_name: string | null;
  route_path?: string | null;
  created_at: string;
  resolved: boolean | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  user_id?: string | null;
  session_id?: string | null;
  stack_trace?: string | null;
  browser_info?: Record<string, unknown>;
  device_info?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface SystemAlert {
  id: string;
  alert_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description?: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved: boolean;
  resolved_at?: string;
  created_at: string;
  triggered_by?: string;
  metadata?: Record<string, any>;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime?: number;
  nextRetryTime?: number;
}