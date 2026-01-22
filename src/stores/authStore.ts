/**
 * Authentication Store (Facade)
 * 
 * @description Unified facade that composes from the split auth stores.
 * This maintains backward compatibility while the underlying implementation
 * uses focused, single-responsibility stores.
 * 
 * @module authStore
 * 
 * @example
 * // Access auth state
 * const { user, isAdmin, loading } = useAuthStore();
 * 
 * // Perform auth actions
 * const { signIn, signOut } = useAuthStore();
 * await signIn('user@example.com', 'password');
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';
import { useAuthSessionStore } from './authSessionStore';
import { useAuthRoleStore } from './authRoleStore';
import { useAuthActionsStore } from './authActionsStore';
import { type AuthError } from '@/types/auth';

/**
 * Authentication state interface - maintained for backward compatibility.
 */
interface AuthState {
  // State (composed from split stores)
  user: User | null;
  session: Session | null;
  userRole: string | null;
  isAdmin: boolean;
  loading: boolean;
  isCheckingRole: boolean;
  sessionReady: boolean;
  signingOut: boolean;
  isHydrated: boolean;
  
  // Actions (delegated to split stores)
  initialize: () => void;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; user?: User; isAdmin?: boolean }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string, userType?: 'admin' | 'user') => Promise<{ error: AuthError | null }>;
  clearSignOutState: () => void;
  emergencyLogout: () => void;
  fetchUserRole: (userId: string) => Promise<string | null>;
  checkAdminRole: (userId: string) => Promise<boolean>;
  
  // Internal actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setUserRole: (role: string | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setLoading: (loading: boolean) => void;
  setIsCheckingRole: (checking: boolean) => void;
  setSessionReady: (ready: boolean) => void;
}

/**
 * Unified auth store facade.
 * 
 * This store subscribes to the split stores and provides a unified interface
 * for components that expect the legacy auth store shape.
 */
export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => {
      // Subscribe to session store changes
      useAuthSessionStore.subscribe((sessionState) => {
        set({
          user: sessionState.user,
          session: sessionState.session,
          loading: sessionState.loading,
          sessionReady: sessionState.sessionReady,
          isHydrated: sessionState.isHydrated,
        });
      });

      // Subscribe to role store changes
      useAuthRoleStore.subscribe((roleState) => {
        set({
          userRole: roleState.userRole,
          isAdmin: roleState.isAdmin,
          isCheckingRole: roleState.isCheckingRole,
        });
      });

      // Subscribe to actions store changes
      useAuthActionsStore.subscribe((actionsState) => {
        set({
          signingOut: actionsState.signingOut,
        });
      });

      // Get initial state from split stores
      const sessionState = useAuthSessionStore.getState();
      const roleState = useAuthRoleStore.getState();
      const actionsState = useAuthActionsStore.getState();

      return {
        // Initial state from split stores
        user: sessionState.user,
        session: sessionState.session,
        loading: sessionState.loading,
        sessionReady: sessionState.sessionReady,
        isHydrated: sessionState.isHydrated,
        userRole: roleState.userRole,
        isAdmin: roleState.isAdmin,
        isCheckingRole: roleState.isCheckingRole,
        signingOut: actionsState.signingOut,

        // Delegate to session store
        initialize: () => useAuthSessionStore.getState().initialize(),
        setUser: (user) => useAuthSessionStore.getState().setUser(user),
        setSession: (session) => useAuthSessionStore.getState().setSession(session),
        setLoading: (loading) => useAuthSessionStore.getState().setLoading(loading),
        setSessionReady: (ready) => useAuthSessionStore.getState().setSessionReady(ready),

        // Delegate to role store
        fetchUserRole: (userId) => useAuthRoleStore.getState().fetchUserRole(userId),
        checkAdminRole: (userId) => useAuthRoleStore.getState().checkAdminRole(userId),
        setUserRole: (role) => useAuthRoleStore.getState().setUserRole(role),
        setIsAdmin: (isAdmin) => useAuthRoleStore.getState().setIsAdmin(isAdmin),
        setIsCheckingRole: (checking) => useAuthRoleStore.getState().setIsCheckingRole(checking),

        // Delegate to actions store
        signUp: (email, password, firstName, lastName) => 
          useAuthActionsStore.getState().signUp(email, password, firstName, lastName),
        signIn: (email, password) => 
          useAuthActionsStore.getState().signIn(email, password),
        signOut: () => 
          useAuthActionsStore.getState().signOut(),
        resetPassword: (email, userType) => 
          useAuthActionsStore.getState().resetPassword(email, userType),
        clearSignOutState: () => 
          useAuthActionsStore.getState().clearSignOutState(),
        emergencyLogout: () => 
          useAuthActionsStore.getState().emergencyLogout(),
      };
    },
    { name: 'AuthStore' }
  )
);
