import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export const useAuthNavigation = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuthStore();

  useEffect(() => {
    // Make navigate available globally for auth context
    (window as any).__navigate = navigate;

    // Handle initial navigation for authenticated users - with better timing
    if (!loading && user && userRole) {
      const currentPath = window.location.pathname;
      
      console.log('🔄 useAuthNavigation: Checking navigation -', {
        currentPath,
        userRole,
        loading
      });
      
      // Only redirect if we're on the auth page, not admin pages to prevent loops
      if (currentPath === '/auth') {
        console.log('🎯 useAuthNavigation: Redirecting from auth page');
        
        // Add a small delay to ensure auth state is fully established
        setTimeout(() => {
          switch (userRole) {
            case 'admin':
              console.log('🔄 useAuthNavigation: Redirecting admin to dashboard');
              navigate('/admin/dashboard');
              break;
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
        }, 100); // Small delay to prevent race conditions
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