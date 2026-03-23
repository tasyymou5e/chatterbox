/**
 * ActivityExecutor - Step-by-step guided activity view for kids
 * with AI pause/resume, visual timer, and progress tracking.
 * For game-type items, renders the interactive SkillMatchGame instead.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Play, SkipForward, CheckCircle, Coffee, ArrowRight } from 'lucide-react';
import { useActivitySession } from '@/hooks/useActivitySession';
import { getDomainInfo, getItemTypeInfo } from '@/types/skillPlan';
import type { CatalogItem } from '@/types/skillPlan';
import { SkillMatchGame } from '@/components/games/SkillMatchGame';

interface ActivityExecutorProps {
  catalogItem: CatalogItem;
  planItemId?: string;
  isIdle?: boolean;
  onComplete?: () => void;
  onClose?: () => void;
}

export function ActivityExecutor({ catalogItem, planItemId, isIdle, onComplete, onClose }: ActivityExecutorProps) {
  const { session, startSession, updateProgress, pauseSession, resumeSession, completeSession } = useActivitySession();
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const domain = getDomainInfo(catalogItem.skill_domain);
  const itemType = getItemTypeInfo(catalogItem.item_type);

  // Start session on mount
  useEffect(() => {
    startSession(catalogItem.id, planItemId);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogItem.id]);

  // Timer
  useEffect(() => {
    if (session.sessionId && !session.isPaused && !session.isCompleted) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session.sessionId, session.isPaused, session.isCompleted]);

  // Auto-pause on idle timeout
  useEffect(() => {
    if (isIdle && session.sessionId && !session.isPaused && !session.isCompleted) {
      pauseSession('idle_timeout');
    }
  }, [isIdle, session.sessionId, session.isPaused, session.isCompleted, pauseSession]);

  // Periodic progress update every 30s
  useEffect(() => {
    if (timerSeconds > 0 && timerSeconds % 30 === 0 && !session.isPaused) {
      updateProgress(session.currentStep, timerSeconds);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerSeconds]);

  const handleNextStep = useCallback(async () => {
    const nextStep = session.currentStep + 1;
    if (nextStep >= session.totalSteps) {
      await completeSession();
      onComplete?.();
    } else {
      await updateProgress(nextStep, timerSeconds);
    }
  }, [session.currentStep, session.totalSteps, timerSeconds, completeSession, updateProgress, onComplete]);

  const handlePause = async () => {
    await pauseSession('child_request');
  };

  const handleResume = async () => {
    await resumeSession();
  };

  const handleSkip = async () => {
    await completeSession();
    onComplete?.();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = session.totalSteps > 0
    ? (session.currentStep / session.totalSteps) * 100
    : 0;

  const currentStepData = session.steps[session.currentStep];
  const maxSeconds = (catalogItem.max_duration_minutes || 30) * 60;
  const timerPercent = Math.min((timerSeconds / maxSeconds) * 100, 100);

  if (session.isCompleted) {
    return (
      <Card className="border-2 border-secondary">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold text-foreground">Great Job!</h2>
          <p className="text-muted-foreground text-center">
            You finished <strong>{catalogItem.title}</strong>!
          </p>
          <p className="text-sm text-muted-foreground">
            Time: {formatTime(timerSeconds)} • Steps completed: {session.totalSteps}
          </p>
          <Button onClick={onClose} size="lg" className="mt-4">
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (session.isPaused) {
    return (
      <Card className="border-2 border-accent">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="text-6xl">☕</div>
          <h2 className="text-2xl font-bold text-foreground">Break Time!</h2>
          {session.aiMessage && (
            <p className="text-center text-muted-foreground max-w-md">{session.aiMessage}</p>
          )}
          <p className="text-sm text-muted-foreground">
            You're on step {session.currentStep + 1} of {session.totalSteps}
          </p>
          <Button onClick={handleResume} size="lg" className="mt-4 gap-2">
            <Play className="h-5 w-5" /> Resume Activity
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{itemType.icon}</span>
            <CardTitle className="text-lg">{catalogItem.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={domain.color}>{domain.label}</Badge>
            <Badge variant="outline">{formatTime(timerSeconds)}</Badge>
          </div>
        </div>
        {/* Timer progress bar */}
        <div className="space-y-1">
          <Progress value={timerPercent} className="h-1" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {session.currentStep + 1} of {session.totalSteps}</span>
            <span>{catalogItem.estimated_duration_minutes || '?'} min estimated</span>
          </div>
        </div>
        {/* Step progress bar */}
        <Progress value={progressPercent} className="h-3" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current step display */}
        {currentStepData && (
          <div className="bg-primary/5 rounded-xl p-6 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold">
              {session.currentStep + 1}
            </div>
            <h3 className="text-xl font-bold text-foreground">{currentStepData.title}</h3>
            <p className="text-muted-foreground text-lg">{currentStepData.description}</p>
          </div>
        )}

        {/* AI message */}
        {session.aiMessage && (
          <div className="bg-accent/10 rounded-lg p-3 text-sm text-center">
            {session.aiMessage}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button onClick={handlePause} variant="outline" className="flex-1 gap-2">
            <Coffee className="h-4 w-4" /> Take a Break
          </Button>
          {session.currentStep < session.totalSteps - 1 ? (
            <Button onClick={handleNextStep} className="flex-1 gap-2">
              <ArrowRight className="h-4 w-4" /> Next Step
            </Button>
          ) : (
            <Button onClick={handleNextStep} className="flex-1 gap-2 bg-secondary hover:bg-secondary/90">
              <CheckCircle className="h-4 w-4" /> Finish!
            </Button>
          )}
        </div>

        <Button onClick={handleSkip} variant="ghost" size="sm" className="w-full text-muted-foreground gap-1">
          <SkipForward className="h-3 w-3" /> Skip this activity
        </Button>
      </CardContent>
    </Card>
  );
}

export default ActivityExecutor;
