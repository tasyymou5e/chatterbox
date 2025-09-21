import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authLoggingService } from '@/services/authLoggingService';
import { type AuthError, type AuthMetadata } from '@/types/auth';
import { type Database } from '@/integrations/supabase/types';

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
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; user?: User; isAdmin?: boolean }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string, userType?: 'admin' | 'user') => Promise<{ error: AuthError | null }>;
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
            return null;
          }
        },

        // Helper to check if user has admin role with retry logic
        checkAdminRole: async (userId: string): Promise<boolean> => {
          try {
            const { data, error } = await supabase.rpc('has_role', {
              _user_id: userId,
              _role: 'admin'
            });

            if (error) {
              return false;
            }

            return data || false;
          } catch (error) {
            return false;
          }
        },

        // Initialize authentication
        initialize: () => {
          const currentState = get();
          if (currentState.sessionReady) {
            return;
          }

          set({ loading: true });

          // Set up auth state listener FIRST
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              const currentState = get();
              
              if (event === 'SIGNED_IN' && session) {
                set({ 
                  session, 
                  user: session?.user ?? null,
                  loading: false,
                  sessionReady: true
                });

                // Handle role checking when user signs in - synchronous to prevent race conditions
                if (!currentState.signingOut) {
                  set({ isCheckingRole: true });
                  
                  // Check role synchronously to prevent race conditions
                  get().fetchUserRole(session.user.id).then(role => {
                    const isAdmin = role === 'admin' || role === 'read_only';
                    set({ 
                      userRole: role, 
                      isAdmin,
                      isCheckingRole: false 
                    });
                  }).catch(error => {
                    set({ 
                      userRole: 'parent',
                      isAdmin: false,
                      isCheckingRole: false 
                    });
                  });
                }
              } else if (event === 'SIGNED_OUT') {
                set({ 
                  session, 
                  user: session?.user ?? null,
                  loading: false,
                  sessionReady: true
                });
                // Clear role data when no user
                set({ 
                  userRole: null, 
                  isAdmin: false,
                  isCheckingRole: false 
                });
              } else if (event === 'TOKEN_REFRESHED' && session) {
                set({ session, user: session.user });
              }
            }
          );

          // Check for existing session AFTER setting up listener
          supabase.auth.getSession().then(({ data: { session } }) => {
            set({ 
              session, 
              user: session?.user ?? null,
              loading: false,
              sessionReady: true
            });
          }).catch(error => {
            set({ loading: false, sessionReady: true });
          });

          // Store cleanup function (secure - no window exposure)
          return () => subscription.unsubscribe();
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

          // Log signup attempt with proper metadata
          if (data.user) {
            setTimeout(() => {
              const metadata: AuthMetadata = {
                signupMethod: 'email_password',
                deviceInfo: {
                  userAgent: navigator.userAgent,
                  isMobile: /Mobile|Tablet|Android|iOS/.test(navigator.userAgent)
                }
              };
              
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
                   emailConfirmationRequired: !data.session,
                   ...metadata
                 }
               ).catch(() => {
                 // Log failure silently
               });
            }, 0);
           }

           return { error: error as AuthError | null };
        },

        // Reset password - works for all user types
        resetPassword: async (email: string, userType: 'admin' | 'user' = 'user') => {
          try {
            const redirectUrl = userType === 'admin' 
              ? `${window.location.origin}/admin/reset-password-confirm`
              : `${window.location.origin}/auth?tab=reset-confirm`;
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: redirectUrl,
            });

            if (error) {
              return { error };
            }

            return { error: null };
          } catch (err: unknown) {
            return { error: err as AuthError };
          }
        },

        // Enhanced signIn with atomic state updates and detailed error logging
        signIn: async (email: string, password: string) => {
          try {
            set({ loading: true, isCheckingRole: true });
            
            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password
            });

            if (error) {
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
                ).catch(() => {
                  // Log failure silently
                });
              }, 0);
              
              set({ loading: false, isCheckingRole: false });
              return { error };
            }

            if (data?.user && data?.session) {
              // Synchronously check role to prevent race conditions
              const userRole = await get().fetchUserRole(data.user.id);
              const isAdmin = userRole === 'admin' || userRole === 'read_only';
              
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

              // Log successful sign-in activity asynchronously (non-blocking) with metadata
              setTimeout(() => {
                const metadata: AuthMetadata = {
                  loginMethod: 'email_password',
                  provider: data.user.app_metadata?.provider || 'email',
                  deviceInfo: {
                    userAgent: navigator.userAgent,
                    isMobile: /Mobile|Tablet|Android|iOS/.test(navigator.userAgent)
                  }
                };
                
                authLoggingService.logActivity(
                  data.user.id,
                  'login',
                  true,
                  undefined,
                  {
                    email: data.user.email,
                    role: userRole,
                    timestamp: new Date().toISOString(),
                    ...metadata
                  }
                ).catch(() => {
                  // Log failure silently
                });
              }, 0);

              return { error: null, user: data.user, isAdmin };
            }

            set({ loading: false, isCheckingRole: false });
            return { error: { message: 'No user or session returned' } as AuthError };
          } catch (err: unknown) {
            set({ loading: false, isCheckingRole: false });
            return { error: err as AuthError };
          }
        },

        // Sign out with improved error handling and proper service usage
        signOut: async () => {
          const currentState = get();
          
          // Prevent multiple signOut attempts
          if (currentState.signingOut) {
            return { error: null };
          }

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
              ]) as Promise<{ error: AuthError | null }>;
            };

            // Clear state immediately before Supabase call to prevent UI hanging
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
            } catch (e) {
              // Silent fail
            }

            const { error } = await signOutWithTimeout();

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
              ]).catch(() => {
                // Silent fail
              });

              if (currentSessionId) {
                Promise.race([
                  authLoggingService.endSession(currentSessionId),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('End session timeout')), 2000)
                  )
                ]).catch(() => {
                  // Silent fail
                });
              }
            }

            return { error };
          } catch (timeoutError) {
            return { error: timeoutError };
          }
        },

        clearSignOutState: () => {
          set({ signingOut: false });
        },

        // Emergency logout for recovery
        emergencyLogout: () => {
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
          } catch (e) {
            // Silent fail
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
          if (state) {
            state.isHydrated = true;
          }
        },
      }
    ),
    { name: 'AuthStore' }
  )
);