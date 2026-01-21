/**
 * GameCard - Reusable card component for memory/pattern games
 * Supports flipping animation, matched state, and high contrast mode
 */

import { memo, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { prefersReducedMotion } from './gameUtils';

interface GameCardProps {
  id: string;
  content: string | React.ReactNode;
  label: string;
  isFlipped: boolean;
  isMatched: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick: (id: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-16 h-16 text-2xl',
  md: 'w-20 h-20 text-3xl sm:w-24 sm:h-24 sm:text-4xl',
  lg: 'w-24 h-24 text-4xl sm:w-32 sm:h-32 sm:text-5xl',
};

function GameCardComponent({
  id,
  content,
  label,
  isFlipped,
  isMatched,
  isSelected = false,
  isDisabled = false,
  onClick,
  size = 'md',
  className,
}: GameCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  const reducedMotion = prefersReducedMotion();

  const handleClick = useCallback(() => {
    if (!isDisabled && !isMatched) {
      onClick(id);
    }
  }, [id, isDisabled, isMatched, onClick]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <button
      className={cn(
        'relative rounded-xl transition-all focus:outline-none focus:ring-4 focus:ring-primary/50',
        sizeClasses[size],
        isDisabled && 'cursor-not-allowed opacity-50',
        !isDisabled && !isMatched && 'cursor-pointer hover:scale-105 active:scale-95',
        isPressed && 'scale-95',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      disabled={isDisabled}
      aria-label={isFlipped ? label : 'Hidden card'}
      aria-pressed={isSelected}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      style={{
        perspective: '1000px',
      }}
    >
      <div
        className={cn(
          'absolute inset-0 rounded-xl transition-transform duration-300',
          !reducedMotion && 'transform-style-preserve-3d'
        )}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped || reducedMotion 
            ? 'rotateY(0deg)' 
            : 'rotateY(180deg)',
          transition: reducedMotion ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {/* Front face (content) */}
        <div
          className={cn(
            'absolute inset-0 rounded-xl flex items-center justify-center',
            'bg-card border-2 shadow-md',
            isMatched && 'bg-emerald-50 border-emerald-400 dark:bg-emerald-900/20',
            isSelected && !isMatched && 'border-primary ring-2 ring-primary/30',
            !isMatched && !isSelected && 'border-border'
          )}
          style={{
            backfaceVisibility: 'hidden',
          }}
          aria-hidden={!isFlipped}
        >
          {typeof content === 'string' ? (
            <span className="select-none" role="img" aria-label={label}>
              {content}
            </span>
          ) : (
            content
          )}
        </div>

        {/* Back face (hidden state) */}
        <div
          className={cn(
            'absolute inset-0 rounded-xl flex items-center justify-center',
            'bg-primary/10 border-2 border-primary/30',
            'hover:bg-primary/20 hover:border-primary/40'
          )}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          aria-hidden={isFlipped}
        >
          <span className="text-primary/50 text-3xl">?</span>
        </div>
      </div>

      {/* Matched checkmark overlay */}
      {isMatched && (
        <div 
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'bg-emerald-500/20 rounded-xl'
          )}
          style={{
            animation: reducedMotion ? 'none' : 'pulse 1s ease-out',
          }}
        >
          <span className="text-emerald-600 text-2xl" aria-hidden="true">✓</span>
        </div>
      )}
    </button>
  );
}

export const GameCard = memo(GameCardComponent);
export default GameCard;
