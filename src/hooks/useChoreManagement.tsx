// Bridge adapter - migrated to use Zustand store internally
import { useEffect } from 'react';
import { useChoreStore } from '@/stores/choreStore';
import type { RecurrencePattern } from '@/types/chore';

// Re-export interfaces for backward compatibility
export interface ChoreCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  created_at: string;
}

export interface ChoreTemplate {
  id: string;
  title: string;
  description?: string;
  category_id: string;
  estimated_duration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  instructions?: string;
  age_min?: number;
  age_max?: number;
  recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface Chore {
  id: string;
  title: string;
  description?: string;
  category_id: string;
  family_id: string;
  created_by: string;
  estimated_duration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  instructions?: string;
  recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  is_template: boolean;
  template_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ChoreAssignment {
  id: string;
  chore_id: string;
  family_id: string;
  assigned_to: string;
  assigned_by: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'skipped';
  completed_at?: string;
  started_at?: string;
  points_earned?: number;
  time_bonus?: number;
  streak_bonus?: number;
  completion_notes?: string;
  parent_feedback?: string;
  recurrence_pattern?: RecurrencePattern;
  next_due_date?: string;
  created_at: string;
  updated_at: string;
}

// Bridge adapter hook that uses Zustand store internally
export const useChoreManagement = (familyId?: string) => {
  const {
    categories,
    templates,
    chores,
    assignments,
    loading,
    error,
    setFamilyId,
    fetchCategories,
    fetchTemplates,
    fetchChores,
    fetchAssignments,
    createChoreFromTemplate,
    createCustomChore,
    assignChore,
    bulkAssignChores,
    updateAssignmentStatus
  } = useChoreStore();

  // Set family ID and fetch initial data
  useEffect(() => {
    if (familyId) {
      setFamilyId(familyId);
    }
  }, [familyId, setFamilyId]);

  return {
    categories,
    templates,
    chores,
    assignments,
    loading,
    error,
    createChoreFromTemplate,
    createCustomChore,
    assignChore,
    bulkAssignChores,
    updateAssignmentStatus
  };
};