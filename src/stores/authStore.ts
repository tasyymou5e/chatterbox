/**
 * Authentication Store
 * 
 * @description Centralized Zustand store for all authentication state and actions.
 * Handles user sessions, role management, and authentication flows.
 * 
 * @module authStore
 * 
 * @example
 * // Access auth state
 * const { user, isAdmin, loading } = useAuthStore();
 * 
 * // Perform auth actions
 * const { signIn, signOut } = useAuthStore();
 * await signIn('user@example.com', 'password');
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authLoggingService } from '@/services/authLoggingService';
import { type AuthError, type AuthMetadata, UserRoles, isAdminRole } from '@/types/auth';

/**
 * Authentication state interface.
 * 
 * @interface AuthState
 * @property {User | null} user - Current authenticated user or null
 * @property {Session | null} session - Current Supabase session or null
 * @property {string | null} userRole - User's role: 'admin', 'parent', 'child', or null
 * @property {boolean} isAdmin - Whether user has admin privileges
 * @property {boolean} loading - Loading state during auth operations
 * @property {boolean} isCheckingRole - Whether role is being verified
 * @property {boolean} sessionReady - Whether session has been initialized
 * @property {boolean} signingOut - Whether sign out is in progress
 * @property {boolean} isHydrated - Whether store has been hydrated from storage
 */
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

        /**
         * Fetches the highest-priority role for a user.
         * 
         * @description Uses single RPC call to get_primary_role for efficiency.
         * Returns highest priority role: admin > read_only > parent > child.
         * 
         * @param userId - The user ID to check roles for
         * @returns Promise resolving to role string or null if no role found
         * 
         * @example
         * const role = await fetchUserRole('user-uuid');
         * // Returns: 'admin' | 'read_only' | 'parent' | 'child' | null
         */
        fetchUserRole: async (userId: string): Promise<string | null> => {
          try {
            // Single RPC call instead of multiple role checks
            const { data, error } = await supabase.rpc('get_primary_role', { 
              _user_id: userId 
            });
            
            if (error) {
              console.error('Error fetching role:', error);
              return null;
            }
            
            return data;
          } catch (error) {
            console.error('Error in fetchUserRole:', error);
            return null;
          }
        },

        /**
         * Checks if a user has admin privileges.
         * 
         * @description Verifies if user has either 'admin' or 'read_only' role,
         * both of which grant access to the admin dashboard.
         * 
         * @param userId - The user ID to check
         * @returns Promise resolving to true if user has admin privileges
         * 
         * @example
         * const canAccessAdmin = await checkAdminRole('user-uuid');
         * if (canAccessAdmin) {
         *   navigate('/admin');
         * }
         */
        checkAdminRole: async (userId: string): Promise<boolean> => {
          try {
            // Check for full admin role
            const { data: isAdmin, error: adminError } = await supabase.rpc('has_role', {
              _user_id: userId,
              _role: UserRoles.ADMIN
            });

            if (adminError) {
              console.warn('Error checking admin role:', adminError);
            }

            // Check for read-only admin role
            const { data: isReadOnly, error: readOnlyError } = await supabase.rpc('has_role', {
              _user_id: userId,
              _role: UserRoles.READ_ONLY
            });

            if (readOnlyError) {
              console.warn('Error checking read_only role:', readOnlyError);
            }

            // Return true if user has either admin or read_only role
            return (isAdmin || false) || (isReadOnly || false);
          } catch (error) {
            console.error('Error in checkAdminRole:', error);
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
                    const hasAdminAccess = isAdminRole(role);
                    set({ 
                      userRole: role, 
                      isAdmin: hasAdminAccess,
                      isCheckingRole: false 
                    });
                  }).catch(() => {
                    set({ 
                      userRole: null,
                      isAdmin: false,
                      isCheckingRole: false 
                    });
                  });
                }
              } else if (event === 'SIGNED_OUT') {
                set({ 
                  session: null, 
                  user: null,
                  loading: false,
                  sessionReady: true,
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
          // CRITICAL: Always re-validate role on session restore to prevent stale isAdmin
          supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
              set({ 
                session, 
                user: session.user,
                loading: false,
                sessionReady: true,
                isCheckingRole: true
              });
              
              // Re-validate role every time we restore a session
              try {
                const role = await get().fetchUserRole(session.user.id);
                const hasAdminAccess = isAdminRole(role);
                set({ 
                  userRole: role, 
                  isAdmin: hasAdminAccess,
                  isCheckingRole: false 
                });
              } catch {
                // Clear admin state on role check failure
                set({ 
                  userRole: null, 
                  isAdmin: false,
                  isCheckingRole: false 
                });
              }
            } else {
              // No session - force clear any stale admin state
              set({ 
                session: null, 
                user: null,
                userRole: null,
                isAdmin: false,
                loading: false,
                sessionReady: true,
                isCheckingRole: false
              });
            }
          }).catch(() => {
            set({ 
              loading: false, 
              sessionReady: true, 
              userRole: null, 
              isAdmin: false,
              isCheckingRole: false
            });
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
          if (data?.user) {
            const userId = data.user.id;
            setTimeout(() => {
              const metadata: AuthMetadata = {
                signupMethod: 'email_password',
                deviceInfo: {
                  userAgent: navigator.userAgent,
                  isMobile: /Mobile|Tablet|Android|iOS/.test(navigator.userAgent)
                }
              };
              
              authLoggingService.logActivity(
                userId,
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
              const hasAdminAccess = isAdminRole(userRole);
              
              // Set ALL auth state atomically in single operation to prevent race conditions
              set({
                user: data.user,
                session: data.session,
                userRole,
                isAdmin: hasAdminAccess,
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

              return { error: null, user: data.user, isAdmin: hasAdminAccess };
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

            return { error: error as AuthError | null };
          } catch (timeoutError) {
            return { error: timeoutError as AuthError };
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
        // SECURITY: Do NOT persist isAdmin or userRole - always re-validate from server
        partialize: () => ({}),
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.isHydrated = true;
            // Force-clear any stale admin state on hydration
            state.isAdmin = false;
            state.userRole = null;
          }
        },
      }
    ),
    { name: 'AuthStore' }
  )
);