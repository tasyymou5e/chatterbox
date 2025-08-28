import { useState, useEffect, useContext, createContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuthLogging } from './useAuthLogging';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { logActivity, createSession, endSession } = useAuthLogging();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Log auth state changes with proper session management
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            createSession(session.user.id);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          // Session cleanup is handled in signOut function
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    // Log signup attempt with comprehensive details
    if (data.user) {
      setTimeout(() => {
        logActivity(
          data.user.id,
          'signup',
          !error,
          error?.message,
          { 
            email, 
            firstName, 
            lastName,
            signupMethod: 'email_password',
            emailConfirmationRequired: !data.session // If no session, email confirmation required
          }
        );
      }, 0);
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Enhanced login logging with success/failure tracking
    if (data.user) {
      setTimeout(() => {
        logActivity(
          data.user.id,
          'login',
          !error,
          error?.message,
          { 
            email, 
            loginMethod: 'email_password',
            sessionCreated: !!data.session,
            userAgent: navigator.userAgent
          }
        );
      }, 0);
    } else if (error) {
      // Log failed login attempt - use a deterministic ID based on email
      const attemptId = btoa(email + Date.now().toString()).substring(0, 36);
      setTimeout(() => {
        logActivity(
          attemptId,
          'failed_login',
          false,
          error.message,
          { 
            email, 
            attemptTime: new Date().toISOString(),
            failureType: error.message?.includes('Invalid') ? 'invalid_credentials' : 'other'
          }
        );
      }, 0);
    }

    return { error };
  };

  const signOut = async () => {
    const currentUserId = user?.id;
    const currentSessionId = session?.access_token?.substring(0, 20);

    const { error } = await supabase.auth.signOut();

    // Log signout and properly end session
    if (currentUserId && !error) {
      setTimeout(() => {
        logActivity(
          currentUserId,
          'logout',
          true,
          undefined,
          { 
            logoutTime: new Date().toISOString(),
            sessionDuration: session ? Date.now() - new Date(session.expires_at || '').getTime() : 0
          }
        );

        if (currentSessionId) {
          endSession(currentSessionId);
        }
      }, 0);
    }

    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};