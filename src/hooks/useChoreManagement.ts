// Bridge adapter - migrated to use Zustand store internally
import { useEffect, useCallback } from 'react';
import { useChoreStore } from '@/stores/choreStore';
import { useStoreResult } from '@/hooks/useStoreResult';
import { useUIStore } from '@/stores/uiStore';
import { withRetry } from '@/services/storeUtils';

// Re-export interfaces for backward compatibility - using any to avoid type conflicts
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
  base_points: number;
  instructions?: any[];
  age_min?: number;
  age_max?: number;
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
  base_points: number;
  instructions?: any[];
  is_active: boolean;
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
  status: 'assigned' | 'in_progress' | 'completed' | 'verified' | 'overdue';
  completed_at?: string;
  started_at?: string;
  points_earned?: number;
  time_bonus?: number;
  streak_bonus?: number;
  completion_notes?: string;
  parent_feedback?: string;
  created_at: string;
  updated_at: string;
}

// Individual loading states interface
interface ChoreLoadingStates {
  createChore: boolean;
  assignChore: boolean;
  bulkAssign: boolean;
  updateStatus: boolean;
  fetchCategories: boolean;
  fetchTemplates: boolean;
  fetchChores: boolean;
  fetchAssignments: boolean;
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
    createChoreFromTemplate: storeCreateChoreFromTemplate,
    createCustomChore: storeCreateCustomChore,
    assignChore: storeAssignChore,
    bulkAssignChores: storeBulkAssignChores,
    updateAssignmentStatus: storeUpdateAssignmentStatus
  } = useChoreStore();

  const { setLoading, getLoading } = useUIStore();
  const handleResult = useStoreResult();

  // Generate loading keys for this family
  const getLoadingKey = useCallback((operation: string) => 
    `chore-${operation}-${familyId || 'global'}`, [familyId]);

  // Individual loading state getters
  const loadingStates: ChoreLoadingStates = {
    createChore: getLoading(getLoadingKey('create')),
    assignChore: getLoading(getLoadingKey('assign')),
    bulkAssign: getLoading(getLoadingKey('bulk-assign')),
    updateStatus: getLoading(getLoadingKey('update-status')),
    fetchCategories: getLoading(getLoadingKey('fetch-categories')),
    fetchTemplates: getLoading(getLoadingKey('fetch-templates')),
    fetchChores: getLoading(getLoadingKey('fetch-chores')),
    fetchAssignments: getLoading(getLoadingKey('fetch-assignments')),
  };

  // Set family ID and fetch initial data
  useEffect(() => {
    if (familyId) {
      setFamilyId(familyId);
    }
  }, [familyId, setFamilyId]);

  // Enhanced wrapper functions with individual loading states and retry logic
  const createChoreFromTemplate = async (templateId: string, customizations?: Partial<Chore>): Promise<any> => {
    const loadingKey = getLoadingKey('create');
    setLoading(loadingKey, true);
    
    try {
      const result = await withRetry(
        () => storeCreateChoreFromTemplate(templateId, customizations as any),
        { maxRetries: 2 }
      );
      
      return handleResult(result, {
        successTitle: 'Chore Created',
        errorTitle: 'Failed to create chore from template'
      });
    } finally {
      setLoading(loadingKey, false);
    }
  };

  const createCustomChore = async (choreData: Omit<Chore, 'id' | 'created_at' | 'updated_at' | 'family_id' | 'created_by'>): Promise<any> => {
    const loadingKey = getLoadingKey('create');
    setLoading(loadingKey, true);
    
    try {
      const result = await withRetry(
        () => storeCreateCustomChore(choreData as any),
        { maxRetries: 2 }
      );
      
      return handleResult(result, {
        successTitle: 'Custom Chore Created',
        errorTitle: 'Failed to create custom chore'
      });
    } finally {
      setLoading(loadingKey, false);
    }
  };

  const assignChore = async (
    choreId: string,
    assignedTo: string,
    dueDate?: string,
    recurrencePattern?: any
  ): Promise<any> => {
    const loadingKey = getLoadingKey('assign');
    setLoading(loadingKey, true);
    
    try {
      const result = await withRetry(
        () => storeAssignChore(choreId, assignedTo, dueDate, recurrencePattern),
        { maxRetries: 2 }
      );
      
      return handleResult(result, {
        successTitle: 'Chore Assigned',
        errorTitle: 'Failed to assign chore'
      });
    } finally {
      setLoading(loadingKey, false);
    }
  };

  const bulkAssignChores = async (assignments: Array<{
    choreId: string;
    assignedTo: string;
    dueDate?: string;
    recurrencePattern?: any;
  }>): Promise<any> => {
    const loadingKey = getLoadingKey('bulk-assign');
    setLoading(loadingKey, true);
    
    try {
      const result = await withRetry(
        () => storeBulkAssignChores(assignments),
        { maxRetries: 2 }
      );
      
      return handleResult(result, {
        successTitle: `${assignments.length} Chores Assigned`,
        errorTitle: 'Failed to bulk assign chores'
      });
    } finally {
      setLoading(loadingKey, false);
    }
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
    const loadingKey = getLoadingKey('update-status');
    setLoading(loadingKey, true);
    
    try {
      const result = await withRetry(
        () => storeUpdateAssignmentStatus(assignmentId, status as any, completionData),
        { maxRetries: 2 }
      );
      
      return handleResult(result, {
        successTitle: 'Status Updated',
        errorTitle: 'Failed to update assignment status'
      });
    } finally {
      setLoading(loadingKey, false);
    }
  };

  // Retry functions for failed operations
  const retryCreateChore = useCallback(async (templateId?: string, choreData?: any, customizations?: any) => {
    if (templateId) {
      return createChoreFromTemplate(templateId, customizations);
    } else {
      return createCustomChore(choreData);
    }
  }, []);

  const retryAssignChore = useCallback(async (choreId: string, assignedTo: string, dueDate?: string, recurrencePattern?: any) => {
    return assignChore(choreId, assignedTo, dueDate, recurrencePattern);
  }, []);

  const retryBulkAssign = useCallback(async (assignments: Array<any>) => {
    return bulkAssignChores(assignments);
  }, []);

  const retryUpdateStatus = useCallback(async (assignmentId: string, status: any, completionData?: any) => {
    return updateAssignmentStatus(assignmentId, status, completionData);
  }, []);

  return {
    // Data
    categories,
    templates,
    chores,
    assignments,
    
    // Global loading/error (for backward compatibility)
    loading,
    error,
    
    // Individual loading states
    loadingStates,
    isCreatingChore: loadingStates.createChore,
    isAssigningChore: loadingStates.assignChore,
    isBulkAssigning: loadingStates.bulkAssign,
    isUpdatingStatus: loadingStates.updateStatus,
    
    // Core operations with enhanced error handling
    createChoreFromTemplate,
    createCustomChore,
    assignChore,
    bulkAssignChores,
    updateAssignmentStatus,
    
    // Retry functions
    retryCreateChore,
    retryAssignChore,
    retryBulkAssign,
    retryUpdateStatus,

    // Refresh with individual loading states
    refetch: useCallback(() => Promise.all([
      fetchCategories(),
      fetchTemplates(), 
      fetchChores(),
      fetchAssignments(),
    ]), [fetchCategories, fetchTemplates, fetchChores, fetchAssignments]),
  };
};