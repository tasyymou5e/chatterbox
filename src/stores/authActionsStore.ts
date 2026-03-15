/**
 * Auth Actions Store
 * 
 * @description Handles authentication flow actions (sign in, sign up, sign out, password reset).
 * Separated from main auth store for better maintainability and focused responsibility.
 * 
 * @module authActionsStore
 */
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authLoggingService } from '@/services/authLoggingService';
import { type AuthError, type AuthMetadata, isAdminRole } from '@/types/auth';
import { useAuthSessionStore } from './authSessionStore';
import { useAuthRoleStore } from './authRoleStore';
import { secureLog } from '@/utils/wideLogger';
import { broadcastAuthEvent } from '@/hooks/useAuthSessionGuard';

interface AuthResult {
  error: AuthError | null;
  user?: User;
  isAdmin?: boolean;
  userRole?: string | null;
}

/**
 * Auth actions state interface.
 */
interface AuthActionsState {
  // State
  signingOut: boolean;
  
  // Actions
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  resetPassword: (email: string, userType?: 'admin' | 'user') => Promise<AuthResult>;
  emergencyLogout: () => void;
  clearSignOutState: () => void;
}

export const useAuthActionsStore = create<AuthActionsState>()(
  subscribeWithSelector(
    devtools(
      (set, get) => ({
      // Initial state
      signingOut: false,

      clearSignOutState: () => set({ signingOut: false }),

      /**
       * Sign up with email and password
       */
      signUp: async (email: string, password: string, firstName?: string, lastName?: string) => {
        const sessionStore = useAuthSessionStore.getState();
        const redirectUrl = `${window.location.origin}/`;
        
        sessionStore.setLoading(true);
        
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

        sessionStore.setLoading(false);

        // Log signup attempt
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
              // Silent fail for logging
            });
          }, 0);
        }

        return { error: error as AuthError | null };
      },

      /**
       * Sign in with email and password
       */
      signIn: async (email: string, password: string) => {
        const sessionStore = useAuthSessionStore.getState();
        const roleStore = useAuthRoleStore.getState();
        
        try {
          sessionStore.setLoading(true);
          roleStore.setIsCheckingRole(true);
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) {
            // Log failed login attempt
            setTimeout(() => {
              authLoggingService.logActivity(
                email,
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
                // Silent fail
              });
            }, 0);
            
            sessionStore.setLoading(false);
            roleStore.setIsCheckingRole(false);
            return { error };
          }

          if (data?.user && data?.session) {
            // Fetch role synchronously
            const userRole = await roleStore.fetchUserRole(data.user.id);
            const hasAdminAccess = isAdminRole(userRole);
            
            // Set session state atomically
            sessionStore.setUser(data.user);
            sessionStore.setSession(data.session);
            sessionStore.setSessionReady(true);
            sessionStore.setLoading(false);

            // Log successful sign-in
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
                // Silent fail
              });
            }, 0);

            return { error: null, user: data.user, isAdmin: hasAdminAccess, userRole };
          }

          sessionStore.setLoading(false);
          roleStore.setIsCheckingRole(false);
          return { error: { message: 'No user or session returned' } as AuthError };
        } catch (err: unknown) {
          sessionStore.setLoading(false);
          roleStore.setIsCheckingRole(false);
          return { error: err as AuthError };
        }
      },

      /**
       * Sign out the current user
       */
      signOut: async () => {
        const currentState = get();
        const sessionStore = useAuthSessionStore.getState();
        const roleStore = useAuthRoleStore.getState();
        
        // Prevent multiple signOut attempts
        if (currentState.signingOut) {
          return { error: null };
        }

        set({ signingOut: true });
        
        const currentUserId = sessionStore.user?.id;

        try {
          // Clear state immediately
          sessionStore.clearSession();
          roleStore.clearRoles();
          
          // Force clear persisted state
          try {
            localStorage.removeItem('auth-session-store');
            sessionStorage.clear();
          } catch {
            // Silent fail
          }

          // Sign out with timeout
          const signOutWithTimeout = () => {
            return Promise.race([
              supabase.auth.signOut(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('SignOut timeout')), 5000)
              )
            ]) as Promise<{ error: AuthError | null }>;
          };

          const { error } = await signOutWithTimeout();

          set({ signingOut: false });

          // Log activity
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
                setTimeout(() => reject(new Error('Timeout')), 2000)
              )
            ]).catch(() => {
              // Silent fail
            });
          }

          return { error };
        } catch (err: unknown) {
          set({ signingOut: false });
          secureLog.error('SignOut error', err, 'AuthActionsStore');
          return { error: err as AuthError };
        }
      },

      /**
       * Reset password - works for all user types
       */
      resetPassword: async (email: string, userType: 'admin' | 'user' = 'user') => {
        try {
          const redirectUrl = userType === 'admin' 
            ? `${window.location.origin}/admin/reset-password-confirm`
            : `${window.location.origin}/auth?tab=reset-confirm`;
          
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
          });

          return { error: error as AuthError | null };
        } catch (err: unknown) {
          return { error: err as AuthError };
        }
      },

      /**
       * Emergency logout - force clear all state without API call
       */
      emergencyLogout: () => {
        const sessionStore = useAuthSessionStore.getState();
        const roleStore = useAuthRoleStore.getState();
        
        // Clear all stores
        sessionStore.clearSession();
        roleStore.clearRoles();
        set({ signingOut: false });
        
        // Clear local storage
        try {
          localStorage.removeItem('auth-session-store');
          sessionStorage.clear();
        } catch {
          // Silent fail
        }
        
          secureLog.security('emergency_logout', { timestamp: new Date().toISOString() }, 'medium');
        },
      }),
      { name: 'AuthActionsStore' }
    )
  )
);
