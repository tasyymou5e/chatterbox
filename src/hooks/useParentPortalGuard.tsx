import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';

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

  const { requiredFamilyAccess = true, redirectPath = '/admin/dashboard' } = options;

  useEffect(() => {
    const checkAccess = async () => {
      if (loading) return;

      // If user is not authenticated, redirect to auth
      if (!user) {
        navigate('/auth');
        return;
      }

      // For non-admin users, check they have parent role
      if (!isAdmin && userRole !== 'parent') {
        navigate('/auth');
        return;
      }

      // If family access is required, check for family membership
      if (requiredFamilyAccess) {
        try {
          let hasFamily = false;
          
          if (isAdmin) {
            // Check if admin has any families they created
            const { data: adminFamilies, error } = await supabase
              .from('families')
              .select('id')
              .eq('created_by', user.id)
              .limit(1);

            if (error) {
              console.error('Error checking admin family access:', error);
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
              .select('id')
              .eq('user_id', user.id)
              .limit(1);

            if (error) {
              console.error('Error checking family membership:', error);
              // Allow access on error to avoid blocking legitimate users
              setIsAuthorized(true);
              setChecking(false);
              return;
            }

            hasFamily = familyMembership && familyMembership.length > 0;
          }

          // If no family found and this is a new parent, wait for auto-creation
          if (!hasFamily && userRole === 'parent' && familyCreationAttempts < 3) {
            console.log('No family found for parent, waiting for auto-creation...', {
              attempt: familyCreationAttempts + 1
            });
            
            setFamilyCreationAttempts(prev => prev + 1);
            
            // Wait 2 seconds and retry
            setTimeout(() => {
              checkAccess();
            }, 2000);
            return;
          }

          // If still no family after attempts, redirect with message
          if (!hasFamily) {
            const message = isAdmin 
              ? 'Access to parent portal requires creating or being assigned to a family. Use the admin interface to manage families.'
              : 'Unable to set up your family account. Please contact support or try logging out and back in.';
              
            navigate(redirectPath, { 
              state: { message } 
            });
            return;
          }
        } catch (error) {
          console.error('Error in family access check:', error);
          // Allow access on error to avoid blocking legitimate users
        }
      }

      setIsAuthorized(true);
      setChecking(false);
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