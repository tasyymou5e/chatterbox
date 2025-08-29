// Bridge adapter - migrated to use Zustand store internally
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export interface AdminAuthContextType {
  user: any;
  session: any;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

// Bridge adapter hook that uses Zustand store internally
export const useAdminAuth = (): AdminAuthContextType => {
  const {
    user,
    session,
    loading,
    isAdmin,
    initialize,
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
    loading,
    isAdmin,
    signIn: storeSignIn,
    signOut: storeSignOut
  };
};

// Legacy AdminAuthProvider - now empty wrapper (will be removed in cleanup)
export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};