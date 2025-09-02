import { useEffect, useCallback } from 'react';
import { useChoreStore } from '@/stores/choreStore';
import { useStoreResult } from '@/hooks/useStoreResult';

interface ChoreCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  autism_friendly_features: any;
  sort_order: number;
  is_active: boolean;
}

interface ChoreTemplate {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  estimated_duration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  base_points: number;
  age_min: number;
  age_max: number;
  autism_accommodations: any;
  instructions: any[];
  sensory_considerations: any;
  is_active: boolean;
}

interface Chore {
  id: string;
  family_id: string;
  template_id: string | null;
  title: string;
  description: string | null;
  category_id: string | null;
  estimated_duration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  base_points: number;
  instructions: any[];
  custom_settings: any;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ChoreAssignment {
  id: string;
  chore_id: string;
  family_id: string;
  assigned_to: string;
  assigned_by: string;
  due_date: string | null;
  recurrence_pattern: any;
  status: 'assigned' | 'in_progress' | 'completed' | 'verified' | 'overdue';
  points_earned: number;
  time_bonus: number;
  streak_bonus: number;
  completion_notes: string | null;
  parent_feedback: string | null;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  chores?: {
    id: string;
    title: string;
    description: string | null;
    estimated_duration: number;
    difficulty: string;
    base_points: number;
    instructions: any[];
    chore_categories?: {
      name: string;
      icon: string | null;
      color: string;
    };
  };
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

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
    createChoreFromTemplate: storeCreateChoreFromTemplate,
    createCustomChore: storeCreateCustomChore,
    assignChore: storeAssignChore,
    bulkAssignChores: storeBulkAssignChores,
    updateAssignmentStatus: storeUpdateAssignmentStatus
  } = useChoreStore();

  const handleResult = useStoreResult();

  // Set family ID and fetch initial data
  useEffect(() => {
    if (familyId) {
      setFamilyId(familyId);
    }
  }, [familyId, setFamilyId]);

  // Wrapper functions with UI feedback
  const createChoreFromTemplate = async (templateId: string, customizations?: Partial<Chore>): Promise<any> => {
    const result = await storeCreateChoreFromTemplate(templateId, customizations);
    return handleResult(result, {
      successTitle: 'Success',
      errorTitle: 'Error creating chore'
    });
  };

  const createCustomChore = async (choreData: Omit<Chore, 'id' | 'created_at' | 'updated_at' | 'family_id' | 'created_by'>): Promise<any> => {
    const result = await storeCreateCustomChore(choreData);
    return handleResult(result, {
      successTitle: 'Success',
      errorTitle: 'Error creating chore'
    });
  };

  const assignChore = async (
    choreId: string,
    assignedTo: string,
    dueDate?: string,
    recurrencePattern?: any
  ): Promise<any> => {
    const result = await storeAssignChore(choreId, assignedTo, dueDate, recurrencePattern);
    return handleResult(result, {
      successTitle: 'Success',
      errorTitle: 'Error assigning chore'
    });
  };

  const bulkAssignChores = async (assignments: Array<{
    choreId: string;
    assignedTo: string;
    dueDate?: string;
    recurrencePattern?: any;
  }>): Promise<any> => {
    const result = await storeBulkAssignChores(assignments);
    return handleResult(result, {
      successTitle: 'Success',
      errorTitle: 'Error assigning chores'
    });
  };

  const updateAssignmentStatus = async (
    assignmentId: string,
    status: ChoreAssignment['status'],
    completionData?: {
      points_earned?: number;
      time_bonus?: number;
      streak_bonus?: number;
      completion_notes?: string;
      parent_feedback?: string;
    }
  ): Promise<any> => {
    const result = await storeUpdateAssignmentStatus(assignmentId, status, completionData);
    return handleResult(result, {
      successTitle: 'Status Updated',
      errorTitle: 'Error updating assignment',
      showSuccess: false // Don't show success toast for status updates
    });
  };

  return {
    // Data
    categories,
    templates,
    chores,
    assignments,
    loading,
    error,

    // Actions
    createChoreFromTemplate,
    createCustomChore,
    assignChore,
    bulkAssignChores,
    updateAssignmentStatus,

    // Refresh
    refetch: useCallback(() => Promise.all([
      fetchCategories(),
      fetchTemplates(), 
      fetchChores(),
      fetchAssignments(),
    ]), [fetchCategories, fetchTemplates, fetchChores, fetchAssignments]),
  };
};