/**
 * useAuth Hook
 * 
 * @description Bridge adapter hook that provides authentication functionality
 * by wrapping the Zustand auth store. Maintains backward compatibility with
 * components using the older Context-based auth pattern.
 * 
 * @module useAuth
 * 
 * @example
 * const { user, signIn, signOut, loading } = useAuth();
 * 
 * if (loading) return <Spinner />;
 * if (!user) return <LoginForm onSubmit={signIn} />;
 * return <Dashboard user={user} onLogout={signOut} />;
 */
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import type { User, Session, SupabaseError } from '@/types/supabase';

/**
 * Auth context type definition.
 * 
 * @interface AuthContextType
 * @property {User | null} user - Current authenticated user
 * @property {Session | null} session - Current Supabase session
 * @property {string | null} userRole - User's role ('admin', 'parent', 'child')
 * @property {boolean} loading - Whether auth state is loading
 * @property {function} signUp - Sign up with email/password
 * @property {function} signIn - Sign in with email/password
 * @property {function} signOut - Sign out current user
 * @property {function} resetPassword - Send password reset email
 */
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  loading: boolean;
  sessionReady: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: SupabaseError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: SupabaseError | null; user?: User | null; isAdmin?: boolean }>;
  signOut: () => Promise<{ error: SupabaseError | null }>;
  resetPassword: (email: string, userType?: 'admin' | 'user') => Promise<{ error: SupabaseError | null }>;
}

/**
 * Authentication hook providing user state and auth methods.
 * 
 * @description Bridge adapter that wraps the Zustand auth store,
 * automatically initializing the store on first use. Includes hydration
 * state in the loading flag for SSR/hydration safety.
 * 
 * @returns {AuthContextType} Auth state and methods
 * 
 * @example
 * function LoginPage() {
 *   const { signIn, loading } = useAuth();
 *   
 *   const handleSubmit = async (email: string, password: string) => {
 *     const { error, isAdmin } = await signIn(email, password);
 *     if (error) {
 *       showError(error.message);
 *     } else if (isAdmin) {
 *       navigate('/admin');
 *     } else {
 *       navigate('/dashboard');
 *     }
 *   };
 * }
 * 
 * @see {@link useAuthStore} for the underlying Zustand store
 */
export const useAuth = (): AuthContextType => {
  const {
    user,
    session,
    userRole,
    loading,
    isHydrated,
    sessionReady,
    initialize,
    signUp: storeSignUp,
    signIn: storeSignIn,
    signOut: storeSignOut
  } = useAuthStore();

  // Initialize the store on first use
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    user,
    session,
    userRole,
    loading: loading || !isHydrated, // Include hydration state in loading
    sessionReady: sessionReady && isHydrated, // Only ready when fully hydrated
    signUp: storeSignUp as (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: SupabaseError | null }>,
    signIn: storeSignIn as (email: string, password: string) => Promise<{ error: SupabaseError | null; user?: User | null; isAdmin?: boolean }>,
    signOut: storeSignOut as () => Promise<{ error: SupabaseError | null }>,
    resetPassword: useAuthStore.getState().resetPassword as (email: string, userType?: 'admin' | 'user') => Promise<{ error: SupabaseError | null }>
  };
};
