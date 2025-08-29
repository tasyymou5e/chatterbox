import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationGuardOptions {
  maxAttempts?: number;
  cooldownMs?: number;
}

export const useNavigationGuard = (options: NavigationGuardOptions = {}) => {
  const { maxAttempts = 5, cooldownMs = 5000 } = options;
  const location = useLocation();
  const navigationHistory = useRef<Array<{ path: string; timestamp: number }>>([]);
  const isInCooldown = useRef(false);

  useEffect(() => {
    const now = Date.now();
    const currentPath = location.pathname;

    // Add current navigation to history
    navigationHistory.current.push({ path: currentPath, timestamp: now });

    // Clean old entries (older than cooldown period)
    navigationHistory.current = navigationHistory.current.filter(
      entry => now - entry.timestamp < cooldownMs
    );

    // Check for rapid navigation loops
    const recentSamePath = navigationHistory.current.filter(
      entry => entry.path === currentPath && now - entry.timestamp < 1000
    );

    if (recentSamePath.length >= maxAttempts) {
      console.warn('🚨 NavigationGuard: Rapid navigation loop detected', {
        path: currentPath,
        attempts: recentSamePath.length,
        history: navigationHistory.current
      });
      isInCooldown.current = true;
      
      // Clear cooldown after specified time
      setTimeout(() => {
        isInCooldown.current = false;
        navigationHistory.current = [];
        console.log('🔄 NavigationGuard: Cooldown cleared');
      }, cooldownMs);
    }

    // Log navigation for debugging
    console.log('🔄 NavigationGuard: Navigation tracked', {
      currentPath,
      historyLength: navigationHistory.current.length,
      isInCooldown: isInCooldown.current
    });
  }, [location.pathname, maxAttempts, cooldownMs]);

  return {
    isInCooldown: isInCooldown.current,
    navigationHistory: navigationHistory.current,
    shouldBlockNavigation: () => isInCooldown.current
  };
};