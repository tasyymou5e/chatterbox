import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export const useAuthNavigation = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuthStore();

  useEffect(() => {
    // Make navigate available globally for auth context
    (window as any).__navigate = navigate;

    // Handle initial navigation for authenticated users
    if (!loading && user && userRole) {
      const currentPath = window.location.pathname;
      
      // Only redirect if we're on the auth page
      if (currentPath === '/auth') {
        switch (userRole) {
          case 'admin':
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