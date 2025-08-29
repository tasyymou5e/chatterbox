import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

interface AdminState {
  // Debug state
  debugMode: boolean;
  debugInfo: any;
  
  // Family management
  families: any[];
  selectedFamilyId: string | null;
  
  // User management
  users: any[];
  
  // Content management
  contentItems: any[];
  
  // System monitoring
  systemMetrics: any;
  
  // Loading states
  loadingFamilies: boolean;
  loadingUsers: boolean;
  loadingContent: boolean;
  loadingMetrics: boolean;

  // Actions
  setDebugMode: (enabled: boolean) => void;
  setDebugInfo: (info: any) => void;
  setSelectedFamilyId: (familyId: string | null) => void;
  
  // Data fetching
  fetchFamilies: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchContentItems: () => Promise<void>;
  fetchSystemMetrics: () => Promise<void>;
  
  // Family management
  createTestFamily: (familyData: any) => Promise<any>;
  deleteFamily: (familyId: string) => Promise<boolean>;
  updateFamily: (familyId: string, updates: any) => Promise<any>;
  
  // User management
  createUser: (userData: any) => Promise<any>;
  updateUser: (userId: string, updates: any) => Promise<any>;
  deleteUser: (userId: string) => Promise<boolean>;
  
  // Content management
  createContentItem: (contentData: any) => Promise<any>;
  updateContentItem: (contentId: string, updates: any) => Promise<any>;
  deleteContentItem: (contentId: string) => Promise<boolean>;
}

