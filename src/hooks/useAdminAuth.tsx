// Bridge adapter - migrated to use Zustand store internally
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import type { User, Session, SupabaseError } from '@/types/supabase';
import { cLog } from '@/utils/conditionalLogger';

export interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signingOut: boolean;
  signIn: (email: string, password: string) => Promise<{ error: SupabaseError | null; user?: User | null; isAdmin?: boolean }>;
  signOut: () => Promise<{ error: SupabaseError | null }>;
}

// Bridge adapter hook that uses Zustand store internally
export const useAdminAuth = (): AdminAuthContextType => {
  const {
    user,
    session,
    loading,
    isAdmin,
    signingOut,
    initialize,
    signIn: storeSignIn,
    signOut: storeSignOut
  } = useAuthStore();

  // Initialize the store on first use
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Enhanced debugging information
  useEffect(() => {
    if (typeof window !== 'undefined') {
      cLog('Admin Auth State Debug', {
        user: user ? { id: user.id, email: user.email } : null,
        session: session ? 'present' : 'null',
        isAdmin,
        loading
      });
    }
  }, [user, session, isAdmin, loading]);

  return {
    user,
    session,
    loading,
    isAdmin,
    signingOut,
    signIn: storeSignIn as (email: string, password: string) => Promise<{ error: SupabaseError | null; user?: User | null; isAdmin?: boolean }>,
    signOut: storeSignOut as () => Promise<{ error: SupabaseError | null }>
  };
};

// Legacy AdminAuthProvider - now empty wrapper (will be removed in cleanup)
export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};