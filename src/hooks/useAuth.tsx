import { useState, useEffect, useContext, createContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuthLogging } from './useAuthLogging';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { logActivity, createSession, endSession } = useAuthLogging();

  // Helper function to fetch user role
  const fetchUserRole = async (userId: string): Promise<string | null> => {
    try {
      // Check roles in priority order: admin > parent > child
      const { data: adminCheck } = await supabase.rpc('has_role', { 
        _user_id: userId, 
        _role: 'admin' 
      });
      if (adminCheck) return 'admin';

      const { data: parentCheck } = await supabase.rpc('has_role', { 
        _user_id: userId, 
        _role: 'parent' 
      });
      if (parentCheck) return 'parent';

      const { data: childCheck } = await supabase.rpc('has_role', { 
        _user_id: userId, 
        _role: 'child' 
      });
      if (childCheck) return 'child';

      return null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  // Helper function to navigate based on role
  const navigateBasedOnRole = (role: string | null, navigate: any) => {
    switch (role) {
      case 'admin':
        navigate('/admin/dashboard');
        break;
      case 'parent':
        navigate('/parent-dashboard');
        break;
      case 'child':
        navigate('/children/tasks');
        break;
      default:
        navigate('/parent-dashboard'); // Fallback
        break;
    }
  };

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
            // Fetch user role after sign in
            fetchUserRole(session.user.id).then(role => {
              setUserRole(role);
            });
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setUserRole(null);
          // Session cleanup is handled in signOut function
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Fetch role for existing session
      if (session?.user) {
        fetchUserRole(session.user.id).then(role => {
          setUserRole(role);
        });
      }
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

    // Enhanced login logging with success/failure tracking and role-based navigation
    if (data.user && !error) {
      setTimeout(async () => {
        logActivity(
          data.user.id,
          'login',
          true,
          undefined,
          { 
            email, 
            loginMethod: 'email_password',
            sessionCreated: !!data.session,
            userAgent: navigator.userAgent
          }
        );

        // Fetch user role and navigate accordingly
        const role = await fetchUserRole(data.user.id);
        setUserRole(role);
        
        // Use navigate from router context if available in component
        const navigate = (window as any).__navigate;
        if (navigate) {
          navigateBasedOnRole(role, navigate);
        }
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

    // Clear user role on sign out
    setUserRole(null);

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
    userRole,
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