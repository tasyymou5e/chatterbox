/**
 * Authentication Store (Unified Facade)
 * 
 * @description Unified facade that composes from the split auth stores.
 * Uses useSyncExternalStore pattern for proper React synchronization.
 * 
 * @module authStore
 * 
 * @example
 * const { user, isAdmin, loading } = useAuthStore();
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
 * Unified auth store facade using proper Zustand composition.
 * 
 * This store synchronously reads from source stores on each access,
 * avoiding race conditions from async subscriptions.
 */
export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => {
      // Helper to get current composed state from all stores
      const getComposedState = () => {
        const sessionState = useAuthSessionStore.getState();
        const roleState = useAuthRoleStore.getState();
        const actionsState = useAuthActionsStore.getState();
        
        return {
          user: sessionState.user,
          session: sessionState.session,
          loading: sessionState.loading,
          sessionReady: sessionState.sessionReady,
          isHydrated: sessionState.isHydrated,
          userRole: roleState.userRole,
          isAdmin: roleState.isAdmin,
          isCheckingRole: roleState.isCheckingRole,
          signingOut: actionsState.signingOut,
        };
      };

      // Debounce sync to prevent rapid updates
      let syncTimeout: ReturnType<typeof setTimeout> | null = null;
      const syncState = () => {
        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
          const composed = getComposedState();
          set(composed);
        }, 10);
      };

      // Initialize subscriptions immediately
      if (typeof window !== 'undefined') {
        useAuthSessionStore.subscribe(syncState);
        useAuthRoleStore.subscribe(syncState);
        useAuthActionsStore.subscribe(syncState);
      }

      // Get initial state synchronously
      const initialState = getComposedState();

      return {
        // Initial state from split stores (synchronous)
        ...initialState,

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

/**
 * Selector hooks for optimized component subscriptions.
 * Use these instead of accessing the full store when you only need specific values.
 */
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthSession = () => useAuthStore((state) => state.session);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useIsAdmin = () => useAuthStore((state) => state.isAdmin);
export const useSessionReady = () => useAuthStore((state) => state.sessionReady);
