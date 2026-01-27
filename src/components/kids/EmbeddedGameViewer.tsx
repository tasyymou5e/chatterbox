/**
 * EmbeddedGameViewer - Renders games inline within the Kids Portal
 * Handles both internal React games and external iframe games
 */

import React, { Suspense, useState, useEffect, useCallback, lazy } from 'react';
import { Button } from '@/components/ui/button';
import { X, Clock, Pause, Play, Coffee, Star, ArrowLeft } from 'lucide-react';
import type { KidContentItem, ChildProfile, SkillLevel } from '@/types/kidsPortal';
import type { CelebrationEvent } from '@/types/lessonProgress';
import { useGameSession } from '@/hooks/useGameSession';
import { CelebrationEffect } from '@/components/aac/CelebrationEffect';
import { cn } from '@/lib/utils';

// Lazy load game components
const MemoryMatchGame = lazy(() => import('@/components/games/MemoryMatchGame'));
const PatternMatchGame = lazy(() => import('@/components/games/PatternMatchGame'));
const SoundsMatchGame = lazy(() => import('@/components/games/SoundsMatchGame'));

interface EmbeddedGameViewerProps {
  game: KidContentItem | null;
  childProfile: ChildProfile | null;
  familyId?: string;
  onClose: () => void;
  onComplete?: (results: GameResults) => void;
}

interface GameResults {
  score: number;
  duration: number;
  completed: boolean;
  starsEarned: number;
  accuracy: number;
}

// Map game URLs to their component identifiers
type GameComponentId = 'memory-match' | 'pattern-match' | 'sounds-match';

const INTERNAL_GAME_ROUTES: Record<string, GameComponentId> = {
  '/games/memory-match': 'memory-match',
  '/games/pattern-match': 'pattern-match',
  '/games/sounds-match': 'sounds-match',
};

