import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Moon, Star } from 'lucide-react';
import { STARS_PER_MOON } from '@/types/lessonProgress';

interface StarProgressTrackerProps {
  currentStars: number;
  starsToMoon?: number;
  moonsEarned?: number;
  compact?: boolean;
  showMoonCount?: boolean;
  animate?: boolean;
  className?: string;
}

export function StarProgressTracker({
  currentStars,
  starsToMoon = STARS_PER_MOON,
  moonsEarned = 0,
  compact = false,
  showMoonCount = true,
  animate = true,
  className,
}: StarProgressTrackerProps) {
  const stars = useMemo(() => {
    return Array.from({ length: starsToMoon }, (_, i) => ({
      id: i,
      isEarned: i < currentStars,
      isNext: i === currentStars,
    }));
  }, [currentStars, starsToMoon]);

  const moonGlowIntensity = (currentStars / starsToMoon) * 100;
  const isCloseToMoon = currentStars >= starsToMoon - 2;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex items-center gap-1">
          <Star 
            className={cn(
              'h-4 w-4',
              currentStars > 0 ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
            )} 
          />
          <span className="text-sm font-medium">
            {currentStars}/{starsToMoon}
          </span>
        </div>
        {showMoonCount && moonsEarned > 0 && (
          <div className="flex items-center gap-1">
            <Moon className="h-4 w-4 text-amber-300 fill-amber-300" />
            <span className="text-sm font-medium">{moonsEarned}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Moon with glow effect */}
      <div className="relative">
        <div
          className={cn(
            'absolute inset-0 rounded-full blur-xl transition-all duration-500',
            isCloseToMoon && animate && 'animate-moon-pulse'
          )}
          style={{
            background: `radial-gradient(circle, rgba(255, 248, 220, ${moonGlowIntensity / 100 * 0.6}) 0%, transparent 70%)`,
            transform: 'scale(1.5)',
          }}
        />
        <Moon
          className={cn(
            'h-16 w-16 relative z-10 transition-all duration-300',
            moonGlowIntensity > 50 ? 'text-amber-300 fill-amber-200' : 'text-muted-foreground/50'
          )}
        />
        {moonsEarned > 0 && (
          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-20">
            {moonsEarned}
          </div>
        )}
      </div>

      {/* Star arc around the moon */}
      <div className="flex flex-wrap justify-center gap-2 max-w-[200px]">
        {stars.map((star) => (
          <div
            key={star.id}
            className={cn(
              'transition-all duration-300',
              animate && star.isEarned && 'animate-star-twinkle',
              star.isNext && 'opacity-50'
            )}
            style={{
              animationDelay: `${star.id * 0.1}s`,
            }}
          >
            <Star
              className={cn(
                'h-6 w-6 transition-all duration-300',
                star.isEarned 
                  ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]' 
                  : 'text-muted-foreground/30'
              )}
            />
          </div>
        ))}
      </div>

      {/* Progress text */}
      <p className="text-sm text-muted-foreground text-center">
        <span className="font-semibold text-foreground">{currentStars}</span>
        /{starsToMoon} stars to reach the moon!
      </p>

      {isCloseToMoon && (
        <p className="text-xs text-primary font-medium animate-pulse">
          ✨ Almost there! Keep going!
        </p>
      )}
    </div>
  );
}
