import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Moon, Star, Trophy, ChevronRight } from 'lucide-react';
import { MoonProgressBar } from './MoonProgressBar';
import { 
  SKILL_LEVEL_COLORS, 
  SKILL_LEVEL_LABELS, 
  type SkillLevel,
  type CategoryProgress 
} from '@/types/lessonProgress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface GoalBoardProps {
  categories: CategoryProgress[];
  onCategoryClick?: (categoryId: string) => void;
  className?: string;
}

export function GoalBoard({
  categories,
  onCategoryClick,
  className,
}: GoalBoardProps) {
  const [expanded, setExpanded] = useState(true);

  // Sort by close to completion first
  const sortedCategories = [...categories].sort((a, b) => {
    if (a.isCloseToMoon !== b.isCloseToMoon) return a.isCloseToMoon ? -1 : 1;
    if (a.isCloseToLevelUp !== b.isCloseToLevelUp) return a.isCloseToLevelUp ? -1 : 1;
    return b.moonsEarned - a.moonsEarned;
  });

  const closeToMoonCount = categories.filter(c => c.isCloseToMoon).length;

  return (
    <div className={cn(
      'bg-card border rounded-lg shadow-sm overflow-hidden',
      className
    )}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Goal Board</h3>
        </div>
        <div className="flex items-center gap-2">
          {closeToMoonCount > 0 && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              {closeToMoonCount} almost there!
            </Badge>
          )}
          <ChevronRight className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            expanded && 'rotate-90'
          )} />
        </div>
      </button>

      {/* Categories list */}
      {expanded && (
        <ScrollArea className="max-h-[400px]">
          <div className="p-2 space-y-2">
            {sortedCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Start learning to see your progress!
              </p>
            ) : (
              sortedCategories.map((category) => (
                <CategoryProgressCard
                  key={category.categoryId}
                  category={category}
                  onClick={() => onCategoryClick?.(category.categoryId)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

interface CategoryProgressCardProps {
  category: CategoryProgress;
  onClick?: () => void;
}

function CategoryProgressCard({ category, onClick }: CategoryProgressCardProps) {
  const levelColor = SKILL_LEVEL_COLORS[category.currentLevel];

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 rounded-lg border bg-background hover:bg-accent/30 transition-all text-left',
        category.isCloseToMoon && 'ring-2 ring-yellow-400/50 bg-yellow-50/10',
        category.isCloseToLevelUp && 'ring-2 ring-primary/50 bg-primary/5'
      )}
    >
      {/* Category header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {category.categoryIcon && (
            <span className="text-lg">{category.categoryIcon}</span>
          )}
          <span className="font-medium text-sm truncate max-w-[120px]">
            {category.categoryName || 'Category'}
          </span>
        </div>
        <Badge
          variant="outline"
          className="text-xs"
          style={{ 
            borderColor: levelColor, 
            color: levelColor,
            backgroundColor: `${levelColor}10`,
          }}
        >
          {SKILL_LEVEL_LABELS[category.currentLevel]}
        </Badge>
      </div>

      {/* Progress bar */}
      <MoonProgressBar
        currentStars={category.currentStars}
        starsToMoon={category.starsToMoon}
        moonsEarned={category.moonsEarned}
        size="sm"
        showLabels={false}
      />

      {/* Stats row */}
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Moon className="h-3 w-3" />
            {category.moonsEarned} moons
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            {Math.round(category.accuracy * 100)}%
          </span>
        </div>
        
        {category.isCloseToMoon && (
          <span className="text-yellow-600 font-medium animate-pulse">
            {category.starsToMoon - category.currentStars} to go!
          </span>
        )}
        
        {category.isCloseToLevelUp && !category.isCloseToMoon && (
          <span className="text-primary font-medium">
            Level up soon!
          </span>
        )}
      </div>
    </button>
  );
}
