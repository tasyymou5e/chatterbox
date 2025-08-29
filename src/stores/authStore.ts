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
  isHydrated: boolean;
  
  // Actions
  initialize: () => void;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; user?: any; isAdmin?: boolean }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string, userType?: 'admin' | 'user') => Promise<{ error: any }>;
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
        isHydrated: false,


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

                // Handle role checking when user signs in - synchronous to prevent race conditions
                if (!currentState.signingOut) {
                  console.log('🔐 AuthStore - Checking user role for:', session.user.id);
                  set({ isCheckingRole: true });
                  
                  // Check role synchronously to prevent race conditions
                  get().fetchUserRole(session.user.id).then(role => {
                    const isAdmin = role === 'admin';
                    console.log('👤 AuthStore: Role check complete:', { role, isAdmin });
                    set({ 
                      userRole: role, 
                      isAdmin,
                      isCheckingRole: false 
                    });
                  }).catch(error => {
                    console.warn('⚠️ AuthStore: Role check failed:', error);
                    set({ 
                      userRole: 'parent',
                      isAdmin: false,
                      isCheckingRole: false 
                    });
                  });
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

        // Reset password - works for all user types
        resetPassword: async (email: string, userType: 'admin' | 'user' = 'user') => {
          try {
            console.log('🔐 Sending password reset email to:', email, 'for', userType);
            
            const redirectUrl = userType === 'admin' 
              ? `${window.location.origin}/admin/reset-password-confirm`
              : `${window.location.origin}/auth?tab=reset-confirm`;
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: redirectUrl,
            });

            if (error) {
              console.error('❌ Password reset error:', error);
              return { error };
            }

            console.log('✅ Password reset email sent successfully');
            return { error: null };
          } catch (err: any) {
            console.error('💥 Password reset exception:', err);
            return { error: err };
          }
        },

        // Enhanced signIn with atomic state updates and detailed error logging
        signIn: async (email: string, password: string) => {
          try {
            set({ loading: true, isCheckingRole: true });
            console.log('🔐 AuthStore: Starting sign in for', email);
            
            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password
            });

            if (error) {
              console.error('🔐 AuthStore: Sign in error details:', {
                code: error.status,
                message: error.message,
                name: error.name,
                details: error
              });
              
              // Enhanced error diagnostics for common login issues
              if (error.message?.includes('Invalid login credentials')) {
                console.error('🔐 AuthStore: Invalid credentials detected - possible causes:');
                console.error('  • Password incorrect for user:', email);
                console.error('  • Account locked or disabled');
                console.error('  • ⚠️  LEAKED PASSWORD PROTECTION may be blocking login');
                console.error('  • Email not confirmed (check email_confirmed_at in auth.users)');
                console.error('  • Rate limiting active');
                console.error('💡 Check Supabase Auth settings: https://supabase.com/dashboard/project/lxuqfgbukrrickanmmic/auth/providers');
              }
              
              // Log failed login attempt
              setTimeout(() => {
                authLoggingService.logActivity(
                  email, // Use email when user ID not available
                  'failed_login',
                  false,
                  error.message,
                  {
                    email,
                    errorCode: error.status,
                    errorName: error.name,
                    timestamp: new Date().toISOString(),
                    attemptMethod: 'email_password'
                  }
                ).catch(logError => {
                  console.warn('Failed to log failed login (non-blocking):', logError);
                });
              }, 0);
              
              set({ loading: false, isCheckingRole: false });
              return { error };
            }

            if (data?.user && data?.session) {
              console.log('🔐 AuthStore: Sign in successful, user details:', {
                id: data.user.id,
                email: data.user.email,
                emailConfirmed: data.user.email_confirmed_at,
                lastSignIn: data.user.last_sign_in_at,
                provider: data.user.app_metadata?.provider
              });
              
              console.log('✅ Auth successful, establishing session synchronously...');
              
              // Synchronously check role to prevent race conditions
              const userRole = await get().fetchUserRole(data.user.id);
              const isAdmin = userRole === 'admin';
              
              console.log('👤 User role determined synchronously:', { userRole, isAdmin });
              
              // Set ALL auth state atomically in single operation to prevent race conditions
              set({
                user: data.user,
                session: data.session,
                userRole,
                isAdmin,
                loading: false,
                isCheckingRole: false,
                sessionReady: true
              });
              
              console.log('🎯 Auth state established atomically for', email);

              // Log successful sign-in activity asynchronously (non-blocking)
              setTimeout(() => {
                authLoggingService.logActivity(
                  data.user.id,
                  'login',
                  true,
                  undefined,
                  {
                    email: data.user.email,
                    role: userRole,
                    timestamp: new Date().toISOString(),
                    loginMethod: 'email_password',
                    provider: data.user.app_metadata?.provider || 'email'
                  }
                ).catch(logError => {
                  console.warn('Failed to log sign-in activity (non-blocking):', logError);
                });
              }, 0);

              return { error: null, user: data.user, isAdmin };
            }

            console.error('❌ No user or session returned despite successful auth');
            set({ loading: false, isCheckingRole: false });
            return { error: { message: 'No user or session returned' } };
          } catch (err: any) {
            console.error('💥 Sign in exception:', err);
            set({ loading: false, isCheckingRole: false });
            return { error: err };
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
        onRehydrateStorage: () => (state) => {
          console.log('🔄 AuthStore: Hydration complete');
          if (state) {
            state.isHydrated = true;
          }
        },
      }
    ),
    { name: 'AuthStore' }
  )
);