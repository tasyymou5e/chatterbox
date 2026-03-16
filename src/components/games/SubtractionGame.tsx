import { useState, useEffect, useCallback, useRef } from 'react';
import { useLessonProgressStore } from '@/stores/lessonProgressStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Trophy, Sparkles } from 'lucide-react';
import { CelebrationEffect } from '@/components/aac/CelebrationEffect';
import type { SkillLevel } from '@/types/lessonProgress';

interface SubtractionGameProps {
  contentItemId: string;
  categoryId: string;
  skillLevel?: SkillLevel;
  onComplete?: (stats: { correct: number; total: number; accuracy: number }) => void;
}

export function SubtractionGame({ 
  contentItemId, 
  categoryId, 
  skillLevel = 'beginner',
  onComplete 
}: SubtractionGameProps) {
  const { recordAnswer } = useLessonProgressStore();
  
  const [current, setCurrent] = useState<{ a: number; b: number; correct: number } | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const startTime = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0, streak: 0 });
  const [isAnswering, setIsAnswering] = useState(false);
  const [done, setDone] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);

  const generate = useCallback(() => {
    let max: number;
    switch (skillLevel) {
      case 'advanced': max = 100; break;
      case 'intermediate': max = 50; break;
      default: max = 20;
    }
    const a = Math.floor(Math.random() * max) + Math.floor(max / 2);
    const b = Math.floor(Math.random() * (a - 1)) + 1;
    const correct = a - b;
    setCurrent({ a, b, correct });
    startTime.current = Date.now();

    const opts = [correct];
    while (opts.length < 4) {
      const wrong = correct + (Math.floor(Math.random() * 11) - 5);
      if (wrong >= 0 && !opts.includes(wrong)) opts.push(wrong);
    }
    setOptions(opts.sort(() => Math.random() - 0.5));
    setLastAnswerCorrect(null);
  }, [skillLevel]);

  const handleAnswer = async (selected: number) => {
    if (isAnswering || !current) return;
    setIsAnswering(true);

    const timeMs = Date.now() - startTime.current;
    const isCorrect = selected === current.correct;
    setLastAnswerCorrect(isCorrect);

    // Record answer using the store API
    const celebration = await recordAnswer(
      categoryId,
      contentItemId,
      isCorrect,
      timeMs
    );

    if (celebration) {
      setShowCelebration(true);
    }

    setScore(s => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
      streak: isCorrect ? s.streak + 1 : 0
    }));

    timeoutRef.current = setTimeout(() => {
      setIsAnswering(false);
      setShowCelebration(false);
      if (score.total + 1 >= 20) {
        setDone(true);
        onComplete?.({
          correct: score.correct + (isCorrect ? 1 : 0),
          total: score.total + 1,
          accuracy: ((score.correct + (isCorrect ? 1 : 0)) / (score.total + 1)) * 100
        });
      } else {
        generate();
      }
    }, isCorrect ? 900 : 1800);
  };

  useEffect(() => {
    generate();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [generate]);

  if (done) {
    const accuracy = Math.round((score.correct / score.total) * 100);
    return (
      <Card className="max-w-md mx-auto text-center p-8">
        <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Well Done!</h2>
        <p className="text-4xl font-bold text-primary mb-4">{accuracy}%</p>
        <div className="flex justify-center gap-4 text-muted-foreground">
          <span>{score.correct} correct</span>
          <span>{score.total - score.correct} incorrect</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-6 space-y-6">
          {/* Score header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="font-bold">{score.correct}/{score.total}</span>
            </div>
            {score.streak >= 3 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200">
                <Sparkles className="w-3 h-3 mr-1" />
                Streak: {score.streak}
              </Badge>
            )}
          </div>

          {/* Problem display */}
          <div className="text-center py-8">
            <p className="text-5xl font-bold tracking-wider">
              {current ? `${current.a} − ${current.b} = ?` : '...'}
            </p>
          </div>

          {/* Answer options */}
          <div className="grid grid-cols-2 gap-4">
            {options.map((n, i) => (
              <Button
                key={`${n}-${i}`}
                onClick={() => handleAnswer(n)}
                disabled={isAnswering}
                variant={
                  lastAnswerCorrect !== null && n === current?.correct
                    ? 'default'
                    : lastAnswerCorrect === false && n !== current?.correct
                    ? 'outline'
                    : 'outline'
                }
                className="h-20 text-3xl font-bold shadow-lg hover:scale-105 transition-transform motion-reduce:hover:scale-100"
                size="lg"
              >
                {n}
              </Button>
            ))}
          </div>

          {/* Feedback indicator */}
          {isAnswering && (
            <div className="text-center">
              <span className={`text-lg font-medium ${lastAnswerCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {lastAnswerCorrect ? 'Correct! ⭐' : 'Try again next time!'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <CelebrationEffect 
        isActive={showCelebration} 
        type="stars" 
        onComplete={() => setShowCelebration(false)} 
      />
    </div>
  );
}
