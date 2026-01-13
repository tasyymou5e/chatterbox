import { useEffect, useCallback, useState, useRef } from 'react';
import { X, Star, Loader2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useGameSession } from '@/hooks/useGameSession';
import { useCelebration } from '@/hooks/useCelebration';
import { CelebrationEffect } from '@/components/aac/CelebrationEffect';
import { StarBurstCelebration } from '@/components/progress/StarBurstCelebration';
import { CompletionCelebrationModal } from '@/components/progress/CompletionCelebrationModal';
import { isValidGameEvent, type GameEvent } from '@/types/gameEvents';
import type { CelebrationEvent, SkillLevel, CategoryProgress } from '@/types/lessonProgress';

interface ContentItem {
  id: string;
  title: string;
  url: string;
  content_type: string;
  category_id?: string;
  skill_levels?: string[];
}

interface LessonPlayerWrapperProps {
  contentItem: ContentItem;
  categoryId: string;
  categoryName?: string;
  userId: string;
  familyId: string;
  childName?: string;
  categoryProgress?: CategoryProgress;
  isOpen: boolean;
  onClose: () => void;
  onSessionComplete?: (stats: ReturnType<ReturnType<typeof useGameSession>['endSession']>) => void;
}

type CelebrationState = 
  | { type: 'none' }
  | { type: 'star'; message: string }
  | { type: 'moon' }
  | { type: 'levelComplete'; level: SkillLevel };

export function LessonPlayerWrapper({
  contentItem,
  categoryId,
  categoryName = 'Learning',
  userId,
  familyId,
  childName = 'Learner',
  categoryProgress,
  isOpen,
  onClose,
  onSessionComplete,
}: LessonPlayerWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<CelebrationState>({ type: 'none' });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { trigger: triggerCelebration, isActive: isCelebrating } = useCelebration();

  const handleCelebration = useCallback((event: CelebrationEvent) => {
    if (event.type === 'starEarned') {
      setCelebration({ type: 'star', message: 'Great job!' });
      triggerCelebration('stars');
    } else if (event.type === 'moonReached') {
      setCelebration({ type: 'moon' });
      triggerCelebration('confetti');
    } else if (event.type === 'levelCompleted') {
      setCelebration({ type: 'levelComplete', level: event.level! });
    }
  }, [triggerCelebration]);

  const {
    isActive,
    correctAnswers,
    currentStreak,
    starsEarned,
    accuracy,
    startSession,
    endSession,
    recordAnswer,
  } = useGameSession({
    categoryId,
    contentItemId: contentItem.id,
    userId,
    familyId,
    onCelebration: handleCelebration,
  });

  // Start session when dialog opens
  useEffect(() => {
    if (isOpen && !isActive) {
      startSession();
    }
  }, [isOpen, isActive, startSession]);

  // Listen for postMessage events from embedded games
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate event source (could add origin check for security)
      if (!isValidGameEvent(event.data)) return;

      const gameEvent: GameEvent = event.data;

      switch (gameEvent.type) {
        case 'answer':
          await recordAnswer(
            gameEvent.payload.isCorrect ?? false,
            gameEvent.payload.responseTimeMs
          );
          break;
        
        case 'complete':
          handleClose();
          break;
        
        case 'start':
          setIsLoading(false);
          break;
        
        case 'error':
          setError('Game encountered an error. Please try again.');
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [recordAnswer]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  // Handle iframe error
  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setError('Failed to load content. Please check your connection.');
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    const stats = endSession();
    if (onSessionComplete && stats) {
      onSessionComplete(stats);
    }
    onClose();
  }, [endSession, onSessionComplete, onClose]);

  // Clear celebration after display
  const handleCelebrationComplete = useCallback(() => {
    setCelebration({ type: 'none' });
  }, []);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 overflow-hidden">
          {/* Header with progress */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-4">
              <h2 className="font-semibold text-foreground truncate max-w-[300px]">
                {contentItem.title}
              </h2>
              {categoryProgress && (
                <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{categoryName}</span>
                  <span>•</span>
                  <span className="capitalize">{categoryProgress.currentLevel}</span>
                </div>
              )}
            </div>
            
            {/* Floating star counter */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded-full">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  {starsEarned}
                </span>
                {currentStreak >= 3 && (
                  <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                    🔥 {currentStreak}
                  </span>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content area */}
          <div className="relative flex-1 bg-background">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading game...</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                <div className="flex flex-col items-center gap-3 text-center px-4">
                  <AlertCircle className="w-12 h-12 text-destructive" />
                  <p className="text-destructive font-medium">{error}</p>
                  <Button onClick={() => iframeRef.current?.contentWindow?.location.reload()}>
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            <iframe
              ref={iframeRef}
              src={contentItem.url}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              allow="autoplay; fullscreen; microphone"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              title={contentItem.title}
            />
          </div>

          {/* Session stats footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>Correct: <strong className="text-green-600">{correctAnswers}</strong></span>
              {accuracy > 0 && (
                <span>Accuracy: <strong className="text-primary">{accuracy.toFixed(0)}%</strong></span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleClose}>
              End Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Star burst celebration */}
      <StarBurstCelebration
        isActive={celebration.type === 'star'}
        message={celebration.type === 'star' ? celebration.message : undefined}
        onComplete={handleCelebrationComplete}
      />

      {/* General celebration effects */}
      <CelebrationEffect
        isActive={isCelebrating}
        type={celebration.type === 'moon' ? 'confetti' : 'stars'}
        onComplete={handleCelebrationComplete}
      />

      {/* Level completion modal */}
      {celebration.type === 'levelComplete' && (
        <CompletionCelebrationModal
          isOpen={true}
          onClose={handleCelebrationComplete}
          categoryName={categoryName}
          categoryId={categoryId}
          skillLevel={celebration.level}
          childName={childName}
          userId={userId}
          familyId={familyId}
        />
      )}
    </>
  );
}
