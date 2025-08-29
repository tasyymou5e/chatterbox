import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authLoggingService } from '@/services/authLoggingService';

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  userRole: string | null;
  isAdmin: boolean;
  loading: boolean;
  isCheckingRole: boolean;
  sessionReady: boolean;
  signingOut: boolean;
  
  // Actions
  initialize: () => void;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  clearSignOutState: () => void;
  emergencyLogout: () => void;
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
        signingOut: false,


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
                  setTimeout(() => {
                    authLoggingService.createSession(session.user.id).catch(error => {
                      console.warn('Failed to create session (non-blocking):', error);
                    });
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
          
          // Store auth store reference for emergency recovery
          (window as any).__authStore = { getState: get };
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
            setTimeout(() => {
              authLoggingService.logActivity(
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
              ).catch(error => {
                console.warn('Failed to log signup activity (non-blocking):', error);
              });
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
            setTimeout(() => {
              authLoggingService.logActivity(
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
              ).catch(error => {
                console.warn('Failed to log login activity (non-blocking):', error);
              });
            }, 0);
          } else if (error) {
            // Log failed login attempt
            const attemptId = btoa(email + Date.now().toString()).substring(0, 36);
            setTimeout(() => {
              authLoggingService.logActivity(
                attemptId,
                'failed_login',
                false,
                error.message,
                { 
                  email, 
                  attemptTime: new Date().toISOString(),
                  failureType: error.message?.includes('Invalid') ? 'invalid_credentials' : 'other'
                }
              ).catch(error => {
                console.warn('Failed to log failed login activity (non-blocking):', error);
              });
            }, 0);
          }

          return { error };
        },

        // Sign out with improved error handling and proper service usage
        signOut: async () => {
          const currentState = get();
          
          // Prevent multiple signOut attempts
          if (currentState.signingOut) {
            console.log('🔐 Auth Store - SignOut already in progress, skipping');
            return { error: null };
          }

          console.log('🔐 Auth Store - Starting signOut with timeout protection');
          set({ signingOut: true });
          
          const currentUserId = currentState.user?.id;
          // Fix session ID extraction - get from user_sessions table or create temp ID
          const currentSessionId = currentUserId ? `session_${currentUserId}_${Date.now()}` : null;

          try {
            // Reduced timeout and immediate state clearing
            const signOutWithTimeout = () => {
              return Promise.race([
                supabase.auth.signOut(),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('SignOut timeout')), 5000)
                )
              ]) as Promise<{ error: any }>;
            };

            // Clear state immediately before Supabase call to prevent UI hanging
            console.log('🔐 Auth Store - Clearing state immediately');
            set({
              user: null,
              session: null,
              userRole: null,
              isAdmin: false,
              loading: false,
              sessionReady: false,
              signingOut: false,
            });

            // Force clear persisted state immediately
            try {
              localStorage.removeItem('auth-store');
              sessionStorage.clear();
              console.log('🔐 Auth Store - Cleared persisted auth state');
            } catch (e) {
              console.warn('🔐 Auth Store - Could not clear persisted state:', e);
            }

            const { error } = await signOutWithTimeout();
            
            if (error) {
              console.error('🔐 Auth Store - SignOut error (state already cleared):', error);
            } else {
              console.log('🔐 Auth Store - SignOut successful');
            }

            // Non-blocking auth logging with individual timeouts (fire and forget)
            if (currentUserId) {
              Promise.race([
                authLoggingService.logActivity(
                  currentUserId,
                  'logout',
                  !error,
                  error?.message,
                  { 
                    logoutTime: new Date().toISOString(),
                    forced: false
                  }
                ),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Activity logging timeout')), 2000)
                )
              ]).catch(logError => {
                console.warn('🔐 Auth Store - Activity logging failed (non-blocking):', logError);
              });

              if (currentSessionId) {
                Promise.race([
                  authLoggingService.endSession(currentSessionId),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('End session timeout')), 2000)
                  )
                ]).catch(sessionError => {
                  console.warn('🔐 Auth Store - End session failed (non-blocking):', sessionError);
                });
              }
            }

            return { error };
          } catch (timeoutError) {
            console.error('🔐 Auth Store - SignOut timeout (state already cleared):', timeoutError);
            return { error: timeoutError };
          }
        },

        clearSignOutState: () => {
          set({ signingOut: false });
        },

        // Emergency logout for recovery
        emergencyLogout: () => {
          console.log('🔐 Auth Store - Emergency logout triggered');
          
          set({
            user: null,
            session: null,
            userRole: null,
            isAdmin: false,
            loading: false,
            sessionReady: false,
            signingOut: false,
          });
          
          try {
            localStorage.removeItem('auth-store');
            sessionStorage.clear();
            console.log('🔐 Emergency logout - Cleared all state');
          } catch (e) {
            console.warn('🔐 Emergency logout - Storage clear failed:', e);
          }
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