export const useAdminStore = create<AdminState>()(
  devtools(
    (set, get) => ({
      // Initial state
      debugMode: false,
      debugInfo: null,
      families: [],
      selectedFamilyId: null,
      users: [],
      contentItems: [],
      systemMetrics: null,
      loadingFamilies: false,
      loadingUsers: false,
      loadingContent: false,
      loadingMetrics: false,

      // Debug actions
      setDebugMode: (enabled) => set({ debugMode: enabled }),
      setDebugInfo: (info) => set({ debugInfo: info }),
      setSelectedFamilyId: (familyId) => set({ selectedFamilyId: familyId }),

      // Fetch families
      fetchFamilies: async () => {
        set({ loadingFamilies: true });
        try {
          const { data, error } = await supabase
            .from('families')
            .select(`
              *,
              profiles!families_created_by_fkey (
                id,
                first_name,
                last_name
              )
            `)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching families:', error);
            return;
          }

          set({ families: data || [] });
        } catch (error) {
          console.error('Error fetching families:', error);
        } finally {
          set({ loadingFamilies: false });
        }
      },

      // Fetch users
      fetchUsers: async () => {
        set({ loadingUsers: true });
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select(`
              *,
              user_roles (
                role,
                assigned_at
              ),
              families!family_members_user_id_fkey (
                id,
                name
              )
            `)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching users:', error);
            return;
          }

          set({ users: data || [] });
        } catch (error) {
          console.error('Error fetching users:', error);
        } finally {
          set({ loadingUsers: false });
        }
      },

      // Fetch content items
      fetchContentItems: async () => {
        set({ loadingContent: true });
        try {
          const { data, error } = await supabase
            .from('content_items')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching content items:', error);
            return;
          }

          set({ contentItems: data || [] });
        } catch (error) {
          console.error('Error fetching content items:', error);
        } finally {
          set({ loadingContent: false });
        }
      },

      // Fetch system metrics
      fetchSystemMetrics: async () => {
        set({ loadingMetrics: true });
        try {
          // Mock system metrics for now - would be replaced with actual RPC
          const mockMetrics = {
            totalUsers: 0,
            totalFamilies: 0,
            activeToday: 0,
            systemHealth: 'good'
          };

          set({ systemMetrics: mockMetrics });
        } catch (error) {
          console.error('Error fetching system metrics:', error);
        } finally {
          set({ loadingMetrics: false });
        }
      },

      // Create test family
      createTestFamily: async (familyData: any) => {
        try {
          const { data, error } = await supabase.functions.invoke('create-test-family', {
            body: familyData
          });

          if (error) {
            console.error('Error creating test family:', error);
            return null;
          }

          // Refresh families list
          await get().fetchFamilies();
          return data;
        } catch (error) {
          console.error('Error creating test family:', error);
          return null;
        }
      },

      // Delete family
      deleteFamily: async (familyId: string) => {
        try {
          const { error } = await supabase
            .from('families')
            .delete()
            .eq('id', familyId);

          if (error) {
            console.error('Error deleting family:', error);
            return false;
          }

          // Remove from local state
          set(state => ({
            families: state.families.filter(f => f.id !== familyId)
          }));

          return true;
        } catch (error) {
          console.error('Error deleting family:', error);
          return false;
        }
      },

      // Update family
      updateFamily: async (familyId: string, updates: any) => {
        try {
          const { data, error } = await supabase
            .from('families')
            .update(updates)
            .eq('id', familyId)
            .select()
            .single();

          if (error) {
            console.error('Error updating family:', error);
            return null;
          }

          // Update local state
          set(state => ({
            families: state.families.map(f => f.id === familyId ? { ...f, ...data } : f)
          }));

          return data;
        } catch (error) {
          console.error('Error updating family:', error);
          return null;
        }
      },

      // Create user
      createUser: async (userData: any) => {
        try {
          const { data, error } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            user_metadata: {
              first_name: userData.first_name,
              last_name: userData.last_name,
            }
          });

          if (error) {
            console.error('Error creating user:', error);
            return null;
          }

          // Refresh users list
          await get().fetchUsers();
          return data;
        } catch (error) {
          console.error('Error creating user:', error);
          return null;
        }
      },

      // Update user
      updateUser: async (userId: string, updates: any) => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

          if (error) {
            console.error('Error updating user:', error);
            return null;
          }

          // Update local state
          set(state => ({
            users: state.users.map(u => u.id === userId ? { ...u, ...data } : u)
          }));

          return data;
        } catch (error) {
          console.error('Error updating user:', error);
          return null;
        }
      },

      // Delete user
      deleteUser: async (userId: string) => {
        try {
          const { error } = await supabase.auth.admin.deleteUser(userId);

          if (error) {
            console.error('Error deleting user:', error);
            return false;
          }

          // Remove from local state
          set(state => ({
            users: state.users.filter(u => u.id !== userId)
          }));

          return true;
        } catch (error) {
          console.error('Error deleting user:', error);
          return false;
        }
      },

      // Create content item
      createContentItem: async (contentData: any) => {
        try {
          const { data, error } = await supabase
            .from('content_items')
            .insert(contentData)
            .select()
            .single();

          if (error) {
            console.error('Error creating content item:', error);
            return null;
          }

          // Add to local state
          set(state => ({
            contentItems: [data, ...state.contentItems]
          }));

          return data;
        } catch (error) {
          console.error('Error creating content item:', error);
          return null;
        }
      },

      // Update content item
      updateContentItem: async (contentId: string, updates: any) => {
        try {
          const { data, error } = await supabase
            .from('content_items')
            .update(updates)
            .eq('id', contentId)
            .select()
            .single();

          if (error) {
            console.error('Error updating content item:', error);
            return null;
          }

          // Update local state
          set(state => ({
            contentItems: state.contentItems.map(c => c.id === contentId ? { ...c, ...data } : c)
          }));

          return data;
        } catch (error) {
          console.error('Error updating content item:', error);
          return null;
        }
      },

      // Delete content item
      deleteContentItem: async (contentId: string) => {
        try {
          const { error } = await supabase
            .from('content_items')
            .delete()
            .eq('id', contentId);

          if (error) {
            console.error('Error deleting content item:', error);
            return false;
          }

          // Remove from local state
          set(state => ({
            contentItems: state.contentItems.filter(c => c.id !== contentId)
          }));

          return true;
        } catch (error) {
          console.error('Error deleting content item:', error);
          return false;
        }
      },
    }),
    { name: 'AdminStore' }
  )
);