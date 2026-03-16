/**
 * Edge Function Health Types
 */

export interface EdgeFunctionStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown' | 'checking';
  lastChecked: string | null;
  responseTimeMs: number | null;
  error: string | null;
  hasHealthEndpoint: boolean;
}

export interface EdgeFunctionHealthSummary {
  total: number;
  healthy: number;
  unhealthy: number;
  unknown: number;
  lastVerified: string | null;
}

export interface DeploymentVerificationResult {
  functions: EdgeFunctionStatus[];
  summary: EdgeFunctionHealthSummary;
  verifiedAt: string;
}
