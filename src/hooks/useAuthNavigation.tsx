import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { cLog, cWarn, cInfo } from '@/utils/conditionalLogger';
import '@/types/interfaces'; // Import for Window interface extension

export const useAuthNavigation = () => {
  const navigate = useNavigate();
  const { user, userRole, loading, session, isHydrated } = useAuthStore();
  const [navigationDebounce, setNavigationDebounce] = useState<NodeJS.Timeout | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [navigationAttempts, setNavigationAttempts] = useState(0);

  // Track when session is ready for navigation
  useEffect(() => {
    if (!loading && session !== undefined && isHydrated) {
      cLog('Session ready for navigation', {
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

    // Make navigate available globally for auth context with proper typing
    window.__navigate = navigate;

    // Handle initial navigation for authenticated users with enhanced guards
    if (sessionReady && !loading && user && userRole && isHydrated) {
      const currentPath = window.location.pathname;
      
      // Prevent navigation loops with better user feedback
      if (navigationAttempts > 3) {
        cWarn('Too many navigation attempts detected - providing user guidance', {
          attempts: navigationAttempts,
          currentPath,
          userRole
        });
        // Reset attempts and provide recovery mechanism
        setNavigationAttempts(0);
        setSessionReady(false);
        return;
      }
      
      cLog('Checking navigation', {
        currentPath,
        userRole,
        loading,
        sessionReady,
        isHydrated,
        navigationAttempts,
        timestamp: Date.now()
      });
      
      // Only redirect users from auth page to prevent loops
      if (currentPath === '/auth' || currentPath === '/') {
        cInfo('Redirecting from auth page', { attempt: navigationAttempts + 1, userRole });
        setNavigationAttempts(prev => prev + 1);
        
        // Enhanced debounce navigation to prevent race conditions
        const timeout = setTimeout(() => {
          cInfo('Executing navigation', { userRole });
          switch (userRole) {
            case 'admin':
              navigate('/admin/dashboard');
              break;
            case 'parent':
              navigate('/parent');
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
      delete window.__navigate;
      if (navigationDebounce) {
        clearTimeout(navigationDebounce);
      }
    };
  }, [navigationDebounce]);
};