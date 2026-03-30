/**
 * FavoriteThingsSidebar - Collapsible right panel with quick-access learning modules
 * Shows core learning categories and child's favorite/top-played items
 * ConnectSphere "Favorite Things" feature adaptation
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FavoriteItem {
  id: string;
  emoji: string;
  label: string;
  domain: string;
}

const CORE_FAVORITES: FavoriteItem[] = [
  { id: 'abc', emoji: '🔤', label: 'ABC', domain: 'educational_learning' },
  { id: '123', emoji: '🔢', label: '123', domain: 'educational_learning' },
  { id: 'colors', emoji: '🎨', label: 'Colors', domain: 'educational_learning' },
  { id: 'shapes', emoji: '🔷', label: 'Shapes', domain: 'academic' },
  { id: 'feelings', emoji: '😊', label: 'Feelings', domain: 'emotional_regulation' },
  { id: 'family', emoji: '👨‍👩‍👧‍👦', label: 'Family', domain: 'social' },
  { id: 'animals', emoji: '🐾', label: 'Animals', domain: 'educational_learning' },
  { id: 'music', emoji: '🎵', label: 'Music', domain: 'sensory' },
  { id: 'stories', emoji: '📖', label: 'Stories', domain: 'storytelling' },
  { id: 'games', emoji: '🎮', label: 'Games', domain: 'cognitive_development' },
];

interface FavoriteThingsSidebarProps {
  onItemSelect?: (item: FavoriteItem) => void;
}

export function FavoriteThingsSidebar({ onItemSelect }: FavoriteThingsSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleItemClick = useCallback((item: FavoriteItem) => {
    onItemSelect?.(item);
  }, [onItemSelect]);

  return (
    <>
      {/* Toggle button - always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed right-0 top-1/2 -translate-y-1/2 z-30',
          'bg-gradient-to-b from-pink-400 to-purple-500 text-white',
          'rounded-l-xl px-1.5 py-4 shadow-lg',
          'hover:px-2 transition-all motion-reduce:transition-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        )}
        aria-label={isOpen ? 'Close favorites' : 'Open favorites'}
      >
        {isOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        <Heart className="h-4 w-4 mt-1" />
      </button>

      {/* Sidebar panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full z-20 w-20 sm:w-24',
          'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md',
          'border-l-2 border-pink-200 dark:border-pink-800',
          'shadow-[-4px_0_20px_rgba(0,0,0,0.1)]',
          'transition-transform duration-300 motion-reduce:transition-none',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="pt-20 px-2 pb-4 h-full overflow-y-auto">
          <p className="text-[10px] font-bold text-center text-muted-foreground uppercase tracking-wider mb-3">
            My Faves
          </p>
          <div className="flex flex-col gap-2">
            {CORE_FAVORITES.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl',
                  'bg-gradient-to-b from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30',
                  'border border-pink-200/50 dark:border-pink-800/50',
                  'hover:shadow-md hover:scale-105 active:scale-95',
                  'transition-all motion-reduce:transition-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                )}
                aria-label={item.label}
              >
                <span className="text-2xl" role="img" aria-hidden="true">{item.emoji}</span>
                <span className="text-[10px] sm:text-xs font-semibold text-foreground/80 leading-tight text-center">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
