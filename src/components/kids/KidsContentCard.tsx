/**
 * KidsContentCard - Touch-friendly content card for children
 * Features: large touch targets, progress rings, autism badges
 */

import React from 'react';
import { Heart, Play, Clock, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { KidContentItem } from '@/types/kidsPortal';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface KidsContentCardProps {
  item: KidContentItem;
  onLaunch: (item: KidContentItem) => void;
  onFavoriteToggle?: (item: KidContentItem) => void;
}

// Content type colors
const typeColors: Record<string, string> = {
  game: 'from-blue-400 to-cyan-400',
  chore: 'from-green-400 to-emerald-400',
  task: 'from-orange-400 to-amber-400',
  activity: 'from-pink-400 to-rose-400',
};

// Content type icons
const typeIcons: Record<string, string> = {
  game: '🎮',
  chore: '✅',
  task: '📋',
  activity: '✨',
};

const KidsContentCardComponent: React.FC<KidsContentCardProps> = ({
  item,
  onLaunch,
  onFavoriteToggle
}) => {
  const gradientClass = typeColors[item.type] || typeColors.game;
  const typeIcon = typeIcons[item.type] || '📌';

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(item);
  };

  const handleLaunch = () => {
    onLaunch(item);
  };

  // Get autism feature badges
  const autismBadges = [];
  if (item.autismFeatures?.sensory_friendly) autismBadges.push({ label: 'Sensory Friendly', emoji: '🎧' });
  if (item.autismFeatures?.visual_supports) autismBadges.push({ label: 'Visual', emoji: '👁️' });
  if (item.autismFeatures?.clear_instructions) autismBadges.push({ label: 'Clear Steps', emoji: '📝' });
  if (item.autismFeatures?.calming_elements) autismBadges.push({ label: 'Calming', emoji: '🧘' });

  return (
    <Card 
      className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 border-transparent hover:border-purple-300 dark:hover:border-purple-600"
      onClick={handleLaunch}
    >
      {/* Thumbnail / Gradient header */}
      <div className={cn(
        "relative h-32 bg-gradient-to-br",
        gradientClass,
        "flex items-center justify-center"
      )}>
        {item.thumbnailUrl ? (
          <img 
            src={item.thumbnailUrl} 
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-5xl">{typeIcon}</span>
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button 
            size="lg" 
            className="bg-white text-purple-600 hover:bg-white/90 shadow-lg"
            onClick={handleLaunch}
          >
            <Play className="h-5 w-5 mr-2 fill-current" />
            Play
          </Button>
        </div>

        {/* Favorite button */}
        {onFavoriteToggle && (
          <button
            onClick={handleFavoriteClick}
            className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors shadow-md"
            aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart 
              className={cn(
                "h-5 w-5 transition-colors",
                item.isFavorite ? "text-red-500 fill-red-500" : "text-gray-400"
              )} 
            />
          </button>
        )}

        {/* Progress ring (if has progress) */}
        {item.completionPercentage !== undefined && item.completionPercentage > 0 && (
          <div className="absolute top-2 left-2 bg-white/90 rounded-full p-1.5 shadow-md">
            <div className="relative w-8 h-8">
              <svg className="w-8 h-8 transform -rotate-90">
                <circle
                  className="text-gray-200"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="transparent"
                  r="14"
                  cx="16"
                  cy="16"
                />
                <circle
                  className="text-purple-500"
                  strokeWidth="3"
                  strokeDasharray={`${item.completionPercentage * 0.88} 88`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="14"
                  cx="16"
                  cy="16"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-purple-600">
                {Math.round(item.completionPercentage)}%
              </span>
            </div>
          </div>
        )}

        {/* Featured badge */}
        {item.familyAccess === 'featured' && (
          <Badge className="absolute bottom-2 left-2 bg-yellow-400 text-yellow-900">
            <Star className="h-3 w-3 mr-1 fill-current" />
            Featured
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        {/* Title */}
        <h3 className="font-bold text-lg text-foreground line-clamp-1 mb-1">
          {item.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {item.description}
        </p>

        {/* Meta info row */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {/* Age group */}
          {item.ageGroup.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              Ages {item.ageGroup.join(', ')}
            </Badge>
          )}
          
          {/* Duration */}
          {item.estimatedDuration && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {item.estimatedDuration}m
            </Badge>
          )}

          {/* Difficulty */}
          {item.difficultyLevel && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                item.difficultyLevel === 'easy' && "border-green-400 text-green-600",
                item.difficultyLevel === 'medium' && "border-yellow-400 text-yellow-600",
                item.difficultyLevel === 'hard' && "border-red-400 text-red-600"
              )}
            >
              {item.difficultyLevel.charAt(0).toUpperCase() + item.difficultyLevel.slice(1)}
            </Badge>
          )}
        </div>

        {/* Autism-friendly features */}
        {autismBadges.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {autismBadges.slice(0, 3).map((badge, index) => (
              <Badge key={index} variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                {badge.emoji} {badge.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Play stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
          <div className="flex items-center gap-3">
            {item.playCount !== undefined && item.playCount > 0 && (
              <span className="flex items-center gap-1">
                <Play className="h-3 w-3" />
                {item.playCount}x played
              </span>
            )}
            {item.bestScore !== undefined && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500" />
                {item.bestScore}%
              </span>
            )}
          </div>
          {item.lastPlayedAt && (
            <span>
              {formatDistanceToNow(new Date(item.lastPlayedAt), { addSuffix: true })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Memoized component to prevent unnecessary re-renders
export const KidsContentCard = React.memo(KidsContentCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.title === nextProps.item.title &&
    prevProps.item.isFavorite === nextProps.item.isFavorite &&
    prevProps.item.completionPercentage === nextProps.item.completionPercentage &&
    prevProps.item.playCount === nextProps.item.playCount &&
    prevProps.item.lastPlayedAt === nextProps.item.lastPlayedAt &&
    prevProps.item.familyAccess === nextProps.item.familyAccess
  );
});

export default KidsContentCard;
