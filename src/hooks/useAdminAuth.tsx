import { useState, useEffect, useContext, createContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(false);

  const checkAdminRole = async (userId: string) => {
    try {
      console.log('🔍 Checking admin role for user:', userId);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (error) {
        console.error('❌ Error checking admin role:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return false;
      }
      
      const isAdmin = !!data;
      console.log(`${isAdmin ? '✅' : '❌'} Admin role check result:`, { userId, isAdmin, data });
      
      return isAdmin;
    } catch (error) {
      console.error('❌ Unexpected error checking admin role:', error);
      return false;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST - use SYNC callback to prevent deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer async role check to prevent auth deadlock
          setTimeout(() => {
            if (!isCheckingRole) {
              setIsCheckingRole(true);
              checkAdminRole(session.user.id).then((adminStatus) => {
                setIsAdmin(adminStatus);
                setIsCheckingRole(false);
              }).catch(() => {
                setIsAdmin(false);
                setIsCheckingRole(false);
              });
            }
          }, 0);
        } else {
          setIsAdmin(false);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setIsCheckingRole(true);
        checkAdminRole(session.user.id).then((adminStatus) => {
          setIsAdmin(adminStatus);
          setIsCheckingRole(false);
        }).catch(() => {
          setIsAdmin(false);
          setIsCheckingRole(false);
        });
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isCheckingRole]);

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Attempting admin sign in for:', email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        return { error };
      }
      
      console.log('✅ Sign in successful, checking admin role...');
      return { error: null, data };
    } catch (error) {
      console.error('❌ Unexpected sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    signIn,
    signOut,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};