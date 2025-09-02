import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { 
  choreInputSchema, 
  getCurrentUserId, 
  requireAuth, 
  sanitizeInput,
  createStoreError,
  createStoreSuccess,
  type StoreResult,
  type StoreError
} from '@/services/storeUtils';
import { 
  type InstructionStep,
  type RecurrencePattern,
  type ChoreSettings,
  type AutismFriendlyFeatures,
  type SensoryConsiderations,
  type AutismAccommodations,
  type CompletionData
} from '@/types/chore';
import { type Json, type Database } from '@/integrations/supabase/types';

interface ChoreCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  autism_friendly_features: Json;
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
  autism_accommodations: Json;
  instructions: Json;
  sensory_considerations: Json;
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
  instructions: Json;
  custom_settings: Json;
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
  recurrence_pattern: Json;
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
    instructions: Json;
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

interface ChoreState {
  // State
  categories: ChoreCategory[];
  templates: ChoreTemplate[];
  chores: Chore[];
  assignments: ChoreAssignment[];
  loading: boolean;
  error: StoreError | null;
  familyId: string | null;

  // Actions
  setFamilyId: (familyId: string | null) => void;
  fetchCategories: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  fetchChores: () => Promise<void>;
  fetchAssignments: () => Promise<void>;
  createChoreFromTemplate: (templateId: string, customizations?: Partial<Chore>) => Promise<StoreResult>;
  createCustomChore: (choreData: Omit<Chore, 'id' | 'created_at' | 'updated_at' | 'family_id' | 'created_by'>) => Promise<StoreResult>;
  assignChore: (choreId: string, assignedTo: string, dueDate?: string, recurrencePattern?: Json) => Promise<StoreResult>;
  bulkAssignChores: (assignments: Array<{ choreId: string; assignedTo: string; dueDate?: string; recurrencePattern?: Json; }>) => Promise<StoreResult>;
  updateAssignmentStatus: (assignmentId: string, status: ChoreAssignment['status'], completionData?: CompletionData) => Promise<StoreResult>;
  refetch: () => Promise<void>;
  clearError: () => void;
}

