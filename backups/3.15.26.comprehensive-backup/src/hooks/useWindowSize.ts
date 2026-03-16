import { useState, useEffect, useMemo } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

interface Breakpoints {
  isMobile: boolean;   // < 768
  isTablet: boolean;   // 768 - 1023
  isDesktop: boolean;  // 1024 - 1279
  isWide: boolean;     // >= 1280
}

/**
 * Custom hook that tracks window dimensions with debounced resize handling.
 * 
 * @description Provides reactive window dimensions and computed breakpoint flags.
 * Uses a 100ms debounce on resize events for performance.
 * 
 * @returns {WindowSize & Breakpoints} Current dimensions and breakpoint flags
 * 
 * @example
 * const { width, isMobile, isDesktop } = useWindowSize();
 * 
 * if (isMobile) {
 *   return <MobileLayout />;
 * }
 */
export function useWindowSize(): WindowSize & Breakpoints {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const handleResize = () => {
      // Debounce resize events for performance
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const breakpoints = useMemo(() => ({
    isMobile: windowSize.width < 768,
    isTablet: windowSize.width >= 768 && windowSize.width < 1024,
    isDesktop: windowSize.width >= 1024 && windowSize.width < 1280,
    isWide: windowSize.width >= 1280,
  }), [windowSize.width]);

  return { ...windowSize, ...breakpoints };
}
