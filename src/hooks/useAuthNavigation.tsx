import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export const useAuthNavigation = () => {
  const navigate = useNavigate();
  const { user, userRole, loading, session, isHydrated } = useAuthStore();
  const [navigationDebounce, setNavigationDebounce] = useState<NodeJS.Timeout | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [navigationAttempts, setNavigationAttempts] = useState(0);

  // Track when session is ready for navigation
  useEffect(() => {
    if (!loading && session !== undefined && isHydrated) {
      console.log('🔄 useAuthNavigation: Session ready for navigation', {
        loading,
        hasSession: !!session,
        isHydrated,
        timestamp: Date.now()
      });
      setSessionReady(true);
    }
  }, [loading, session, isHydrated]);

  useEffect(() => {
    // Clear any existing debounce timeout
    if (navigationDebounce) {
      clearTimeout(navigationDebounce);
    }

    // Make navigate available globally for auth context
    (window as any).__navigate = navigate;

    // Handle initial navigation for authenticated users with enhanced guards
    if (sessionReady && !loading && user && userRole && isHydrated) {
      const currentPath = window.location.pathname;
      
      // Prevent navigation loops by tracking attempts
      if (navigationAttempts > 3) {
        console.warn('🚨 useAuthNavigation: Too many navigation attempts, stopping to prevent loop');
        return;
      }
      
      console.log('🔄 useAuthNavigation: Checking navigation -', {
        currentPath,
        userRole,
        loading,
        sessionReady,
        isHydrated,
        navigationAttempts,
        timestamp: Date.now()
      });
      
      // SKIP admin users - let AdminLogin handle admin navigation to prevent race conditions
      if (userRole === 'admin') {
        console.log('🔄 useAuthNavigation: Skipping navigation for admin user - AdminLogin will handle');
        return;
      }
      
      // Only redirect non-admin users from auth page to prevent loops
      if (currentPath === '/auth' || currentPath === '/') {
        console.log('🎯 useAuthNavigation: Redirecting from auth page, attempt:', navigationAttempts + 1);
        setNavigationAttempts(prev => prev + 1);
        
        // Enhanced debounce navigation to prevent race conditions
        const timeout = setTimeout(() => {
          console.log('🚀 useAuthNavigation: Executing navigation for', userRole);
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
        }, 200); // Increased delay for better stability
        
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