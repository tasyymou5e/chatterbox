import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuthLogging } from '@/hooks/useAuthLogging';

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  userRole: string | null;
  isAdmin: boolean;
  loading: boolean;
  isCheckingRole: boolean;
  sessionReady: boolean;
  
  // Actions
  initialize: () => void;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
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
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        session: null,
        userRole: null,
        isAdmin: false,
        loading: true,
        isCheckingRole: false,
        sessionReady: false,


        // State setters
        setUser: (user) => set({ user }),
        setSession: (session) => set({ session }),
        setUserRole: (userRole) => set({ userRole }),
        setIsAdmin: (isAdmin) => set({ isAdmin }),
        setLoading: (loading) => set({ loading }),
        setIsCheckingRole: (isCheckingRole) => set({ isCheckingRole }),
        setSessionReady: (sessionReady) => set({ sessionReady }),

        // Helper function to fetch user role
        fetchUserRole: async (userId: string): Promise<string | null> => {
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
        },

        // Helper function to check admin role
        checkAdminRole: async (userId: string): Promise<boolean> => {
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
              return false;
            }
            
            const isAdmin = !!data;
            console.log(`${isAdmin ? '✅' : '❌'} Admin role check result:`, { userId, isAdmin, data });
            
            return isAdmin;
          } catch (error) {
            console.error('❌ Unexpected error checking admin role:', error);
            return false;
          }
        },

        // Initialize authentication
        initialize: () => {
          const { setSession, setUser, setLoading, setUserRole, setIsAdmin, setIsCheckingRole, setSessionReady, fetchUserRole, checkAdminRole } = get();

          // Set up auth state listener
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              setSession(session);
              setUser(session?.user ?? null);
              setLoading(false);

              if (session?.user) {
                setIsCheckingRole(true);
                
                // Fetch both regular role and admin status
                const [role, adminStatus] = await Promise.all([
                  fetchUserRole(session.user.id),
                  checkAdminRole(session.user.id)
                ]);
                
                setUserRole(role);
                setIsAdmin(adminStatus);
                setIsCheckingRole(false);
                setSessionReady(true);

                // Log auth state changes for successful sign ins
                if (event === 'SIGNED_IN') {
                  const { createSession } = useAuthLogging();
                  setTimeout(() => {
                    createSession(session.user.id);
                  }, 0);
                }
              } else {
                setUserRole(null);
                setIsAdmin(false);
                setIsCheckingRole(false);
                setSessionReady(false);
              }
            }
          );

          // Check for existing session asynchronously
          (async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              setSession(session);
              setUser(session?.user ?? null);
              setLoading(false);
              
              if (session?.user) {
                setIsCheckingRole(true);
                const [role, adminStatus] = await Promise.all([
                  fetchUserRole(session.user.id),
                  checkAdminRole(session.user.id)
                ]);
                setUserRole(role);
                setIsAdmin(adminStatus);
                setIsCheckingRole(false);
                setSessionReady(true);
              } else {
                setSessionReady(false);
              }
            } catch (error) {
              console.error('Error initializing auth:', error);
              setLoading(false);
              setIsCheckingRole(false);
            }
          })();

          // Store cleanup function globally for unmounting
          (window as any).__authUnsubscribe = () => subscription.unsubscribe();
        },

        // Sign up
        signUp: async (email: string, password: string, firstName?: string, lastName?: string) => {
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

          // Log signup attempt
          if (data.user) {
            const { logActivity } = useAuthLogging();
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
                  emailConfirmationRequired: !data.session
                }
              );
            }, 0);
          }

          return { error };
        },

        // Sign in
        signIn: async (email: string, password: string) => {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (data.user && !error) {
            const { logActivity } = useAuthLogging();
            
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

              // Note: Role fetching will be handled by the auth state change listener
            }, 0);
          } else if (error) {
            const { logActivity } = useAuthLogging();
            // Log failed login attempt
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
        },

        // Sign out
        signOut: async () => {
          const { user, session } = get();
          const currentUserId = user?.id;
          const currentSessionId = session?.access_token?.substring(0, 20);

          const { error } = await supabase.auth.signOut();

          // Clear state
          set({ 
            userRole: null, 
            isAdmin: false,
            user: null,
            session: null,
            sessionReady: false
          });

          // Log signout
          if (currentUserId && !error) {
            const { logActivity, endSession } = useAuthLogging();
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
        },
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({
          // Only persist non-sensitive state
          userRole: state.userRole,
          isAdmin: state.isAdmin,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);