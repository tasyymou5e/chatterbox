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

        // Helper to check if user has admin role with retry logic
        checkAdminRole: async (userId: string): Promise<boolean> => {
          console.log('👑 AuthStore: Checking admin role for user:', userId);
          try {
            console.log('👑 AuthStore: Calling has_role RPC function...');
            const { data, error } = await supabase.rpc('has_role', {
              _user_id: userId,
              _role: 'admin'
            });

            if (error) {
              console.error('❌ AuthStore: Admin role check RPC failed:', error.message, error);
              return false;
            }

            console.log('✅ AuthStore: Admin role check RPC successful, result:', data);
            const isAdmin = data || false;
            console.log('👑 AuthStore: Final admin status:', isAdmin);
            return isAdmin;
          } catch (error) {
            console.error('❌ AuthStore: Admin role check exception:', error);
            return false;
          }
        },

        // Initialize authentication
        initialize: () => {
          const currentState = get();
          if (currentState.sessionReady) {
            console.log('🔐 Auth Store - Already initialized');
            return;
          }

          console.log('🔐 Auth Store - Starting initialization');
          set({ loading: true });

          // Set up auth state listener FIRST
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log('🔄 AuthStore: Auth state changed:', event);
              console.log('🔄 AuthStore: Session data:', {
                user_id: session?.user?.id,
                user_email: session?.user?.email,
                access_token: session?.access_token ? 'present' : 'missing',
                expires_at: session?.expires_at
              });
              
              const currentState = get();
              console.log('🔄 AuthStore: Current state before update:', {
                currentUser: currentState.user?.email,
                currentIsAdmin: currentState.isAdmin,
                currentLoading: currentState.loading
              });
              
              if (event === 'SIGNED_IN' && session) {
                console.log('✅ AuthStore: Processing SIGNED_IN event...');
                console.log('✅ AuthStore: Setting user and session in state...');
                set({ 
                  session, 
                  user: session?.user ?? null,
                  loading: false,
                  sessionReady: true
                });
                console.log('✅ AuthStore: State updated with user and session');

                // Handle role checking when user signs in - make completely non-blocking
                if (!currentState.signingOut) {
                  console.log('🔐 AuthStore - Checking user role for:', session.user.id);
                  set({ isCheckingRole: true });
                  
                  // Check admin role asynchronously - completely non-blocking
                  setTimeout(async () => {
                    try {
                      console.log('👑 AuthStore: Starting admin role check (async)...');
                      const adminStatus = await get().checkAdminRole(session.user.id);
                      console.log('👑 AuthStore: Admin role check complete, setting status:', adminStatus);
                      set({ isAdmin: adminStatus });
                      console.log('👑 AuthStore: Admin status set in state');
                    } catch (error) {
                      console.warn('⚠️ AuthStore: Admin role check failed (non-critical):', error);
                      set({ isAdmin: false });
                    }
                  }, 0);
                  
                  // Fetch user role asynchronously - completely non-blocking  
                  setTimeout(async () => {
                    try {
                      console.log('🎭 AuthStore: Starting user role fetch (async)...');
                      const role = await get().fetchUserRole(session.user.id);
                      console.log('🎭 AuthStore: User role fetch complete, setting role:', role);
                      set({ 
                        userRole: role, 
                        isCheckingRole: false 
                      });
                    } catch (error) {
                      console.warn('⚠️ AuthStore: User role fetch failed (non-critical):', error);
                      // Don't block login if role check fails
                      set({ 
                        userRole: 'parent', // Default fallback role
                        isCheckingRole: false 
                      });
                    }
                  }, 0);
                }
              } else if (event === 'SIGNED_OUT') {
                console.log('🚪 AuthStore: Processing SIGNED_OUT event...');
                set({ 
                  session, 
                  user: session?.user ?? null,
                  loading: false,
                  sessionReady: true
                });
                console.log('🚪 AuthStore: Clearing user data (signed out)');
                // Clear role data when no user
                set({ 
                  userRole: null, 
                  isAdmin: false,
                  isCheckingRole: false 
                });
                console.log('🚪 AuthStore: State cleared for sign out');
              } else if (event === 'TOKEN_REFRESHED' && session) {
                console.log('🔄 AuthStore: Processing TOKEN_REFRESHED event...');
                set({ session, user: session.user });
                console.log('🔄 AuthStore: Session refreshed in state');
              }
              
              console.log('🔄 AuthStore: Auth state change processing complete');
            }
          );

          // Check for existing session AFTER setting up listener
          supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('🔐 Auth Store - Initial session check:', { 
              hasSession: !!session, 
              hasUser: !!session?.user 
            });
            set({ 
              session, 
              user: session?.user ?? null,
              loading: false,
              sessionReady: true
            });
          }).catch(error => {
            console.error('🚨 Auth Store - Initial session check failed:', error);
            set({ loading: false, sessionReady: true });
          });

          // Store cleanup function
          (window as any).__authUnsubscribe = () => subscription.unsubscribe();
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

        // Sign in with comprehensive debugging
        signIn: async (email: string, password: string) => {
          console.log('🔐 AuthStore: Starting signIn process for:', email);
          set({ loading: true });
          
          try {
            console.log('🔐 AuthStore: Calling Supabase signInWithPassword...');
            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (error) {
              console.error('❌ AuthStore: Supabase sign in error:', error.message, error);
              throw error;
            }

            console.log('✅ AuthStore: Supabase sign in successful');
            console.log('👤 AuthStore: User data:', {
              id: data.user?.id,
              email: data.user?.email,
              role: data.user?.role
            });
            console.log('🎫 AuthStore: Session data:', {
              access_token: data.session?.access_token ? 'present' : 'missing',
              refresh_token: data.session?.refresh_token ? 'present' : 'missing',
              expires_at: data.session?.expires_at
            });

            if (data.user && !error) {
              console.log('🔐 AuthStore - Login successful, scheduling activity log');
              
              // Non-blocking activity logging - login should succeed even if this fails
              setTimeout(() => {
                console.log('📝 AuthStore: Attempting to log user activity (async)...');
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
                ).then(() => {
                  console.log('✅ AuthStore: User activity logged successfully');
                }).catch(error => {
                  console.warn('⚠️ AuthStore: Activity logging failed (non-critical):', error);
                });
              }, 0);
              
            } else if (error) {
              console.log('🔐 AuthStore - Login failed:', error.message);
              
              // Log failed login attempt (non-blocking)
              const attemptId = `failed_${Date.now()}`;
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
                ).catch(logError => {
                  console.warn('⚠️ AuthStore: Failed to log failed login activity (non-blocking):', logError);
                });
              }, 0);
            }

            return { error };
            
          } catch (error) {
            console.error('❌ AuthStore: Sign in process failed:', error);
            return { error };
          } finally {
            console.log('🔐 AuthStore: Setting loading to false');
            set({ loading: false });
          }
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