export const EmbeddedGameViewer: React.FC<EmbeddedGameViewerProps> = ({
  game,
  childProfile,
  familyId,
  onClose,
  onComplete,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'confetti' | 'stars' | 'hearts'>('stars');

  const breakIntervalMinutes = childProfile?.breakIntervalMinutes || 15;
  const breakIntervalSeconds = breakIntervalMinutes * 60;

  // Determine if this is an internal game
  const gameComponentId = game?.launchUrl ? INTERNAL_GAME_ROUTES[game.launchUrl] : null;
  const isInternalGame = !!gameComponentId;

  // Game session integration
  const handleCelebration = useCallback((event: CelebrationEvent) => {
    if (event.type === 'moonReached' || event.type === 'levelCompleted') {
      setCelebrationType('confetti');
    } else if (event.type === 'starEarned') {
      setCelebrationType('stars');
    }
    setShowCelebration(true);
  }, []);

  const gameSession = useGameSession({
    categoryId: game?.categoryId || 'default',
    contentItemId: game?.id || '',
    userId: childProfile?.id || '',
    familyId: familyId || '',
    onCelebration: handleCelebration,
  });

  // Start session when game loads
  useEffect(() => {
    if (game && !isLoading && !gameSession.isActive) {
      gameSession.startSession();
    }
  }, [game, isLoading, gameSession.isActive, gameSession.startSession]);

  // Reset state when game changes
  useEffect(() => {
    if (game) {
      setTimeElapsed(0);
      setIsPaused(false);
      setShowBreakReminder(false);
      setIsLoading(true);
      // For internal games, set loading to false after a brief delay
      if (isInternalGame) {
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [game?.id, isInternalGame]);

  // Timer for tracking elapsed time and break reminders
  useEffect(() => {
    if (!game || isPaused || showBreakReminder || isLoading) return;

    const timer = setInterval(() => {
      setTimeElapsed((prev) => {
        const newTime = prev + 1;
        
        // Check for break reminder
        if (newTime > 0 && newTime % breakIntervalSeconds === 0) {
          setShowBreakReminder(true);
          setIsPaused(true);
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [game, isPaused, showBreakReminder, breakIntervalSeconds, isLoading]);

  // Handle game close
  const handleClose = useCallback(() => {
    const stats = gameSession.endSession();
    
    if (onComplete) {
      onComplete({
        score: stats?.starsEarned || 0,
        duration: stats?.durationSeconds || timeElapsed,
        completed: (stats?.correctAnswers || 0) > 0,
        starsEarned: stats?.starsEarned || 0,
        accuracy: stats?.correctAnswers && stats?.incorrectAnswers 
          ? (stats.correctAnswers / (stats.correctAnswers + stats.incorrectAnswers)) * 100
          : 0,
      });
    }
    
    // Reset state
    setTimeElapsed(0);
    setIsLoading(true);
    setIsPaused(false);
    setShowBreakReminder(false);
    setShowCelebration(false);
    
    onClose();
  }, [onClose, onComplete, timeElapsed, gameSession]);

  // Handle resume from pause/break
  const handleResume = useCallback(() => {
    setIsPaused(false);
    setShowBreakReminder(false);
  }, []);

  // Handle internal game completion
  const handleGameComplete = useCallback((stats: { correct: number; incorrect: number; time?: number }) => {
    setShowCelebration(true);
    setCelebrationType('confetti');
    
    if (onComplete) {
      onComplete({
        score: stats.correct * 10,
        duration: stats.time || timeElapsed,
        completed: true,
        starsEarned: Math.floor(stats.correct / 3),
        accuracy: stats.correct + stats.incorrect > 0 
          ? (stats.correct / (stats.correct + stats.incorrect)) * 100 
          : 0,
      });
    }
  }, [onComplete, timeElapsed]);

  // Handle answer from internal game
  const handleAnswer = useCallback((isCorrect: boolean) => {
    gameSession.recordAnswer(isCorrect);
  }, [gameSession]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!game) return null;

  return (
    <>
      {/* Celebration effect overlay */}
      <CelebrationEffect
        isActive={showCelebration}
        type={celebrationType}
        onComplete={() => setShowCelebration(false)}
      />

      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{game.title}</h1>
              <p className="text-primary-foreground/80 text-sm">{game.categoryName || 'Educational Game'}</p>
            </div>
          </div>
          
          {/* Timer, stars, and controls */}
          <div className="flex items-center gap-3">
            {/* Stars earned this session */}
            <div className="flex items-center gap-1.5 bg-warning/20 rounded-full px-3 py-1.5">
              <Star className="h-4 w-4 text-warning fill-warning" />
              <span className="font-bold text-sm">{gameSession.starsEarned}</span>
            </div>
            
            <div className="flex items-center gap-2 bg-primary-foreground/20 rounded-full px-3 py-1.5">
              <Clock className="h-4 w-4" />
              <span className="font-mono text-sm">{formatTime(timeElapsed)}</span>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPaused(!isPaused)}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Session stats bar */}
        {gameSession.isActive && (gameSession.correctAnswers > 0 || gameSession.incorrectAnswers > 0) && (
          <div className="bg-gradient-to-r from-primary/80 to-accent/80 text-primary-foreground px-4 py-2 text-sm flex items-center gap-4">
            <span>✓ {gameSession.correctAnswers} correct</span>
            <span>Streak: {gameSession.currentStreak}</span>
            <span>Accuracy: {Math.round(gameSession.accuracy)}%</span>
          </div>
        )}

        {/* Game content area */}
        <div className="flex-1 relative bg-muted overflow-hidden">
          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">Loading game...</p>
                <p className="text-sm text-muted-foreground">Get ready to play!</p>
              </div>
            </div>
          )}

          {/* Internal React game component */}
          {isInternalGame && gameComponentId && (
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            }>
              <div className={cn("w-full h-full", isPaused && "pointer-events-none opacity-50")}>
                {gameComponentId === 'memory-match' && (
                  <MemoryMatchGame
                    skillLevel={(childProfile?.currentLevel as SkillLevel) || 'beginner'}
                    onComplete={handleGameComplete}
                    onAnswer={handleAnswer}
                    onClose={handleClose}
                  />
                )}
                {gameComponentId === 'pattern-match' && (
                  <PatternMatchGame
                    skillLevel={(childProfile?.currentLevel as SkillLevel) || 'beginner'}
                    onComplete={handleGameComplete}
                    onAnswer={handleAnswer}
                    onClose={handleClose}
                  />
                )}
                {gameComponentId === 'sounds-match' && (
                  <SoundsMatchGame
                    skillLevel={(childProfile?.currentLevel as SkillLevel) || 'beginner'}
                    onComplete={handleGameComplete}
                    onAnswer={handleAnswer}
                    onClose={handleClose}
                  />
                )}
              </div>
            </Suspense>
          )}

          {/* External game iframe */}
          {!isInternalGame && game.launchUrl && (
            <iframe
              src={game.launchUrl}
              className={cn(
                "w-full h-full border-0",
                isLoading && "opacity-0",
                isPaused && "pointer-events-none"
              )}
              onLoad={handleIframeLoad}
              title={game.title}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          )}

          {/* No game URL fallback */}
          {!game.launchUrl && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <span className="text-6xl mb-4 block">🎮</span>
                <h3 className="text-xl font-bold text-foreground mb-2">Game Coming Soon!</h3>
                <p className="text-muted-foreground">This game is still being prepared.</p>
              </div>
            </div>
          )}

          {/* Pause overlay */}
          {isPaused && !showBreakReminder && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-20">
              <div className="bg-card rounded-2xl p-8 text-center shadow-xl max-w-sm border">
                <Pause className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-foreground mb-2">Game Paused</h3>
                <p className="text-muted-foreground mb-6">Take your time! Press play when you're ready.</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleResume} size="lg">
                    <Play className="h-5 w-5 mr-2" />
                    Resume
                  </Button>
                  <Button variant="outline" onClick={handleClose} size="lg">
                    Exit Game
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Break reminder overlay */}
          {showBreakReminder && (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-accent/80 flex items-center justify-center z-20">
              <div className="bg-card rounded-2xl p-8 text-center shadow-xl max-w-md border">
                <Coffee className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-foreground mb-2">Time for a Break! ☕</h3>
                <p className="text-muted-foreground mb-2">
                  You've been playing for {formatTime(timeElapsed)}
                </p>
                <p className="text-muted-foreground mb-6">
                  Stand up, stretch, or get some water! 🧘‍♂️
                </p>
                <div className="space-y-3">
                  <Button onClick={handleResume} size="lg" className="w-full">
                    <Play className="h-5 w-5 mr-2" />
                    I'm Ready to Continue!
                  </Button>
                  <Button variant="outline" onClick={handleClose} size="lg" className="w-full">
                    Take a Longer Break (Exit)
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EmbeddedGameViewer;
