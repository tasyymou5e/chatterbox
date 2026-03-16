// Data Health Score Types

export type HealthGrade = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface DataHealthScore {
  overall_score: number;
  integrity_score: number;
  repair_score: number;
  system_score: number;
  grade: HealthGrade;
  integrity_details: IntegrityBreakdown;
  repair_details: RepairBreakdown;
  system_details: SystemBreakdown;
  factors_impacting: ImpactingFactor[];
  calculated_at: string;
}

export interface IntegrityBreakdown {
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  pending_fixes: number;
  fixed_24h: number;
  last_check_status: 'healthy' | 'issues_found' | 'error' | 'never';
  last_check_time: string | null;
}

export interface RepairBreakdown {
  total_repairs_7d: number;
  successful_repairs_7d: number;
  failed_repairs_7d: number;
  success_rate: number;
  last_repair_time: string | null;
  trending: 'improving' | 'declining' | 'stable';
}

export interface SystemBreakdown {
  services_healthy: number;
  services_degraded: number;
  services_down: number;
  average_uptime: number;
  average_response_time: number;
  error_rate_24h: number;
}

export interface ImpactingFactor {
  id?: string;
  category: 'integrity' | 'repair' | 'system';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact_points: number;
  action?: string;
}

export interface HealthScoreHistoryPoint {
  date: string;
  overall: number;
  integrity: number;
  repair: number;
  system: number;
}

// Color mappings for grades
export const GRADE_COLORS: Record<HealthGrade, string> = {
  excellent: 'text-green-500',
  good: 'text-blue-500',
  fair: 'text-yellow-500',
  poor: 'text-orange-500',
  critical: 'text-red-500'
};

export const GRADE_BG_COLORS: Record<HealthGrade, string> = {
  excellent: 'bg-green-500/10 border-green-500/30',
  good: 'bg-blue-500/10 border-blue-500/30',
  fair: 'bg-yellow-500/10 border-yellow-500/30',
  poor: 'bg-orange-500/10 border-orange-500/30',
  critical: 'bg-red-500/10 border-red-500/30'
};

export const GRADE_FILL_COLORS: Record<HealthGrade, string> = {
  excellent: '#22c55e',
  good: '#3b82f6',
  fair: '#eab308',
  poor: '#f97316',
  critical: '#ef4444'
};

export const GRADE_LABELS: Record<HealthGrade, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  critical: 'Critical'
};

export const GRADE_THRESHOLDS = {
  excellent: 90,
  good: 75,
  fair: 60,
  poor: 40,
  critical: 0
} as const;

// Helper function to determine grade from score
export function getGradeFromScore(score: number): HealthGrade {
  if (score >= GRADE_THRESHOLDS.excellent) return 'excellent';
  if (score >= GRADE_THRESHOLDS.good) return 'good';
  if (score >= GRADE_THRESHOLDS.fair) return 'fair';
  if (score >= GRADE_THRESHOLDS.poor) return 'poor';
  return 'critical';
}
