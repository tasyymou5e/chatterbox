/**
 * SoundsMatchGame - Autism-friendly audio-visual matching game
 */

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { GameWrapper, AudioPlayer } from './shared';
import { SOUND_ITEMS, shuffleArray, getDifficultyFromSkillLevel, playSound } from './shared/gameUtils';
import { CelebrationEffect } from '@/components/aac/CelebrationEffect';
import type { SkillLevel } from '@/types/kidsPortal';

interface SoundsMatchGameProps {
  skillLevel?: SkillLevel;
  onComplete?: (stats: { correct: number; incorrect: number }) => void;
  onAnswer?: (isCorrect: boolean) => void;
  onClose: () => void;
}

export function SoundsMatchGame({ skillLevel = 'beginner', onComplete, onAnswer, onClose }: SoundsMatchGameProps) {
  const config = getDifficultyFromSkillLevel(skillLevel);
  const optionCount = Math.min(config.soundCount, 4);

  const [currentSound, setCurrentSound] = useState<typeof SOUND_ITEMS[number] | null>(null);
  const [options, setOptions] = useState<typeof SOUND_ITEMS[number][]>([]);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const totalRounds = 5;

  const generateRound = useCallback(() => {
    const shuffled = shuffleArray([...SOUND_ITEMS]);
    const answer = shuffled[0];
    const wrongOptions = shuffled.slice(1, optionCount);
    
    setCurrentSound(answer);
    setOptions(shuffleArray([answer, ...wrongOptions]));
    setFeedback(null);
  }, [optionCount]);

  useEffect(() => {
    generateRound();
  }, [generateRound]);

  const handleSelect = useCallback((selected: typeof SOUND_ITEMS[number]) => {
    if (feedback || isPaused) return;

    const isCorrect = selected.id === currentSound?.id;
    setFeedback(selected.id);
    
    if (isCorrect) {
      if (soundEnabled) playSound('correct');
      setScore(s => s + 1);
      setShowCelebration(true);
      onAnswer?.(true);
      setTimeout(() => setShowCelebration(false), 1000);
    } else {
      if (soundEnabled) playSound('incorrect');
      setIncorrect(i => i + 1);
      onAnswer?.(false);
    }

    setTimeout(() => {
      if (round >= totalRounds) {
        setIsComplete(true);
        if (soundEnabled) playSound('complete');
        onComplete?.({ correct: score + (isCorrect ? 1 : 0), incorrect: incorrect + (isCorrect ? 0 : 1) });
      } else {
        setRound(r => r + 1);
        generateRound();
      }
    }, 1200);
  }, [feedback, isPaused, currentSound, soundEnabled, round, totalRounds, score, incorrect, onAnswer, onComplete, generateRound]);

  const handleRestart = useCallback(() => {
    setRound(1);
    setScore(0);
    setIncorrect(0);
    setIsComplete(false);
    generateRound();
  }, [generateRound]);

  return (
    <GameWrapper
      title="Sound Safari"
      categoryName="Listening Skills"
      isPaused={isPaused}
      onPause={() => setIsPaused(true)}
      onResume={() => setIsPaused(false)}
      onClose={onClose}
      onRestart={handleRestart}
      starsEarned={score}
      progress={(round / totalRounds) * 100}
      soundEnabled={soundEnabled}
      onSoundToggle={() => setSoundEnabled(s => !s)}
    >
      <div className="flex flex-col items-center justify-center h-full p-4 gap-6">
        {!isComplete ? (
          <>
            <p className="text-lg text-muted-foreground">Round {round} of {totalRounds}</p>
            <p className="text-xl font-medium">Listen and find the matching picture!</p>
            
            {currentSound && (
              <AudioPlayer
                soundId={currentSound.id}
                label={currentSound.label}
                size="lg"
                autoPlay
                className="w-full max-w-md"
              />
            )}

            <div className="grid grid-cols-2 gap-4 mt-4">
              {options.map((item) => {
                const isSelected = feedback === item.id;
                const isCorrectAnswer = item.id === currentSound?.id;
                const showCorrect = feedback && isCorrectAnswer;
                const showWrong = isSelected && !isCorrectAnswer;

                return (
                  <Button
                    key={item.id}
                    variant="outline"
                    className={`w-28 h-28 flex flex-col items-center justify-center gap-2 text-4xl 
                      ${showCorrect ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''} 
                      ${showWrong ? 'ring-2 ring-destructive bg-destructive/10' : ''}`}
                    onClick={() => handleSelect(item)}
                    disabled={!!feedback}
                  >
                    <span role="img" aria-label={item.label}>{item.emoji}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-primary mb-4">🎉 Amazing!</h2>
            <p className="text-xl text-muted-foreground">You matched {score} out of {totalRounds} sounds!</p>
          </div>
        )}
      </div>
      <CelebrationEffect isActive={showCelebration} type="stars" />
    </GameWrapper>
  );
}

export default SoundsMatchGame;
