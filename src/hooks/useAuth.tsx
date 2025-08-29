// Bridge adapter - migrated to use Zustand store internally
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAuthLogging } from './useAuthLogging';

export interface AuthContextType {
  user: any;
  session: any;
  userRole: string | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

// Bridge adapter hook that uses Zustand store internally
export const useAuth = (): AuthContextType => {
  const {
    user,
    session,
    userRole,
    loading,
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
    loading,
    signUp: storeSignUp,
    signIn: storeSignIn,
    signOut: storeSignOut
  };
};

// Legacy AuthProvider - now empty wrapper (will be removed in cleanup)
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};