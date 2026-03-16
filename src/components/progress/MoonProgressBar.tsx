import { cn } from '@/lib/utils';
import { Moon, Star } from 'lucide-react';
import { STARS_PER_MOON } from '@/types/lessonProgress';

interface MoonProgressBarProps {
  currentStars: number;
  starsToMoon?: number;
  moonsEarned?: number;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MoonProgressBar({
  currentStars,
  starsToMoon = STARS_PER_MOON,
  moonsEarned = 0,
  showLabels = true,
  size = 'md',
  className,
}: MoonProgressBarProps) {
  const progress = (currentStars / starsToMoon) * 100;
  const isCloseToMoon = currentStars >= starsToMoon - 2;

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const starSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const moonSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Star icon at start */}
      <Star className={cn(starSizes[size], 'text-yellow-400 fill-yellow-400 flex-shrink-0')} />

      {/* Progress bar */}
      <div className="flex-1 relative">
        <div className={cn(
          'w-full rounded-full bg-muted overflow-hidden',
          sizeClasses[size]
        )}>
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500 ease-out',
              isCloseToMoon 
                ? 'bg-gradient-to-r from-yellow-400 via-amber-400 to-amber-300' 
                : 'bg-gradient-to-r from-yellow-500 to-yellow-400'
            )}
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer effect */}
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>

        {/* Star markers on the path */}
        <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
          {Array.from({ length: starsToMoon }, (_, i) => (
            <div
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors duration-300',
                i < currentStars
                  ? 'bg-yellow-200 shadow-[0_0_4px_rgba(250,204,21,0.5)]'
                  : 'bg-muted-foreground/20'
              )}
            />
          ))}
        </div>
      </div>

      {/* Moon at end */}
      <div className="relative flex-shrink-0">
        {isCloseToMoon && (
          <div className="absolute inset-0 animate-moon-pulse">
            <Moon className={cn(moonSizes[size], 'text-amber-200 blur-sm')} />
          </div>
        )}
        <Moon
          className={cn(
            moonSizes[size],
            'relative z-10 transition-colors duration-300',
            progress >= 100
              ? 'text-amber-300 fill-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
              : isCloseToMoon
              ? 'text-amber-300 fill-amber-200'
              : 'text-muted-foreground/50'
          )}
        />
        {moonsEarned > 0 && (
          <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold z-20">
            {moonsEarned}
          </div>
        )}
      </div>

      {/* Labels */}
      {showLabels && (
        <span className="text-xs text-muted-foreground ml-1 flex-shrink-0">
          {currentStars}/{starsToMoon}
        </span>
      )}
    </div>
  );
}
