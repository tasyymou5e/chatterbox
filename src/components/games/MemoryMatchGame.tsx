/**
 * MemoryMatchGame - Autism-friendly memory card matching game
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { GameWrapper, GameCard } from './shared';
import { createMemoryPairs, getDifficultyFromSkillLevel, playSound, prefersReducedMotion } from './shared/gameUtils';
import { CelebrationEffect } from '@/components/aac/CelebrationEffect';
import type { SkillLevel } from '@/types/kidsPortal';

interface MemoryMatchGameProps {
  skillLevel?: SkillLevel;
  onComplete?: (stats: { correct: number; incorrect: number; time: number }) => void;
  onAnswer?: (isCorrect: boolean) => void;
  onClose: () => void;
}

interface CardData {
  id: string;
  emoji: string;
  label: string;
  pairId: number;
  uniqueId: string;
}

export function MemoryMatchGame({ skillLevel = 'beginner', onComplete, onAnswer, onClose }: MemoryMatchGameProps) {
  const config = getDifficultyFromSkillLevel(skillLevel);
  const pairCount = (config.gridSize.cols * config.gridSize.rows) / 2;

  const [cards, setCards] = useState<CardData[]>([]);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [moves, setMoves] = useState(0);
  const [startTime] = useState(Date.now());
  const [showCelebration, setShowCelebration] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const reducedMotion = prefersReducedMotion();

  // Initialize game
  useEffect(() => {
    setCards(createMemoryPairs(pairCount) as CardData[]);
  }, [pairCount]);

  const progress = useMemo(() => 
    (matchedPairs.length / pairCount) * 100, 
    [matchedPairs.length, pairCount]
  );

  const handleCardClick = useCallback((cardId: string) => {
    if (isPaused || isProcessing || flippedIds.includes(cardId)) return;
    
    const card = cards.find(c => c.uniqueId === cardId);
    if (!card || matchedPairs.includes(card.pairId)) return;

    if (soundEnabled) playSound('click');

    if (flippedIds.length === 0) {
      setFlippedIds([cardId]);
    } else if (flippedIds.length === 1) {
      setFlippedIds(prev => [...prev, cardId]);
      setMoves(m => m + 1);
      setIsProcessing(true);

      const firstCard = cards.find(c => c.uniqueId === flippedIds[0]);
      
      setTimeout(() => {
        if (firstCard && firstCard.pairId === card.pairId) {
          // Match!
          if (soundEnabled) playSound('correct');
          setMatchedPairs(prev => [...prev, card.pairId]);
          setShowCelebration(true);
          onAnswer?.(true);
          setTimeout(() => setShowCelebration(false), 1000);
          
          // Check for game complete
          if (matchedPairs.length + 1 === pairCount) {
            if (soundEnabled) playSound('complete');
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            onComplete?.({ correct: matchedPairs.length + 1, incorrect: moves - matchedPairs.length, time: elapsed });
          }
        } else {
          // No match
          if (soundEnabled) playSound('incorrect');
          onAnswer?.(false);
        }
        setFlippedIds([]);
        setIsProcessing(false);
      }, reducedMotion ? 300 : 800);
    }
  }, [isPaused, isProcessing, flippedIds, cards, matchedPairs, soundEnabled, moves, pairCount, startTime, onAnswer, onComplete, reducedMotion]);

  const handleRestart = useCallback(() => {
    setCards(createMemoryPairs(pairCount) as CardData[]);
    setFlippedIds([]);
    setMatchedPairs([]);
    setMoves(0);
    setIsProcessing(false);
  }, [pairCount]);

  return (
    <GameWrapper
      title="Memory Match Adventure"
      categoryName="Cognitive Skills"
      isPaused={isPaused}
      onPause={() => setIsPaused(true)}
      onResume={() => setIsPaused(false)}
      onClose={onClose}
      onRestart={handleRestart}
      starsEarned={matchedPairs.length}
      progress={progress}
      soundEnabled={soundEnabled}
      onSoundToggle={() => setSoundEnabled(s => !s)}
    >
      <div className="flex flex-col items-center justify-center h-full p-4">
        <p className="text-muted-foreground mb-4">
          Find all {pairCount} matching pairs! Moves: {moves}
        </p>
        
        <div 
          className="grid gap-2 sm:gap-3"
          style={{ 
            gridTemplateColumns: `repeat(${config.gridSize.cols}, minmax(0, 1fr))`,
            maxWidth: '500px'
          }}
        >
          {cards.map(card => (
            <GameCard
              key={card.uniqueId}
              id={card.uniqueId}
              content={card.emoji}
              label={card.label}
              isFlipped={flippedIds.includes(card.uniqueId) || matchedPairs.includes(card.pairId)}
              isMatched={matchedPairs.includes(card.pairId)}
              isSelected={flippedIds.includes(card.uniqueId)}
              isDisabled={isProcessing}
              onClick={handleCardClick}
              size="md"
            />
          ))}
        </div>

        {matchedPairs.length === pairCount && (
          <div className="mt-6 text-center">
            <h2 className="text-2xl font-bold text-primary mb-2">🎉 You did it!</h2>
            <p className="text-muted-foreground">All pairs found in {moves} moves!</p>
          </div>
        )}
      </div>

      <CelebrationEffect isActive={showCelebration} type="stars" />
    </GameWrapper>
  );
}

export default MemoryMatchGame;
