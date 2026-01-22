/**
 * WaveBackground - Haikei-style wave backgrounds for visual enhancement
 * Layered SVG waves for hero sections and feature areas
 */

import { cn } from '@/lib/utils';

export type WaveVariant = 'hero' | 'soft' | 'accent' | 'footer';
export type WavePosition = 'top' | 'bottom' | 'both';

interface WaveBackgroundProps {
  /** Wave style variant */
  variant: WaveVariant;
  /** Position of the wave decoration */
  position?: WavePosition;
  /** Additional CSS classes for the container */
  className?: string;
  /** Content to render inside the wave background */
  children?: React.ReactNode;
  /** Whether to flip the wave vertically */
  flip?: boolean;
}

/**
 * Wave SVG components - Haikei style with layered waves
 */
const waves = {
  hero: {
    top: ({ className }: { className?: string }) => (
      <svg 
        viewBox="0 0 1440 120" 
        className={cn('w-full', className)} 
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="heroGradientTop" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3"/>
            <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.3"/>
          </linearGradient>
        </defs>
        <path 
          d="M0,60 C240,120 480,0 720,60 C960,120 1200,0 1440,60 L1440,0 L0,0 Z" 
          fill="url(#heroGradientTop)"
        />
        <path 
          d="M0,40 C280,100 560,20 840,60 C1120,100 1280,20 1440,40 L1440,0 L0,0 Z" 
          fill="hsl(var(--primary))" 
          fillOpacity="0.1"
        />
      </svg>
    ),
    bottom: ({ className }: { className?: string }) => (
      <svg 
        viewBox="0 0 1440 120" 
        className={cn('w-full', className)} 
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="heroGradientBottom" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2"/>
            <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.2"/>
          </linearGradient>
        </defs>
        <path 
          d="M0,60 C240,0 480,120 720,60 C960,0 1200,120 1440,60 L1440,120 L0,120 Z" 
          fill="url(#heroGradientBottom)"
        />
        <path 
          d="M0,80 C280,20 560,100 840,60 C1120,20 1280,100 1440,80 L1440,120 L0,120 Z" 
          fill="hsl(var(--primary))" 
          fillOpacity="0.08"
        />
        <path 
          d="M0,100 C360,60 720,100 1080,70 C1260,55 1360,90 1440,100 L1440,120 L0,120 Z" 
          fill="hsl(var(--secondary))" 
          fillOpacity="0.06"
        />
      </svg>
    ),
  },
  soft: {
    top: ({ className }: { className?: string }) => (
      <svg 
        viewBox="0 0 1440 80" 
        className={cn('w-full', className)} 
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,20 1440,40 L1440,0 L0,0 Z" 
          fill="hsl(var(--muted))" 
          fillOpacity="0.5"
        />
      </svg>
    ),
    bottom: ({ className }: { className?: string }) => (
      <svg 
        viewBox="0 0 1440 80" 
        className={cn('w-full', className)} 
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M0,40 C360,0 720,80 1080,40 C1260,20 1380,60 1440,40 L1440,80 L0,80 Z" 
          fill="hsl(var(--muted))" 
          fillOpacity="0.4"
        />
        <path 
          d="M0,60 C480,30 960,70 1440,50 L1440,80 L0,80 Z" 
          fill="hsl(var(--muted))" 
          fillOpacity="0.3"
        />
      </svg>
    ),
  },
  accent: {
    top: ({ className }: { className?: string }) => (
      <svg 
        viewBox="0 0 1440 100" 
        className={cn('w-full', className)} 
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="accentGradientTop" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.15"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="100" rx="400" ry="80" fill="url(#accentGradientTop)"/>
        <ellipse cx="1000" cy="100" rx="350" ry="70" fill="hsl(var(--secondary))" fillOpacity="0.12"/>
      </svg>
    ),
    bottom: ({ className }: { className?: string }) => (
      <svg 
        viewBox="0 0 1440 100" 
        className={cn('w-full', className)} 
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="accentGradientBottom" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.2"/>
          </linearGradient>
        </defs>
        <ellipse cx="400" cy="0" rx="450" ry="85" fill="url(#accentGradientBottom)"/>
        <ellipse cx="1100" cy="0" rx="380" ry="75" fill="hsl(var(--warning))" fillOpacity="0.1"/>
      </svg>
    ),
  },
  footer: {
    top: ({ className }: { className?: string }) => (
      <svg 
        viewBox="0 0 1440 100" 
        className={cn('w-full', className)} 
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M0,50 C240,100 480,0 720,50 C960,100 1200,0 1440,50 L1440,0 L0,0 Z" 
          fill="hsl(var(--card))" 
          fillOpacity="0.8"
        />
        <path 
          d="M0,30 C320,80 640,10 960,50 C1200,80 1360,20 1440,30 L1440,0 L0,0 Z" 
          fill="hsl(var(--muted))" 
          fillOpacity="0.4"
        />
      </svg>
    ),
    bottom: ({ className }: { className?: string }) => (
      <svg 
        viewBox="0 0 1440 60" 
        className={cn('w-full', className)} 
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,15 1440,30 L1440,60 L0,60 Z" 
          fill="hsl(var(--background))" 
          fillOpacity="0.9"
        />
      </svg>
    ),
  },
};

const heightMap: Record<WaveVariant, { top: string; bottom: string }> = {
  hero: { top: 'h-20 md:h-28', bottom: 'h-24 md:h-32' },
  soft: { top: 'h-12 md:h-16', bottom: 'h-16 md:h-20' },
  accent: { top: 'h-16 md:h-24', bottom: 'h-16 md:h-24' },
  footer: { top: 'h-16 md:h-20', bottom: 'h-10 md:h-14' },
};

/**
 * Wave background component for visual enhancement
 */
export function WaveBackground({
  variant,
  position = 'bottom',
  className,
  children,
  flip = false,
}: WaveBackgroundProps) {
  const WaveTop = waves[variant].top;
  const WaveBottom = waves[variant].bottom;
  const heights = heightMap[variant];

  return (
    <div className={cn('relative', className)}>
      {/* Top wave */}
      {(position === 'top' || position === 'both') && (
        <div 
          className={cn(
            'absolute left-0 right-0 top-0 overflow-hidden pointer-events-none z-0',
            heights.top,
            flip && 'transform rotate-180'
          )}
          aria-hidden="true"
        >
          <WaveTop className="absolute bottom-0" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Bottom wave */}
      {(position === 'bottom' || position === 'both') && (
        <div 
          className={cn(
            'absolute left-0 right-0 bottom-0 overflow-hidden pointer-events-none z-0',
            heights.bottom,
            flip && 'transform rotate-180'
          )}
          aria-hidden="true"
        >
          <WaveBottom className="absolute top-0" />
        </div>
      )}
    </div>
  );
}

/**
 * Standalone wave divider component
 */
export function WaveDivider({
  variant = 'soft',
  flip = false,
  className,
}: {
  variant?: WaveVariant;
  flip?: boolean;
  className?: string;
}) {
  const WaveBottom = waves[variant].bottom;
  const heights = heightMap[variant];

  return (
    <div 
      className={cn(
        'w-full overflow-hidden',
        heights.bottom,
        flip && 'transform rotate-180',
        className
      )}
      aria-hidden="true"
    >
      <WaveBottom className="w-full h-full" />
    </div>
  );
}

export default WaveBackground;
