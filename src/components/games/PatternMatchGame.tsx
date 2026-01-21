/**
 * PatternMatchGame - Autism-friendly pattern recognition game
 */

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { GameWrapper } from './shared';
import { PATTERN_SHAPES, shuffleArray, getDifficultyFromSkillLevel, playSound, prefersReducedMotion } from './shared/gameUtils';
import { CelebrationEffect } from '@/components/aac/CelebrationEffect';
import type { SkillLevel } from '@/types/kidsPortal';

interface PatternMatchGameProps {
  skillLevel?: SkillLevel;
  onComplete?: (stats: { correct: number; incorrect: number }) => void;
  onAnswer?: (isCorrect: boolean) => void;
  onClose: () => void;
}

export function PatternMatchGame({ skillLevel = 'beginner', onComplete, onAnswer, onClose }: PatternMatchGameProps) {
  const config = getDifficultyFromSkillLevel(skillLevel);
  const patternLength = config.patternLength;

  const [pattern, setPattern] = useState<typeof PATTERN_SHAPES[number][]>([]);
  const [options, setOptions] = useState<typeof PATTERN_SHAPES[number][]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<typeof PATTERN_SHAPES[number] | null>(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const totalRounds = 5;
  const reducedMotion = prefersReducedMotion();

  const generateRound = useCallback(() => {
    const shapes = shuffleArray([...PATTERN_SHAPES]);
    const newPattern = [];
    for (let i = 0; i < patternLength; i++) {
      newPattern.push(shapes[i % shapes.length]);
    }
    const answer = shapes[patternLength % shapes.length];
    
    setPattern(newPattern);
    setCorrectAnswer(answer);
    setOptions(shuffleArray([answer, ...shapes.slice(0, 3).filter(s => s.id !== answer.id)]).slice(0, 4));
    setFeedback(null);
  }, [patternLength]);

  useEffect(() => {
    generateRound();
  }, [generateRound]);

  const handleSelect = useCallback((selected: typeof PATTERN_SHAPES[number]) => {
    if (feedback || isPaused) return;

    const isCorrect = selected.id === correctAnswer?.id;
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    
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
    }, reducedMotion ? 500 : 1200);
  }, [feedback, isPaused, correctAnswer, soundEnabled, round, totalRounds, score, incorrect, onAnswer, onComplete, generateRound, reducedMotion]);

  const renderShape = (shape: typeof PATTERN_SHAPES[number], size = 48) => {
    const shapes: Record<string, JSX.Element> = {
      circle: <circle cx={size/2} cy={size/2} r={size/2 - 4} fill={shape.color} />,
      square: <rect x={4} y={4} width={size - 8} height={size - 8} fill={shape.color} />,
      triangle: <polygon points={`${size/2},4 ${size - 4},${size - 4} 4,${size - 4}`} fill={shape.color} />,
      diamond: <polygon points={`${size/2},4 ${size - 4},${size/2} ${size/2},${size - 4} 4,${size/2}`} fill={shape.color} />,
      star: <polygon points={`${size/2},4 ${size*0.62},${size*0.38} ${size - 4},${size*0.38} ${size*0.68},${size*0.58} ${size*0.78},${size - 4} ${size/2},${size*0.72} ${size*0.22},${size - 4} ${size*0.32},${size*0.58} 4,${size*0.38} ${size*0.38},${size*0.38}`} fill={shape.color} />,
      hexagon: <polygon points={`${size*0.25},${size*0.15} ${size*0.75},${size*0.15} ${size - 4},${size/2} ${size*0.75},${size*0.85} ${size*0.25},${size*0.85} 4,${size/2}`} fill={shape.color} />,
    };
    return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{shapes[shape.id]}</svg>;
  };

  return (
    <GameWrapper
      title="Pattern Detective"
      categoryName="Logic & Patterns"
      isPaused={isPaused}
      onPause={() => setIsPaused(true)}
      onResume={() => setIsPaused(false)}
      onClose={onClose}
      onRestart={() => { setRound(1); setScore(0); setIncorrect(0); setIsComplete(false); generateRound(); }}
      starsEarned={score}
      progress={(round / totalRounds) * 100}
      soundEnabled={soundEnabled}
      onSoundToggle={() => setSoundEnabled(s => !s)}
    >
      <div className="flex flex-col items-center justify-center h-full p-4 gap-6">
        {!isComplete ? (
          <>
            <p className="text-lg text-muted-foreground">Round {round} of {totalRounds} - What comes next?</p>
            
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
              {pattern.map((shape, i) => (
                <div key={i} className="p-2">{renderShape(shape, 56)}</div>
              ))}
              <div className="w-14 h-14 border-2 border-dashed border-primary rounded-lg flex items-center justify-center text-2xl text-primary">?</div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {options.map((shape) => (
                <Button
                  key={shape.id}
                  variant="outline"
                  className={`w-20 h-20 p-2 ${feedback === 'correct' && shape.id === correctAnswer?.id ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''} ${feedback === 'incorrect' && shape.id === correctAnswer?.id ? 'ring-2 ring-emerald-500' : ''}`}
                  onClick={() => handleSelect(shape)}
                  disabled={!!feedback}
                >
                  {renderShape(shape, 48)}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-primary mb-4">🎉 Great Job!</h2>
            <p className="text-xl text-muted-foreground">You got {score} out of {totalRounds} correct!</p>
          </div>
        )}
      </div>
      <CelebrationEffect isActive={showCelebration} type="stars" />
    </GameWrapper>
  );
}

export default PatternMatchGame;