export const useChoreStore = create<ChoreState>()(
  devtools(
    (set, get) => ({
      // Initial state
      categories: [],
      templates: [],
      chores: [],
      assignments: [],
      loading: true,
      error: null,
      familyId: null,

      // Actions
      setFamilyId: (familyId) => {
        set({ familyId });
        if (familyId) {
          get().refetch();
        }
      },

      clearError: () => set({ error: null }),

      fetchCategories: async () => {
        try {
          const { data, error } = await supabase
            .from('chore_categories')
            .select('*')
            .eq('is_active', true)
            .order('sort_order');

          if (error) {
            console.error('Error fetching categories:', error);
            return;
          }

          set({ categories: data || [] });
        } catch (error) {
          console.error('Error fetching categories:', error);
        }
      },

      fetchTemplates: async () => {
        try {
          const { data, error } = await supabase
            .from('chore_templates')
            .select(`
              *,
              chore_categories (
                id,
                name,
                icon,
                color
              )
            `)
            .eq('is_active', true)
            .order('title');

          if (error) {
            console.error('Error fetching templates:', error);
            return;
          }

          set({ templates: (data as unknown as ChoreTemplate[]) || [] });
        } catch (error) {
          console.error('Error fetching templates:', error);
        }
      },

      fetchChores: async () => {
        const { familyId } = get();
        if (!familyId) return;

        try {
          const { data, error } = await supabase
            .from('chores')
            .select(`
              *,
              chore_categories (
                id,
                name,
                icon,
                color
              ),
              chore_templates (
                id,
                title,
                autism_accommodations,
                sensory_considerations
              )
            `)
            .eq('family_id', familyId)
            .eq('is_active', true)
            .order('title');

          if (error) {
            console.error('Error fetching chores:', error);
            return;
          }

          set({ chores: (data as unknown as Chore[]) || [] });
        } catch (error) {
          console.error('Error fetching chores:', error);
        }
      },

      fetchAssignments: async () => {
        const { familyId } = get();
        if (!familyId) return;

        try {
          const { data, error } = await supabase
            .from('chore_assignments')
            .select(`
              *,
              chores (
                id,
                title,
                description,
                estimated_duration,
                difficulty,
                base_points,
                instructions,
                chore_categories (
                  name,
                  icon,
                  color
                )
              ),
              profiles!chore_assignments_assigned_to_fkey (
                id,
                first_name,
                last_name
              )
            `)
            .eq('family_id', familyId)
            .order('assigned_at', { ascending: false });

          if (error) {
            console.error('Error fetching assignments:', error);
            return;
          }

          set({ assignments: (data as unknown as ChoreAssignment[]) || [] });
        } catch (error) {
          console.error('Error fetching assignments:', error);
        }
      },

      createChoreFromTemplate: async (templateId: string, customizations?: Partial<Chore>) => {
        const { familyId, templates, fetchChores } = get();
        if (!familyId) {
          const error = createStoreError('validation', 'Family ID is required');
          set({ error });
          return { success: false, error };
        }

        try {
          const userId = requireAuth();
          
          const template = templates.find(t => t.id === templateId);
          if (!template) {
            const error = createStoreError('validation', 'Template not found');
            set({ error });
            return { success: false, error };
          }

          // Convert strongly typed data to JSON-compatible format for database
          const choreData = {
            family_id: familyId,
            template_id: templateId,
            title: sanitizeInput(customizations?.title || template.title),
            description: customizations?.description ? sanitizeInput(customizations.description) : template.description,
            category_id: customizations?.category_id || template.category_id,
            estimated_duration: customizations?.estimated_duration || template.estimated_duration,
            difficulty: customizations?.difficulty || template.difficulty,
            base_points: customizations?.base_points || template.base_points,
            instructions: (customizations?.instructions as Json) || template.instructions,
            custom_settings: (customizations?.custom_settings as Json) || {},
            created_by: userId,
          };

          // Validate input
          choreInputSchema.parse({
            title: choreData.title,
            description: choreData.description,
            estimated_duration: choreData.estimated_duration,
            difficulty: choreData.difficulty,
            base_points: choreData.base_points,
          });

          const { data, error } = await supabase
            .from('chores')
            .insert(choreData)
            .select()
            .single();

          if (error) {
            console.error('Error creating chore:', error);
            const storeError = createStoreError('network', 'Failed to create chore', error.code, { error });
            set({ error: storeError });
            return { success: false, error: storeError };
          }

          await fetchChores();
          return { success: true, result: createStoreSuccess(data, 'Chore created successfully') };
        } catch (error: unknown) {
          console.error('Error creating chore:', error);
          const storeError = (error as any)?.name === 'ZodError' 
            ? createStoreError('validation', 'Invalid input data', undefined, { validation: (error as any).errors })
            : createStoreError('network', error instanceof Error ? error.message : 'Failed to create chore');
          set({ error: storeError });
          return { success: false, error: storeError };
        }
      },

      createCustomChore: async (choreData: Omit<Chore, 'id' | 'created_at' | 'updated_at' | 'family_id' | 'created_by'>) => {
        const { familyId, fetchChores } = get();
        if (!familyId) {
          const error = createStoreError('validation', 'Family ID is required');
          set({ error });
          return { success: false, error };
        }

        try {
          const userId = requireAuth();

          // Convert strongly typed data to JSON-compatible format for database
          const sanitizedData = {
            ...choreData,
            title: sanitizeInput(choreData.title),
            description: choreData.description ? sanitizeInput(choreData.description) : null,
            instructions: choreData.instructions as Json,
            custom_settings: choreData.custom_settings as Json,
            family_id: familyId,
            created_by: userId,
          };

          // Validate input
          choreInputSchema.parse({
            title: sanitizedData.title,
            description: sanitizedData.description,
            estimated_duration: sanitizedData.estimated_duration,
            difficulty: sanitizedData.difficulty,
            base_points: sanitizedData.base_points,
          });

          const { data, error } = await supabase
            .from('chores')
            .insert(sanitizedData)
            .select()
            .single();

          if (error) {
            console.error('Error creating custom chore:', error);
            const storeError = createStoreError('network', 'Failed to create chore', error.code, { error });
            set({ error: storeError });
            return { success: false, error: storeError };
          }

          await fetchChores();
          return { success: true, result: createStoreSuccess(data, 'Custom chore created successfully') };
        } catch (error: unknown) {
          console.error('Error creating custom chore:', error);
          const storeError = (error as any)?.name === 'ZodError' 
            ? createStoreError('validation', 'Invalid input data', undefined, { validation: (error as any).errors })
            : createStoreError('network', error instanceof Error ? error.message : 'Failed to create chore');
          set({ error: storeError });
          return { success: false, error: storeError };
        }
      },

      assignChore: async (choreId: string, assignedTo: string, dueDate?: string, recurrencePattern?: Json) => {
        const { familyId, fetchAssignments } = get();
        if (!familyId) {
          const error = createStoreError('validation', 'Family ID is required');
          set({ error });
          return { success: false, error };
        }

        try {
          const userId = requireAuth();

          if (!choreId || !assignedTo) {
            const error = createStoreError('validation', 'Chore ID and assigned user are required');
            set({ error });
            return { success: false, error };
          }

          const { data, error } = await supabase
            .from('chore_assignments')
            .insert({
              chore_id: choreId,
              family_id: familyId,
              assigned_to: assignedTo,
              assigned_by: userId,
              due_date: dueDate,
              recurrence_pattern: recurrencePattern || {},
            })
            .select()
            .single();

          if (error) {
            console.error('Error assigning chore:', error);
            const storeError = createStoreError('network', 'Failed to assign chore', error.code, { error });
            set({ error: storeError });
            return { success: false, error: storeError };
          }

          await fetchAssignments();
          return { success: true, result: createStoreSuccess(data, 'Chore assigned successfully') };
        } catch (error: unknown) {
          console.error('Error assigning chore:', error);
          const storeError = createStoreError('network', error instanceof Error ? error.message : 'Failed to assign chore');
          set({ error: storeError });
          return { success: false, error: storeError };
        }
      },

      bulkAssignChores: async (assignments: Array<{ choreId: string; assignedTo: string; dueDate?: string; recurrencePattern?: Json; }>) => {
        const { familyId, fetchAssignments } = get();
        if (!familyId) {
          const error = createStoreError('validation', 'Family ID is required');
          set({ error });
          return { success: false, error };
        }

        try {
          const userId = requireAuth();

          if (!assignments || assignments.length === 0) {
            const error = createStoreError('validation', 'No assignments provided');
            set({ error });
            return { success: false, error };
          }

          const assignmentData = assignments.map(assignment => ({
            chore_id: assignment.choreId,
            family_id: familyId,
            assigned_to: assignment.assignedTo,
            assigned_by: userId,
            due_date: assignment.dueDate,
            recurrence_pattern: assignment.recurrencePattern || {},
          }));

          const { data, error } = await supabase
            .from('chore_assignments')
            .insert(assignmentData)
            .select();

          if (error) {
            console.error('Error bulk assigning chores:', error);
            const storeError = createStoreError('network', 'Failed to assign chores', error.code, { error });
            set({ error: storeError });
            return { success: false, error: storeError };
          }

          await fetchAssignments();
          return { success: true, result: createStoreSuccess(data, `${assignments.length} chores assigned successfully`) };
        } catch (error: unknown) {
          console.error('Error bulk assigning chores:', error);
          const storeError = createStoreError('network', error instanceof Error ? error.message : 'Failed to assign chores');
          set({ error: storeError });
          return { success: false, error: storeError };
        }
      },

      updateAssignmentStatus: async (assignmentId: string, status: ChoreAssignment['status'], completionData?: CompletionData) => {
        const { fetchAssignments } = get();

        try {
          const userId = getCurrentUserId();

          if (!assignmentId) {
            const error = createStoreError('validation', 'Assignment ID is required');
            set({ error });
            return { success: false, error };
          }

          const updateData: Partial<Database['public']['Tables']['chore_assignments']['Update']> = {
            status,
            ...completionData,
          };

          if (completionData?.completion_notes) {
            updateData.completion_notes = sanitizeInput(completionData.completion_notes);
          }
          if (completionData?.parent_feedback) {
            updateData.parent_feedback = sanitizeInput(completionData.parent_feedback);
          }

          if (status === 'completed') {
            updateData.completed_at = new Date().toISOString();
          } else if (status === 'in_progress') {
            updateData.started_at = new Date().toISOString();
          } else if (status === 'verified') {
            updateData.is_verified = true;
            updateData.verified_at = new Date().toISOString();
            updateData.verified_by = userId;
          }

          const { data, error } = await supabase
            .from('chore_assignments')
            .update(updateData)
            .eq('id', assignmentId)
            .select()
            .single();

          if (error) {
            console.error('Error updating assignment:', error);
            const storeError = createStoreError('network', 'Failed to update assignment', error.code, { error });
            set({ error: storeError });
            return { success: false, error: storeError };
          }

          await fetchAssignments();
          return { success: true, result: createStoreSuccess(data, 'Assignment updated successfully') };
        } catch (error: unknown) {
          console.error('Error updating assignment:', error);
          const storeError = createStoreError('network', error instanceof Error ? error.message : 'Failed to update assignment');
          set({ error: storeError });
          return { success: false, error: storeError };
        }
      },

      refetch: async () => {
        set({ loading: true });
        await Promise.all([
          get().fetchCategories(),
          get().fetchTemplates(),
          get().fetchChores(),
          get().fetchAssignments(),
        ]);
        set({ loading: false });
      },
    }),
    { name: 'ChoreStore' }
  )
);