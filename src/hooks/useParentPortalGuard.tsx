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

  const { requiredFamilyAccess = true, redirectPath = '/admin/dashboard' } = options;

  useEffect(() => {
    const checkAccess = async () => {
      if (loading) return;

      // If user is not authenticated, redirect to auth
      if (!user) {
        navigate('/auth');
        return;
      }

      // If user is admin but not a family creator, redirect to admin dashboard
      if (isAdmin && requiredFamilyAccess) {
        try {
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

          // If admin has no families, redirect to admin dashboard with message
          if (!adminFamilies || adminFamilies.length === 0) {
            console.log('Admin user has no families, redirecting to admin dashboard');
            navigate(redirectPath, { 
              state: { 
                message: 'Access to parent portal requires creating or being assigned to a family. Use the admin interface to manage families.' 
              } 
            });
            return;
          }
        } catch (error) {
          console.error('Error in admin family check:', error);
          // Allow access on error to avoid blocking legitimate users
        }
      }

      // For non-admin users, check they have parent role
      if (!isAdmin && userRole !== 'parent') {
        navigate('/auth');
        return;
      }

      setIsAuthorized(true);
      setChecking(false);
    };

    checkAccess();
  }, [user, userRole, loading, isAdmin, navigate, requiredFamilyAccess, redirectPath]);

  return {
    isAuthorized,
    checking,
    user,
    userRole,
    isAdmin
  };
};