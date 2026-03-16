/**
 * Types for the Skill Plan system
 */

export interface CatalogItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: string;
  age_group: string;
  estimated_duration_minutes: number | null;
  instructions: unknown;
  tags: string[] | null;
  is_active: boolean | null;
  sort_order: number | null;
  skill_domain: string;
  item_type: string;
  autism_skill_tags: string[];
  clinical_reference: string | null;
  step_by_step_instructions: StepInstruction[] | null;
  pause_checkpoint_enabled: boolean;
  max_duration_minutes: number | null;
}

export interface StepInstruction {
  step: number;
  title: string;
  description: string;
}

export interface SkillPlanSchedule {
  id: string;
  child_id: string;
  family_id: string;
  created_by: string;
  approved_by: string | null;
  schedule_type: 'daily' | 'weekly' | 'monthly';
  plan_name: string;
  plan_items: PlanItem[];
  status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'archived';
  approval_notes: string | null;
  approved_at: string | null;
  start_date: string;
  end_date: string | null;
  assessment_basis_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanItem {
  catalog_item_id: string;
  title: string;
  description: string;
  category: string;
  skill_domain: string;
  item_type: string;
  priority: number;
  day?: number; // for weekly plans (1-7)
  week?: number; // for monthly plans (1-4)
  ai_reasoning?: string;
}

export interface SessionLog {
  id: string;
  child_id: string;
  plan_item_id: string | null;
  catalog_item_id: string | null;
  started_at: string;
  paused_at: string | null;
  resumed_at: string | null;
  completed_at: string | null;
  current_step: number;
  total_steps: number;
  pause_reason: string | null;
  ai_observations: string | null;
  duration_seconds: number;
  completion_status: 'in_progress' | 'paused' | 'completed' | 'skipped';
  score: number | null;
  created_at: string;
  life_skill_catalog?: {
    title: string;
    skill_domain: string;
    item_type: string;
  };
}

export const SKILL_DOMAINS = [
  { value: 'communication', label: 'Communication', color: 'bg-blue-100 text-blue-800' },
  { value: 'social', label: 'Social Skills', color: 'bg-purple-100 text-purple-800' },
  { value: 'sensory', label: 'Sensory Regulation', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'executive_function', label: 'Executive Function', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'daily_living', label: 'Daily Living', color: 'bg-green-100 text-green-800' },
  { value: 'emotional_regulation', label: 'Emotional Regulation', color: 'bg-pink-100 text-pink-800' },
  { value: 'motor_skills', label: 'Motor Skills', color: 'bg-orange-100 text-orange-800' },
  { value: 'academic', label: 'Academic Readiness', color: 'bg-teal-100 text-teal-800' },
] as const;

export const ITEM_TYPES = [
  { value: 'chore', label: 'Chore', icon: '🧹' },
  { value: 'game', label: 'Game', icon: '🎮' },
  { value: 'study', label: 'Study', icon: '📚' },
  { value: 'activity', label: 'Activity', icon: '⭐' },
] as const;

export function getDomainInfo(domain: string) {
  return SKILL_DOMAINS.find(d => d.value === domain) || { value: domain, label: domain, color: 'bg-muted text-muted-foreground' };
}

export function getItemTypeInfo(type: string) {
  return ITEM_TYPES.find(t => t.value === type) || { value: type, label: type, icon: '📋' };
}
