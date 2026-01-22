/**
 * useIllustration - Hook for managing illustration preloading and caching
 * Preloads illustrations based on current route for optimal performance
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

type IllustrationCategory = 'kids' | 'professional' | 'backgrounds';

// Track which categories have been preloaded
const preloadedCategories = new Set<IllustrationCategory>();

/**
 * Route-to-category mapping for smart preloading
 */
const routeCategoryMap: Record<string, IllustrationCategory[]> = {
  '/kids': ['kids', 'backgrounds'],
  '/games': ['kids'],
  '/parent': ['professional', 'backgrounds'],
  '/admin': ['professional'],
  '/': ['backgrounds'],
};

/**
 * Hook for managing illustration preloading
 */
export function useIllustration(options?: {
  preload?: IllustrationCategory[];
}) {
  const location = useLocation();
  const preloadedRef = useRef(preloadedCategories);

  /**
   * Preload a specific category of illustrations
   */
  const preloadCategory = useCallback(async (category: IllustrationCategory) => {
    if (preloadedRef.current.has(category)) {
      return; // Already preloaded
    }

    // Mark as preloaded immediately to prevent duplicate loads
    preloadedRef.current.add(category);

    // In a real implementation, this would dynamically import SVG modules
    // For now, we just track the preload status since SVGs are inline
    console.debug(`[useIllustration] Preloaded category: ${category}`);
  }, []);

  /**
   * Check if a category has been preloaded
   */
  const isLoaded = useCallback((category: IllustrationCategory): boolean => {
    return preloadedRef.current.has(category);
  }, []);

  /**
   * Preload categories based on options
   */
  useEffect(() => {
    if (options?.preload) {
      options.preload.forEach(category => {
        preloadCategory(category);
      });
    }
  }, [options?.preload, preloadCategory]);

  /**
   * Smart preloading based on current route
   */
  useEffect(() => {
    const pathname = location.pathname;
    
    // Find matching route pattern
    const matchingRoute = Object.keys(routeCategoryMap).find(route => 
      pathname.startsWith(route)
    );

    if (matchingRoute) {
      const categories = routeCategoryMap[matchingRoute];
      categories.forEach(category => {
        preloadCategory(category);
      });
    }
  }, [location.pathname, preloadCategory]);

  return {
    isLoaded,
    preloadCategory,
    preloadedCategories: Array.from(preloadedRef.current),
  };
}

export default useIllustration;
