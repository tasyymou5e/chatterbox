/**
 * Authentication Store (Unified Facade)
 * 
 * @description Unified facade that composes from the split auth stores.
 * Uses synchronous state composition to avoid race conditions.
 * 
 * @module authStore
 * 
 * @example
 * const { user, isAdmin, loading } = useAuthStore();
 * await signIn('user@example.com', 'password');
 */
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';
import { useAuthSessionStore } from './authSessionStore';
import { useAuthRoleStore } from './authRoleStore';
import { useAuthActionsStore } from './authActionsStore';
import { type AuthError } from '@/types/auth';
import { secureLog } from '@/utils/secureLogging';

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
  
  // Sync tracking
  _lastSyncTime: number;
  
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
  
  // Sync action
  syncFromSourceStores: () => void;
}

/**
 * Helper to get current composed state from all source stores.
 * This reads synchronously from source stores.
 */
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
    _lastSyncTime: Date.now(),
  };
};

/**
 * Unified auth store facade using synchronous state composition.
 * 
 * IMPORTANT: This store subscribes to source stores and synchronizes
 * state immediately (no debouncing) to prevent race conditions.
 */
/**
 * Synchronous sync function - updates facade store from source stores.
 * Defined outside create() to avoid closure issues during initialization.
 */
const syncFromSourceStores = () => {
  // Guard: Don't sync if store isn't initialized yet
  if (!useAuthStore) return;
  
  const current = useAuthStore.getState();
  if (current === undefined) return;
  
  const composed = getComposedState();
  
  // Only update if state actually changed to prevent unnecessary renders
  const hasChanged = 
    current.user?.id !== composed.user?.id ||
    current.session?.access_token !== composed.session?.access_token ||
    current.loading !== composed.loading ||
    current.sessionReady !== composed.sessionReady ||
    current.isHydrated !== composed.isHydrated ||
    current.userRole !== composed.userRole ||
    current.isAdmin !== composed.isAdmin ||
    current.isCheckingRole !== composed.isCheckingRole ||
    current.signingOut !== composed.signingOut;
  
  if (hasChanged) {
    secureLog.dev('AuthStore: Syncing state from source stores', {
      userChanged: current.user?.id !== composed.user?.id,
      adminChanged: current.isAdmin !== composed.isAdmin,
      sessionReadyChanged: current.sessionReady !== composed.sessionReady
    });
    useAuthStore.setState(composed);
  }
};

/**
 * Unified auth store facade using synchronous state composition.
 * 
 * IMPORTANT: Subscriptions are set up AFTER store creation to avoid
 * race conditions during initialization.
 */
export const useAuthStore = create<AuthState>()(
  devtools(
    subscribeWithSelector(
      (_set, _get) => {
        // Get initial state synchronously
        const initialState = getComposedState();

        return {
          // Initial state from split stores (synchronous)
          ...initialState,

          // Sync action for manual triggering if needed
          syncFromSourceStores,

          // Delegate to session store
          initialize: () => {
            useAuthSessionStore.getState().initialize();
            syncFromSourceStores();
          },
          setUser: (user: User | null) => {
            useAuthSessionStore.getState().setUser(user);
            syncFromSourceStores();
          },
          setSession: (session: Session | null) => {
            useAuthSessionStore.getState().setSession(session);
            syncFromSourceStores();
          },
          setLoading: (loading: boolean) => {
            useAuthSessionStore.getState().setLoading(loading);
            syncFromSourceStores();
          },
          setSessionReady: (ready: boolean) => {
            useAuthSessionStore.getState().setSessionReady(ready);
            syncFromSourceStores();
          },

          // Delegate to role store
          fetchUserRole: async (userId: string) => {
            const result = await useAuthRoleStore.getState().fetchUserRole(userId);
            syncFromSourceStores();
            return result;
          },
          checkAdminRole: async (userId: string) => {
            const result = await useAuthRoleStore.getState().checkAdminRole(userId);
            syncFromSourceStores();
            return result;
          },
          setUserRole: (role: string | null) => {
            useAuthRoleStore.getState().setUserRole(role);
            syncFromSourceStores();
          },
          setIsAdmin: (isAdmin: boolean) => {
            useAuthRoleStore.getState().setIsAdmin(isAdmin);
            syncFromSourceStores();
          },
          setIsCheckingRole: (checking: boolean) => {
            useAuthRoleStore.getState().setIsCheckingRole(checking);
            syncFromSourceStores();
          },

          // Delegate to actions store
          signUp: async (email: string, password: string, firstName?: string, lastName?: string) => {
            const result = await useAuthActionsStore.getState().signUp(email, password, firstName, lastName);
            syncFromSourceStores();
            return result;
          },
          signIn: async (email: string, password: string) => {
            const result = await useAuthActionsStore.getState().signIn(email, password);
            syncFromSourceStores();
            return result;
          },
          signOut: async () => {
            const result = await useAuthActionsStore.getState().signOut();
            syncFromSourceStores();
            return result;
          },
          resetPassword: (email: string, userType?: 'admin' | 'user') => 
            useAuthActionsStore.getState().resetPassword(email, userType),
          clearSignOutState: () => {
            useAuthActionsStore.getState().clearSignOutState();
            syncFromSourceStores();
          },
          emergencyLogout: () => {
            useAuthActionsStore.getState().emergencyLogout();
            syncFromSourceStores();
          },
        };
      }
    ),
    { name: 'AuthStore' }
  )
);

// Set up subscriptions AFTER store creation to avoid race conditions
// This runs once at module load time
if (typeof window !== 'undefined') {
  // Subscribe to session store with selector for granular updates
  useAuthSessionStore.subscribe(
    (state) => ({ 
      user: state.user, 
      session: state.session, 
      loading: state.loading,
      sessionReady: state.sessionReady,
      isHydrated: state.isHydrated
    }),
    syncFromSourceStores,
    { fireImmediately: true }
  );

  // Subscribe to role store with selector
  useAuthRoleStore.subscribe(
    (state) => ({ 
      userRole: state.userRole, 
      isAdmin: state.isAdmin, 
      isCheckingRole: state.isCheckingRole 
    }),
    syncFromSourceStores,
    { fireImmediately: true }
  );

  // Subscribe to actions store with selector
  useAuthActionsStore.subscribe(
    (state) => ({ signingOut: state.signingOut }),
    syncFromSourceStores,
    { fireImmediately: true }
  );
}

/**
 * Selector hooks for optimized component subscriptions.
 * Use these instead of accessing the full store when you only need specific values.
 */
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthSession = () => useAuthStore((state) => state.session);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useIsAdmin = () => useAuthStore((state) => state.isAdmin);
export const useSessionReady = () => useAuthStore((state) => state.sessionReady);

/**
 * Hook to get fresh auth state directly from source stores.
 * Use this in critical components like AdminRoute for most accurate state.
 */
export const useFreshAuthState = () => {
  const sessionStore = useAuthSessionStore();
  const roleStore = useAuthRoleStore();
  const actionsStore = useAuthActionsStore();
  
  return {
    user: sessionStore.user,
    session: sessionStore.session,
    loading: sessionStore.loading,
    sessionReady: sessionStore.sessionReady,
    isHydrated: sessionStore.isHydrated,
    userRole: roleStore.userRole,
    isAdmin: roleStore.isAdmin,
    isCheckingRole: roleStore.isCheckingRole,
    signingOut: actionsStore.signingOut,
  };
};
