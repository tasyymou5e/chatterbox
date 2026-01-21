/**
 * GameWrapper - Common wrapper for all game components
 * Provides consistent header, controls, and autism-friendly accommodations
 */

import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Pause, Play, X, Volume2, VolumeX, 
  Star, Clock, RotateCcw, Settings 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useGameTimer } from './useGameTimer';
import { prefersReducedMotion } from './gameUtils';

interface GameWrapperProps {
  title: string;
  categoryName?: string;
  children: ReactNode;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onClose: () => void;
  onRestart?: () => void;
  starsEarned?: number;
  progress?: number; // 0-100
  showTimer?: boolean;
  soundEnabled?: boolean;
  onSoundToggle?: () => void;
  reducedMotion?: boolean;
  onReducedMotionToggle?: () => void;
}

export function GameWrapper({
  title,
  categoryName = 'Learning',
  children,
  isPaused,
  onPause,
  onResume,
  onClose,
  onRestart,
  starsEarned = 0,
  progress = 0,
  showTimer = true,
  soundEnabled = true,
  onSoundToggle,
  reducedMotion: reducedMotionProp,
  onReducedMotionToggle,
}: GameWrapperProps) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [internalReducedMotion, setInternalReducedMotion] = useState(prefersReducedMotion());
  
  const timer = useGameTimer();
  const reducedMotion = reducedMotionProp ?? internalReducedMotion;

  // Start timer on mount
  useEffect(() => {
    timer.start();
    return () => timer.reset();
  }, []);

  // Pause/resume timer with game
  useEffect(() => {
    if (isPaused) {
      timer.pause();
    } else {
      timer.resume();
    }
  }, [isPaused]);

  const handleClose = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  const confirmExit = useCallback(() => {
    setShowExitConfirm(false);
    onClose();
  }, [onClose]);

  const handleReducedMotionToggle = useCallback(() => {
    if (onReducedMotionToggle) {
      onReducedMotionToggle();
    } else {
      setInternalReducedMotion(prev => !prev);
    }
  }, [onReducedMotionToggle]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{categoryName}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Stars */}
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="h-5 w-5 fill-current" />
            <span className="font-bold">{starsEarned}</span>
          </div>

          {/* Timer */}
          {showTimer && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-mono text-sm">{timer.formatTime()}</span>
            </div>
          )}

          {/* Sound toggle */}
          {onSoundToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSoundToggle}
              aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </Button>
          )}

          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            aria-label="Game settings"
          >
            <Settings className="h-5 w-5" />
          </Button>

          {/* Pause/Play */}
          <Button
            variant="ghost"
            size="icon"
            onClick={isPaused ? onResume : onPause}
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
          >
            {isPaused ? (
              <Play className="h-5 w-5" />
            ) : (
              <Pause className="h-5 w-5" />
            )}
          </Button>

          {/* Restart */}
          {onRestart && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRestart}
              aria-label="Restart game"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          )}

          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            aria-label="Close game"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      {progress > 0 && (
        <div className="px-4 py-2 bg-muted/30">
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Game content */}
      <main className="flex-1 overflow-hidden relative">
        {children}

        {/* Paused overlay */}
        {isPaused && (
          <div 
            className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-6 z-50"
            style={{ animation: reducedMotion ? 'none' : 'fadeIn 0.2s ease-out' }}
          >
            <div className="text-center">
              <Pause className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Game Paused</h2>
              <p className="text-muted-foreground">Take a break whenever you need!</p>
            </div>
            <div className="flex gap-4">
              <Button onClick={onResume} size="lg" className="min-w-32">
                <Play className="mr-2 h-5 w-5" />
                Continue
              </Button>
              {onRestart && (
                <Button onClick={onRestart} variant="outline" size="lg">
                  <RotateCcw className="mr-2 h-5 w-5" />
                  Restart
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Exit confirmation dialog */}
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Game?</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave? Your progress in this session will be saved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExitConfirm(false)}>
              Keep Playing
            </Button>
            <Button onClick={confirmExit}>
              Leave Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Game Settings</DialogTitle>
            <DialogDescription>
              Customize your game experience
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {onSoundToggle && (
              <div className="flex items-center justify-between">
                <Label htmlFor="sound-toggle" className="flex flex-col gap-1">
                  <span>Sound Effects</span>
                  <span className="text-sm text-muted-foreground font-normal">
                    Play sounds for correct and incorrect answers
                  </span>
                </Label>
                <Switch
                  id="sound-toggle"
                  checked={soundEnabled}
                  onCheckedChange={onSoundToggle}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label htmlFor="motion-toggle" className="flex flex-col gap-1">
                <span>Reduced Motion</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Minimize animations for a calmer experience
                </span>
              </Label>
              <Switch
                id="motion-toggle"
                checked={reducedMotion}
                onCheckedChange={handleReducedMotionToggle}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GameWrapper;
