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
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Admin role check timeout')), 10000)
      );
      
      const queryPromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
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
      // Return false on timeout or other errors to prevent hanging
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setIsCheckingRole(true);
          try {
            // Add timeout for role check to prevent hanging
            const adminStatus = await Promise.race([
              checkAdminRole(session.user.id),
              new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8000))
            ]);
            if (mounted) {
              setIsAdmin(adminStatus);
              setIsCheckingRole(false);
            }
          } catch (error) {
            console.error('Auth state change error:', error);
            if (mounted) {
              setIsAdmin(false);
              setIsCheckingRole(false);
            }
          }
        } else {
          setIsAdmin(false);
          setIsCheckingRole(false);
        }
        
        if (mounted) setLoading(false);
      }
    );

    // THEN check for existing session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setIsCheckingRole(true);
          const adminStatus = await checkAdminRole(session.user.id);
          if (mounted) {
            setIsAdmin(adminStatus);
            setIsCheckingRole(false);
          }
        }
        
        if (mounted) setLoading(false);
      } catch (error) {
        if (mounted) {
          setLoading(false);
          setIsCheckingRole(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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