/**
 * Auth Role Store
 * 
 * @description Manages user role state and role-checking operations.
 * Separated from main auth store for better maintainability and focused responsibility.
 * 
 * @module authRoleStore
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { isAdminRole } from '@/types/auth';
import { secureLog } from '@/utils/secureLogging';

/**
 * Auth role state interface.
 */
interface AuthRoleState {
  // State
  userRole: string | null;
  isAdmin: boolean;
  isCheckingRole: boolean;
  
  // Actions
  fetchUserRole: (userId: string) => Promise<string | null>;
  checkAdminRole: (userId: string) => Promise<boolean>;
  setUserRole: (role: string | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setIsCheckingRole: (checking: boolean) => void;
  clearRoles: () => void;
}

export const useAuthRoleStore = create<AuthRoleState>()(
  devtools(
    (set) => ({
      // Initial state
      userRole: null,
      isAdmin: false,
      isCheckingRole: false,

      // State setters
      setUserRole: (userRole) => set({ userRole }),
      setIsAdmin: (isAdmin) => set({ isAdmin }),
      setIsCheckingRole: (isCheckingRole) => set({ isCheckingRole }),
      
      /**
       * Clear all role state - used on logout
       */
      clearRoles: () => set({
        userRole: null,
        isAdmin: false,
        isCheckingRole: false,
      }),

      /**
       * Fetches the highest-priority role for a user.
       * 
       * @description Uses single RPC call to get_primary_role for efficiency.
       * Returns highest priority role: admin > read_only > parent > child.
       */
      fetchUserRole: async (userId: string): Promise<string | null> => {
        try {
          set({ isCheckingRole: true });
          
          const { data, error } = await supabase.rpc('get_primary_role', { 
            _user_id: userId 
          });
          
          if (error) {
            secureLog.error('Error fetching role', error, 'AuthRoleStore');
            set({ isCheckingRole: false });
            return null;
          }
          
          const role = data as string | null;
          const hasAdminAccess = isAdminRole(role);
          
          set({ 
            userRole: role, 
            isAdmin: hasAdminAccess,
            isCheckingRole: false 
          });
          
          return role;
        } catch (error) {
          secureLog.error('Error in fetchUserRole', error, 'AuthRoleStore');
          set({ isCheckingRole: false });
          return null;
        }
      },

      /**
       * Checks if a user has admin privileges.
       * 
       * @description Verifies if user has either 'admin' or 'read_only' role,
       * both of which grant access to the admin dashboard.
       */
      checkAdminRole: async (userId: string): Promise<boolean> => {
        try {
          set({ isCheckingRole: true });
          
          const { data: role, error } = await supabase.rpc('get_primary_role', {
            _user_id: userId
          });

          if (error) {
            secureLog.warn('Error checking admin role', error, 'AuthRoleStore');
            set({ isCheckingRole: false });
            return false;
          }

          const hasAdminAccess = role === 'admin' || role === 'read_only';
          set({ 
            isAdmin: hasAdminAccess,
            userRole: role as string | null,
            isCheckingRole: false 
          });
          
          return hasAdminAccess;
        } catch (error) {
          secureLog.error('Error in checkAdminRole', error, 'AuthRoleStore');
          set({ isCheckingRole: false });
          return false;
        }
      },
    }),
    { name: 'AuthRoleStore' }
  )
);
