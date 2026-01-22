/**
 * MascotGuide - Contextual mascot that provides guidance throughout Kids Portal
 * Appears in different states based on user activity and provides helpful messages
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Mascot, MascotMood } from './Mascot';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

type GuideContext = 
  | 'welcome'
  | 'game-start'
  | 'game-progress'
  | 'game-complete'
  | 'streak'
  | 'idle'
  | 'encouragement'
  | 'break-reminder'
  | 'achievement'
  | 'custom';

interface MascotGuideProps {
  /** Current context for the mascot */
  context?: GuideContext;
  /** Child's name for personalized messages */
  childName?: string;
  /** Current streak count */
  streakCount?: number;
  /** Stars earned in current session */
  starsEarned?: number;
  /** Custom message override */
  customMessage?: string;
  /** Whether the guide is dismissible */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Position on screen */
  position?: 'bottom-right' | 'bottom-left' | 'inline';
  /** Additional CSS classes */
  className?: string;
  /** Whether to auto-hide after a delay */
  autoHide?: boolean;
  /** Auto-hide delay in ms */
  autoHideDelay?: number;
}

interface GuideConfig {
  mood: MascotMood;
  messages: string[];
}

/**
 * Get mascot configuration based on context
 */
function getGuideConfig(
  context: GuideContext,
  childName?: string,
  streakCount?: number,
  starsEarned?: number,
): GuideConfig {
  const name = childName || 'friend';

  switch (context) {
    case 'welcome':
      return {
        mood: 'waving',
        messages: [
          `Hi ${name}! 👋\nReady for fun?`,
          `Welcome back, ${name}!\nLet's play!`,
          `Hey ${name}! 🌟\nWhat shall we do?`,
        ],
      };
    case 'game-start':
      return {
        mood: 'excited',
        messages: [
          "Let's go! 🎮\nYou've got this!",
          "Game time! ⭐\nHave fun!",
          "Ready, set...\nPlay! 🚀",
        ],
      };
    case 'game-progress':
      return {
        mood: 'encouraging',
        messages: [
          "Great job! 👍\nKeep it up!",
          "You're doing\namazing! ✨",
          "Wow! So good!\nKeep going! 💪",
        ],
      };
    case 'game-complete':
      return {
        mood: 'celebrating',
        messages: [
          `🎉 Woohoo!\n${starsEarned ? `+${starsEarned} stars!` : 'You did it!'}`,
          "Amazing work! 🌟\nSo proud of you!",
          "Fantastic! 🎊\nYou're a star!",
        ],
      };
    case 'streak':
      return {
        mood: 'excited',
        messages: [
          `🔥 ${streakCount} day streak!\nIncredible!`,
          `Wow! ${streakCount} days!\nYou're on fire! 🔥`,
          `${streakCount} days strong! 💪\nKeep it going!`,
        ],
      };
    case 'idle':
      return {
        mood: 'thinking',
        messages: [
          "Hmm... 🤔\nWant to try a game?",
          "I know a fun\ngame we could play!",
          "Ready when\nyou are! 😊",
        ],
      };
    case 'encouragement':
      return {
        mood: 'encouraging',
        messages: [
          "You can do it! 💪\nI believe in you!",
          "Don't give up!\nYou're so close!",
          "Take your time,\nyou've got this! ⭐",
        ],
      };
    case 'break-reminder':
      return {
        mood: 'happy',
        messages: [
          "Time for a break! 🌈\nStretch a little!",
          "Let's rest our eyes\nfor a minute! 😌",
          "Break time! 🎈\nYou've played a lot!",
        ],
      };
    case 'achievement':
      return {
        mood: 'celebrating',
        messages: [
          "🏆 New achievement!\nYou're amazing!",
          "Look what you\nearned! 🎖️ Wow!",
          "Achievement\nunlocked! 🌟",
        ],
      };
    case 'custom':
    default:
      return {
        mood: 'happy',
        messages: ["Hi there! 😊"],
      };
  }
}

/**
 * MascotGuide component - Contextual mascot for the Kids Portal
 */
export function MascotGuide({
  context = 'welcome',
  childName,
  streakCount,
  starsEarned,
  customMessage,
  dismissible = true,
  onDismiss,
  position = 'bottom-right',
  className,
  autoHide = false,
  autoHideDelay = 5000,
}: MascotGuideProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);

  const config = useMemo(
    () => getGuideConfig(context, childName, streakCount, starsEarned),
    [context, childName, streakCount, starsEarned]
  );

  const message = customMessage || config.messages[messageIndex];

  // Rotate through messages periodically
  useEffect(() => {
    if (config.messages.length <= 1) {return;}
    
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % config.messages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [config.messages.length]);

  // Auto-hide functionality
  useEffect(() => {
    if (!autoHide) {return;}

    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, autoHideDelay);

    return () => clearTimeout(timer);
  }, [autoHide, autoHideDelay, onDismiss]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  if (!isVisible) {return null;}

  const positionClasses = {
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
    'inline': 'relative',
  };

  return (
    <div 
      className={cn(
        'animate-fade-in',
        positionClasses[position],
        className
      )}
    >
      <div className="relative">
        {dismissible && position !== 'inline' && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 z-10 h-6 w-6 rounded-full bg-background shadow-md"
            onClick={handleDismiss}
            aria-label="Dismiss mascot"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        
        <Mascot
          mood={config.mood}
          size={position === 'inline' ? 'md' : 'lg'}
          message={message}
          bubblePosition={position === 'bottom-left' ? 'right' : 'left'}
          animate
        />
      </div>
    </div>
  );
}

/**
 * Hook to manage mascot guide state
 */
export function useMascotGuide() {
  const [guideState, setGuideState] = useState<{
    context: GuideContext;
    customMessage?: string;
    visible: boolean;
  }>({
    context: 'welcome',
    visible: false,
  });

  const showGuide = useCallback((context: GuideContext, customMessage?: string) => {
    setGuideState({ context, customMessage, visible: true });
  }, []);

  const hideGuide = useCallback(() => {
    setGuideState((prev) => ({ ...prev, visible: false }));
  }, []);

  const celebrateAchievement = useCallback((achievement?: string) => {
    showGuide('achievement', achievement);
  }, [showGuide]);

  const encourageUser = useCallback((message?: string) => {
    showGuide('encouragement', message);
  }, [showGuide]);

  const suggestBreak = useCallback(() => {
    showGuide('break-reminder');
  }, [showGuide]);

  return {
    ...guideState,
    showGuide,
    hideGuide,
    celebrateAchievement,
    encourageUser,
    suggestBreak,
  };
}

export default MascotGuide;
