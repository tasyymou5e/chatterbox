import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export const useAuthNavigation = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuthStore();

  useEffect(() => {
    // Make navigate available globally for auth context
    (window as any).__navigate = navigate;

    // Handle initial navigation for authenticated users - SKIP admin users to prevent conflicts
    if (!loading && user && userRole) {
      const currentPath = window.location.pathname;
      
      console.log('🔄 useAuthNavigation: Checking navigation -', {
        currentPath,
        userRole,
        loading
      });
      
      // SKIP admin users - let AdminLogin handle admin navigation to prevent race conditions
      if (userRole === 'admin') {
        console.log('🔄 useAuthNavigation: Skipping navigation for admin user - AdminLogin will handle');
        return;
      }
      
      // Only redirect non-admin users from auth page to prevent loops
      if (currentPath === '/auth') {
        console.log('🎯 useAuthNavigation: Redirecting from auth page');
        
        switch (userRole) {
          case 'parent':
            navigate('/parent-dashboard');
            break;
          case 'child':
            navigate('/children/tasks');
            break;
          default:
            navigate('/parent-dashboard');
            break;
        }
      }
    }
  }, [navigate, user, userRole, loading]);

  // Clean up global navigate on unmount
  useEffect(() => {
    return () => {
      delete (window as any).__navigate;
    };
  }, []);
};