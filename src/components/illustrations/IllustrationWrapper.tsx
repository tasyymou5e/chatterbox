/**
 * IllustrationWrapper - Base component for lazy-loaded illustrations
 * Provides loading states, error handling, and accessibility features
 */

import { useState, useEffect, Suspense, lazy, ComponentType } from 'react';
import { cn } from '@/lib/utils';

export type IllustrationSize = 'sm' | 'md' | 'lg' | 'xl';
export type IllustrationAnimation = 'fadeIn' | 'bounce' | 'float' | 'none';

interface IllustrationWrapperProps {
  /** The illustration component to render */
  children: React.ReactNode;
  /** Accessibility text for the illustration */
  alt: string;
  /** Size variant */
  size?: IllustrationSize;
  /** Additional CSS classes */
  className?: string;
  /** Animation on mount */
  animate?: IllustrationAnimation;
  /** Whether this is a decorative illustration (no alt text needed) */
  decorative?: boolean;
}

const sizeMap: Record<IllustrationSize, string> = {
  sm: 'w-20 h-20',
  md: 'w-40 h-40',
  lg: 'w-60 h-60',
  xl: 'w-80 h-80',
};

const animationMap: Record<IllustrationAnimation, string> = {
  fadeIn: 'animate-fade-in',
  bounce: 'animate-bounce',
  float: 'animate-[float_3s_ease-in-out_infinite]',
  none: '',
};

/**
 * Skeleton placeholder shown while illustration loads
 */
export function IllustrationSkeleton({ 
  size = 'md', 
  className 
}: { 
  size?: IllustrationSize; 
  className?: string;
}) {
  return (
    <div 
      className={cn(
        sizeMap[size],
        'rounded-full bg-muted/50 animate-pulse',
        className
      )}
      role="presentation"
      aria-hidden="true"
    />
  );
}

/**
 * Main wrapper component for illustrations
 */
export function IllustrationWrapper({
  children,
  alt,
  size = 'md',
  className,
  animate = 'fadeIn',
  decorative = false,
}: IllustrationWrapperProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const effectiveAnimation = prefersReducedMotion ? 'none' : animate;

  return (
    <div
      role={decorative ? 'presentation' : 'img'}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative}
      className={cn(
        sizeMap[size],
        animationMap[effectiveAnimation],
        'flex items-center justify-center',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Creates a lazy-loaded illustration component
 */
export function createLazyIllustration(
  importFn: () => Promise<{ default: ComponentType<{ className?: string }> }>
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyIllustration({ className }: { className?: string }) {
    return (
      <Suspense fallback={<IllustrationSkeleton className={className} />}>
        <LazyComponent className={className} />
      </Suspense>
    );
  };
}
