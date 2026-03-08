import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { logSupabaseQuery, logDataAccessIssue } from '@/utils/parentPortalLogger';
import { UserRoles } from '@/types/auth';
import { cLog, cWarn } from '@/utils/conditionalLogger';

interface ParentPortalGuardOptions {
  requiredFamilyAccess?: boolean;
  redirectPath?: string;
}

export const useParentPortalGuard = (options: ParentPortalGuardOptions = {}) => {
  const { user, userRole, loading, isAdmin } = useAuthStore();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [familyCreationAttempts, setFamilyCreationAttempts] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkInProgressRef = useRef(false);

  const { requiredFamilyAccess = true, redirectPath = '/auth' } = options;

  useEffect(() => {
    // Set up timeout protection - max 10 seconds for checking
    timeoutRef.current = setTimeout(() => {
      if (checking) {
        cWarn('Parent portal guard timed out - denying access');
        logDataAccessIssue('ParentPortalGuard', 'Guard check timed out after 10 seconds', {
          userId: user?.id,
        });
        setIsAuthorized(false);
        setChecking(false);
        navigate('/auth', { state: { error: 'Authorization check timed out. Please log in again.' } });
      }
    }, 10000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const checkAccess = async () => {
      // Prevent duplicate checks
      if (checkInProgressRef.current) return;
      if (loading) return;

      checkInProgressRef.current = true;

      try {
        // If user is not authenticated, redirect to auth
        if (!user) {
          cLog('ParentPortalGuard: No user, redirecting to auth');
          setChecking(false);
          navigate('/auth');
          return;
        }

        // If user has no role at all, redirect to auth — do not grant access
        if (!isAdmin && !userRole) {
          cWarn('ParentPortalGuard: User has no role assigned - denying access');
          setIsAuthorized(false);
          setChecking(false);
          navigate('/auth', { state: { error: 'Account setup incomplete. Please contact support.' } });
          return;
        }

        // For non-admin users, check they have parent role
        if (!isAdmin && userRole !== UserRoles.PARENT) {
          cLog('ParentPortalGuard: User role is not parent: ' + userRole);
          setChecking(false);
          navigate('/auth');
          return;
        }

        // If family access is required, check for family membership
        if (requiredFamilyAccess) {
          let hasFamily = false;
          
          if (isAdmin) {
            // Check if admin has any families they created
            const { data: adminFamilies, error } = await supabase
              .from('families')
              .select('id')
              .eq('created_by', user.id)
              .limit(1);

            logSupabaseQuery(
              { component: 'ParentPortalGuard', operation: 'checkAdminFamilies', userId: user.id, table: 'families' },
              { success: !error, error, rowCount: adminFamilies?.length || 0 }
            );

            if (error) {
              cLog('Error checking admin family access:', error);
              // Allow access on error to avoid blocking legitimate users
              setIsAuthorized(true);
              setChecking(false);
              return;
            }

            hasFamily = adminFamilies && adminFamilies.length > 0;
          } else {
            // Check if parent user is a family member
            const { data: familyMembership, error } = await supabase
              .from('family_members')
              .select('id, family_id')
              .eq('user_id', user.id)
              .limit(1);

            logSupabaseQuery(
              { component: 'ParentPortalGuard', operation: 'checkFamilyMembership', userId: user.id, table: 'family_members' },
              { success: !error, error, rowCount: familyMembership?.length || 0 }
            );

            if (error) {
              cLog('Error checking family membership:', error);
              // Allow access on error to avoid blocking legitimate users
              setIsAuthorized(true);
              setChecking(false);
              return;
            }

            hasFamily = familyMembership && familyMembership.length > 0;
            
            if (hasFamily) {
              cLog('ParentPortalGuard: Family membership found: ' + familyMembership[0].family_id);
            }
          }

          // If no family found and this is a new parent, wait for auto-creation
          if (!hasFamily && userRole === UserRoles.PARENT && familyCreationAttempts < 3) {
            cLog('ParentPortalGuard: No family found, waiting for auto-creation... Attempt: ' + (familyCreationAttempts + 1));
            
            logDataAccessIssue('ParentPortalGuard', 'No family found for parent, retrying', {
              userId: user.id,
              expectedData: 'family membership',
              actualResult: 'none found, attempt ' + (familyCreationAttempts + 1)
            });
            
            setFamilyCreationAttempts(prev => prev + 1);
            checkInProgressRef.current = false;
            
            // Wait 2 seconds and retry
            setTimeout(() => {
              checkAccess();
            }, 2000);
            return;
          }

          // If still no family after attempts, handle gracefully
          if (!hasFamily) {
            logDataAccessIssue('ParentPortalGuard', 'No family after all attempts', {
              userId: user.id,
              expectedData: 'family membership',
              actualResult: 'none after 3 attempts'
            });
            
            if (isAdmin) {
              // Admins can go to admin dashboard to manage families
              setChecking(false);
              navigate('/admin/dashboard', { 
                state: { message: 'Access to parent portal requires creating or being assigned to a family. Use the admin interface to manage families.' } 
              });
              return;
            }
            
            // For parent users, still authorize them — the dashboard should handle 
            // the no-family state with a family creation prompt instead of redirecting
            cLog('ParentPortalGuard: No family found for parent, authorizing with no-family state');
            setIsAuthorized(true);
            setChecking(false);
            return;
          }
        }

        cLog('ParentPortalGuard: Access authorized for user: ' + user.id);
        setIsAuthorized(true);
        setChecking(false);
      } catch (error) {
        cLog('Error in family access check:', error);
        logDataAccessIssue('ParentPortalGuard', 'Exception in access check', {
          userId: user?.id,
          actualResult: error instanceof Error ? error.message : 'Unknown error'
        });
        // Allow access on error to avoid blocking legitimate users
        setIsAuthorized(true);
        setChecking(false);
      } finally {
        checkInProgressRef.current = false;
      }
    };

    checkAccess();
  }, [user, userRole, loading, isAdmin, navigate, requiredFamilyAccess, redirectPath, familyCreationAttempts]);

  return {
    isAuthorized,
    checking,
    user,
    userRole,
    isAdmin
  };
};