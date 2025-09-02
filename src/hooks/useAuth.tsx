// Bridge adapter - migrated to use Zustand store internally
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAuthLogging } from './useAuthLogging';
import type { User, Session, SupabaseError } from '@/types/supabase';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: SupabaseError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: SupabaseError | null; user?: User | null; isAdmin?: boolean }>;
  signOut: () => Promise<{ error: SupabaseError | null }>;
  resetPassword: (email: string, userType?: 'admin' | 'user') => Promise<{ error: SupabaseError | null }>;
}

// Bridge adapter hook that uses Zustand store internally
export const useAuth = (): AuthContextType => {
  const {
    user,
    session,
    userRole,
    loading,
    isHydrated,
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
    signUp: storeSignUp as (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: SupabaseError | null }>,
    signIn: storeSignIn as (email: string, password: string) => Promise<{ error: SupabaseError | null; user?: User | null; isAdmin?: boolean }>,
    signOut: storeSignOut as () => Promise<{ error: SupabaseError | null }>,
    resetPassword: useAuthStore.getState().resetPassword as (email: string, userType?: 'admin' | 'user') => Promise<{ error: SupabaseError | null }>
  };
};

// Legacy AuthProvider - now empty wrapper (will be removed in cleanup)
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};