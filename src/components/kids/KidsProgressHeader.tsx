/**
 * KidsProgressHeader - Visual progress display with animations
 * Features: animated star counter, moon progress, level badge
 */

import React from 'react';
import { Star, Moon, Trophy, Flame } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { ChildProfile, SkillLevel } from '@/types/kidsPortal';
import { cn } from '@/lib/utils';

interface KidsProgressHeaderProps {
  profile: ChildProfile | null;
  starsToNextMoon?: number;
  className?: string;
}

const STARS_PER_MOON = 10;

const levelColors: Record<SkillLevel, string> = {
  beginner: 'bg-green-500',
  intermediate: 'bg-blue-500',
  advanced: 'bg-purple-500',
  expert: 'bg-yellow-500',
};

export const KidsProgressHeader: React.FC<KidsProgressHeaderProps> = ({
  profile,
  className
}) => {
  if (!profile) return null;

  const currentStars = profile.totalStars || 0;
  const currentMoons = profile.totalMoons || 0;
  const starsInCurrentMoon = currentStars % STARS_PER_MOON;
  const progressToNextMoon = (starsInCurrentMoon / STARS_PER_MOON) * 100;
  const currentLevel = profile.currentLevel || 'beginner';

  return (
    <div className={cn(
      "bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 md:p-6",
      className
    )}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Stars counter */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center shadow-lg">
              <Star className="h-8 w-8 text-white fill-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-700 rounded-full px-2 py-0.5 shadow text-sm font-bold text-yellow-600">
              {currentStars}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Stars</p>
            <p className="text-2xl font-bold text-foreground">{currentStars}</p>
          </div>
        </div>

        {/* Moon progress */}
        <div className="flex-1 max-w-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-blue-400 fill-blue-400" />
              <span className="text-sm font-medium text-foreground">
                {currentMoons} Moons earned
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {STARS_PER_MOON - starsInCurrentMoon} more stars to next moon
            </span>
          </div>
          <div className="relative">
            <Progress value={progressToNextMoon} className="h-3 bg-blue-100 dark:bg-blue-900/30" />
            <div className="absolute top-0 left-0 h-full w-full flex items-center justify-end pr-1">
              <Moon className={cn(
                "h-4 w-4 transition-[color,transform]",
                progressToNextMoon >= 100 
                  ? "text-blue-400 fill-blue-400 scale-110" 
                  : "text-blue-200 dark:text-blue-800"
              )} />
            </div>
          </div>
          <div className="flex justify-between mt-1">
            {Array.from({ length: STARS_PER_MOON }).map((_, i) => (
              <Star 
                key={i}
                className={cn(
                  "h-3 w-3 transition-colors",
                  i < starsInCurrentMoon 
                    ? "text-yellow-400 fill-yellow-400" 
                    : "text-gray-200 dark:text-gray-700"
                )}
              />
            ))}
          </div>
        </div>

        {/* Level & Streak */}
        <div className="flex items-center gap-4">
          {/* Current Level */}
          <div className="text-center">
            <Badge className={cn(
              "text-white mb-1",
              levelColors[currentLevel]
            )}>
              <Trophy className="h-3 w-3 mr-1" />
              {currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)}
            </Badge>
            <p className="text-xs text-muted-foreground">Level</p>
          </div>

          {/* Streak */}
          {profile.currentStreak && profile.currentStreak > 0 && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-orange-500">
                <Flame className="h-5 w-5 fill-orange-500" />
                <span className="text-xl font-bold">{profile.currentStreak}</span>
              </div>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KidsProgressHeader;
