import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export const useAuthNavigation = () => {
  const navigate = useNavigate();
  const { user, userRole, loading, session } = useAuthStore();
  const [navigationDebounce, setNavigationDebounce] = useState<NodeJS.Timeout | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  // Track when session is ready for navigation
  useEffect(() => {
    if (!loading && session !== undefined) {
      setSessionReady(true);
    }
  }, [loading, session]);

  useEffect(() => {
    // Clear any existing debounce timeout
    if (navigationDebounce) {
      clearTimeout(navigationDebounce);
    }

    // Make navigate available globally for auth context
    (window as any).__navigate = navigate;

    // Handle initial navigation for authenticated users with debouncing
    if (sessionReady && !loading && user && userRole) {
      const currentPath = window.location.pathname;
      
      console.log('🔄 useAuthNavigation: Checking navigation -', {
        currentPath,
        userRole,
        loading,
        sessionReady
      });
      
      // SKIP admin users - let AdminLogin handle admin navigation to prevent race conditions
      if (userRole === 'admin') {
        console.log('🔄 useAuthNavigation: Skipping navigation for admin user - AdminLogin will handle');
        return;
      }
      
      // Only redirect non-admin users from auth page to prevent loops
      if (currentPath === '/auth' || currentPath === '/') {
        console.log('🎯 useAuthNavigation: Redirecting from auth page');
        
        // Debounce navigation to prevent race conditions
        const timeout = setTimeout(() => {
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
        }, 100);
        
        setNavigationDebounce(timeout);
      }
    }
  }, [navigate, user, userRole, loading, sessionReady]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (navigationDebounce) {
        clearTimeout(navigationDebounce);
      }
    };
  }, [navigationDebounce]);

  // Clean up global navigate on unmount
  useEffect(() => {
    return () => {
      delete (window as any).__navigate;
      if (navigationDebounce) {
        clearTimeout(navigationDebounce);
      }
    };
  }, [navigationDebounce]);
};