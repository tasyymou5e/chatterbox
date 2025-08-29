import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

interface ChoreState {
  // State
  categories: ChoreCategory[];
  templates: ChoreTemplate[];
  chores: Chore[];
  assignments: ChoreAssignment[];
  loading: boolean;
  familyId: string | null;

  // Actions
  setFamilyId: (familyId: string | null) => void;
  fetchCategories: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  fetchChores: () => Promise<void>;
  fetchAssignments: () => Promise<void>;
  createChoreFromTemplate: (templateId: string, customizations?: Partial<Chore>) => Promise<any>;
  createCustomChore: (choreData: Omit<Chore, 'id' | 'created_at' | 'updated_at' | 'family_id' | 'created_by'>) => Promise<any>;
  assignChore: (choreId: string, assignedTo: string, dueDate?: string, recurrencePattern?: any) => Promise<any>;
  bulkAssignChores: (assignments: Array<{ choreId: string; assignedTo: string; dueDate?: string; recurrencePattern?: any; }>) => Promise<any[]>;
  updateAssignmentStatus: (assignmentId: string, status: ChoreAssignment['status'], completionData?: { points_earned?: number; time_bonus?: number; streak_bonus?: number; completion_notes?: string; parent_feedback?: string; }) => Promise<any>;
  refetch: () => Promise<void>;
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
      familyId: null,

      // Actions
      setFamilyId: (familyId) => {
        set({ familyId });
        if (familyId) {
          get().refetch();
        }
      },

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

          set({ templates: data as any || [] });
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

          set({ chores: data as any || [] });
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

          set({ assignments: data as any || [] });
        } catch (error) {
          console.error('Error fetching assignments:', error);
        }
      },

      createChoreFromTemplate: async (templateId: string, customizations?: Partial<Chore>) => {
        const { familyId, templates, fetchChores } = get();
        if (!familyId) return null;

        // Get user from auth store
        const user = (window as any).__authUser; // Temporary solution
        if (!user) return null;

        const template = templates.find(t => t.id === templateId);
        if (!template) {
          toast({
            title: 'Error',
            description: 'Template not found',
            variant: 'destructive',
          });
          return null;
        }

        const choreData = {
          family_id: familyId,
          template_id: templateId,
          title: customizations?.title || template.title,
          description: customizations?.description || template.description,
          category_id: customizations?.category_id || template.category_id,
          estimated_duration: customizations?.estimated_duration || template.estimated_duration,
          difficulty: customizations?.difficulty || template.difficulty,
          base_points: customizations?.base_points || template.base_points,
          instructions: customizations?.instructions || template.instructions,
          custom_settings: customizations?.custom_settings || {},
          created_by: user.id,
        };

        try {
          const { data, error } = await supabase
            .from('chores')
            .insert(choreData)
            .select()
            .single();

          if (error) {
            console.error('Error creating chore:', error);
            toast({
              title: 'Error',
              description: 'Failed to create chore',
              variant: 'destructive',
            });
            return null;
          }

          await fetchChores();
          
          toast({
            title: 'Success',
            description: 'Chore created successfully',
          });

          return data;
        } catch (error) {
          console.error('Error creating chore:', error);
          return null;
        }
      },

      createCustomChore: async (choreData: Omit<Chore, 'id' | 'created_at' | 'updated_at' | 'family_id' | 'created_by'>) => {
        const { familyId, fetchChores } = get();
        if (!familyId) return null;

        // Get user from auth store
        const user = (window as any).__authUser; // Temporary solution
        if (!user) return null;

        try {
          const { data, error } = await supabase
            .from('chores')
            .insert({
              ...choreData,
              family_id: familyId,
              created_by: user.id,
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating custom chore:', error);
            toast({
              title: 'Error',
              description: 'Failed to create chore',
              variant: 'destructive',
            });
            return null;
          }

          await fetchChores();
          
          toast({
            title: 'Success',
            description: 'Custom chore created successfully',
          });

          return data;
        } catch (error) {
          console.error('Error creating custom chore:', error);
          return null;
        }
      },

      assignChore: async (choreId: string, assignedTo: string, dueDate?: string, recurrencePattern?: any) => {
        const { familyId, fetchAssignments } = get();
        if (!familyId) return null;

        // Get user from auth store
        const user = (window as any).__authUser; // Temporary solution
        if (!user) return null;

        try {
          const { data, error } = await supabase
            .from('chore_assignments')
            .insert({
              chore_id: choreId,
              family_id: familyId,
              assigned_to: assignedTo,
              assigned_by: user.id,
              due_date: dueDate,
              recurrence_pattern: recurrencePattern || {},
            })
            .select()
            .single();

          if (error) {
            console.error('Error assigning chore:', error);
            toast({
              title: 'Error',
              description: 'Failed to assign chore',
              variant: 'destructive',
            });
            return null;
          }

          await fetchAssignments();
          
          toast({
            title: 'Success',
            description: 'Chore assigned successfully',
          });

          return data;
        } catch (error) {
          console.error('Error assigning chore:', error);
          return null;
        }
      },

      bulkAssignChores: async (assignments: Array<{ choreId: string; assignedTo: string; dueDate?: string; recurrencePattern?: any; }>) => {
        const { familyId, fetchAssignments } = get();
        if (!familyId) return [];

        // Get user from auth store
        const user = (window as any).__authUser; // Temporary solution
        if (!user) return [];

        const assignmentData = assignments.map(assignment => ({
          chore_id: assignment.choreId,
          family_id: familyId,
          assigned_to: assignment.assignedTo,
          assigned_by: user.id,
          due_date: assignment.dueDate,
          recurrence_pattern: assignment.recurrencePattern || {},
        }));

        try {
          const { data, error } = await supabase
            .from('chore_assignments')
            .insert(assignmentData)
            .select();

          if (error) {
            console.error('Error bulk assigning chores:', error);
            toast({
              title: 'Error',
              description: 'Failed to assign chores',
              variant: 'destructive',
            });
            return [];
          }

          await fetchAssignments();
          
          toast({
            title: 'Success',
            description: `${assignments.length} chores assigned successfully`,
          });

          return data;
        } catch (error) {
          console.error('Error bulk assigning chores:', error);
          return [];
        }
      },

      updateAssignmentStatus: async (assignmentId: string, status: ChoreAssignment['status'], completionData?: { points_earned?: number; time_bonus?: number; streak_bonus?: number; completion_notes?: string; parent_feedback?: string; }) => {
        const { fetchAssignments } = get();

        // Get user from auth store
        const user = (window as any).__authUser; // Temporary solution

        const updateData: any = {
          status,
          ...completionData,
        };

        if (status === 'completed') {
          updateData.completed_at = new Date().toISOString();
        } else if (status === 'in_progress') {
          updateData.started_at = new Date().toISOString();
        } else if (status === 'verified') {
          updateData.is_verified = true;
          updateData.verified_at = new Date().toISOString();
          updateData.verified_by = user?.id;
        }

        try {
          const { data, error } = await supabase
            .from('chore_assignments')
            .update(updateData)
            .eq('id', assignmentId)
            .select()
            .single();

          if (error) {
            console.error('Error updating assignment:', error);
            toast({
              title: 'Error',
              description: 'Failed to update assignment',
              variant: 'destructive',
            });
            return null;
          }

          await fetchAssignments();
          return data;
        } catch (error) {
          console.error('Error updating assignment:', error);
          return null;
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