/**
 * KidsGameLauncher - Wrapper for launching games with autism-friendly features
 * Auto-applies child preferences, enables break reminders, integrates with progress tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pause, Play, X, Clock, Coffee, Star } from 'lucide-react';
import type { KidContentItem, ChildProfile } from '@/types/kidsPortal';
import type { CelebrationEvent } from '@/types/lessonProgress';
import { cn } from '@/lib/utils';
import { useGameSession } from '@/hooks/useGameSession';
import { CelebrationEffect } from '@/components/aac/CelebrationEffect';

interface KidsGameLauncherProps {
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

export const KidsGameLauncher: React.FC<KidsGameLauncherProps> = ({
  game,
  childProfile,
  familyId,
  onClose,
  onComplete
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'confetti' | 'stars' | 'hearts'>('stars');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const breakIntervalMinutes = childProfile?.breakIntervalMinutes || 15;
  const breakIntervalSeconds = breakIntervalMinutes * 60;

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

  // Timer for tracking elapsed time and break reminders
  useEffect(() => {
    if (!game || isPaused || showBreakReminder) return;

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
  }, [game, isPaused, showBreakReminder, breakIntervalSeconds]);

  // Listen for postMessage events from iframe
  useEffect(() => {
    if (!game) return;

    const handleMessage = async (event: MessageEvent) => {
      // Validate origin for security
      if (!event.origin.includes('lovable.app') && !event.origin.includes('localhost')) {
        return;
      }

      const { type, data } = event.data || {};
      
      if (type === 'GAME_ANSWER') {
        const { isCorrect, responseTimeMs } = data || {};
        if (typeof isCorrect === 'boolean') {
          await gameSession.recordAnswer(isCorrect, responseTimeMs);
        }
      } else if (type === 'GAME_COMPLETE') {
        handleClose();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [game, gameSession]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

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

  // Resume from pause/break
  const handleResume = useCallback(() => {
    setIsPaused(false);
    setShowBreakReminder(false);
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

      <Dialog open={!!game} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  {game.title}
                </DialogTitle>
                <DialogDescription className="text-white/80 text-sm">
                  {game.categoryName || 'Educational Game'}
                </DialogDescription>
              </div>
              
              {/* Timer, stars, and controls */}
              <div className="flex items-center gap-3">
                {/* Stars earned this session */}
                <div className="flex items-center gap-1.5 bg-yellow-400/20 rounded-full px-3 py-1.5">
                  <Star className="h-4 w-4 text-yellow-300 fill-yellow-300" />
                  <span className="font-bold text-sm">{gameSession.starsEarned}</span>
                </div>
                
                <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono text-sm">{formatTime(timeElapsed)}</span>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPaused(!isPaused)}
                  className="text-white hover:bg-white/20"
                >
                  {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            {/* Session stats bar */}
            {gameSession.isActive && (gameSession.correctAnswers > 0 || gameSession.incorrectAnswers > 0) && (
              <div className="flex items-center gap-4 mt-2 text-sm text-white/80">
                <span>✓ {gameSession.correctAnswers} correct</span>
                <span>Streak: {gameSession.currentStreak}</span>
                <span>Accuracy: {Math.round(gameSession.accuracy)}%</span>
              </div>
            )}
          </DialogHeader>

          {/* Game content area */}
          <div className="relative flex-1 bg-slate-100 dark:bg-slate-900">
            {/* Loading state */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-slate-900 z-10">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground">Loading game...</p>
                  <p className="text-sm text-muted-foreground">Get ready to play!</p>
                </div>
              </div>
            )}

            {/* Game iframe */}
            {game.launchUrl ? (
              <iframe
                ref={iframeRef}
                src={game.launchUrl}
                className={cn(
                  "w-full h-full border-0",
                  isLoading && "opacity-0"
                )}
                onLoad={handleIframeLoad}
                title={game.title}
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            ) : (
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
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-xl max-w-sm">
                  <Pause className="h-16 w-16 text-purple-500 mx-auto mb-4" />
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
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/80 to-purple-500/80 flex items-center justify-center z-20">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-xl max-w-md">
                  <Coffee className="h-16 w-16 text-blue-500 mx-auto mb-4" />
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
        </DialogContent>
      </Dialog>
    </>
  );
};

export default KidsGameLauncher;
