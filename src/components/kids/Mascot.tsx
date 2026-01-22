/**
 * Mascot - Animated guide character for Kids Portal
 * A friendly companion that guides, celebrates, and encourages children
 */

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

export type MascotMood = 
  | 'happy' 
  | 'excited' 
  | 'thinking' 
  | 'celebrating' 
  | 'encouraging' 
  | 'waving' 
  | 'sleeping';

export type MascotSize = 'sm' | 'md' | 'lg' | 'xl';

interface MascotProps {
  /** Current mood/emotion of the mascot */
  mood?: MascotMood;
  /** Size of the mascot */
  size?: MascotSize;
  /** Optional message to display in speech bubble */
  message?: string;
  /** Position of speech bubble */
  bubblePosition?: 'top' | 'right' | 'left';
  /** Whether to animate the mascot */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Name of the mascot (for accessibility) */
  name?: string;
}

const sizeClasses: Record<MascotSize, string> = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-48 h-48',
};

const moodAnimations: Record<MascotMood, string> = {
  happy: 'animate-[bounce_2s_ease-in-out_infinite]',
  excited: 'animate-[bounce_0.5s_ease-in-out_infinite]',
  thinking: 'animate-[float_3s_ease-in-out_infinite]',
  celebrating: 'animate-[bounce_0.3s_ease-in-out_infinite]',
  encouraging: 'animate-[float_2s_ease-in-out_infinite]',
  waving: 'animate-[bounce_1s_ease-in-out_infinite]',
  sleeping: 'animate-[pulse_4s_ease-in-out_infinite]',
};

/**
 * Speech bubble component for mascot messages
 */
function SpeechBubble({ 
  message, 
  position = 'top',
  className,
}: { 
  message: string; 
  position: 'top' | 'right' | 'left';
  className?: string;
}) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };

  const tailClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white dark:border-t-slate-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-white dark:border-r-slate-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-white dark:border-l-slate-800',
  };

  return (
    <div 
      className={cn(
        'absolute z-20 animate-fade-in',
        positionClasses[position],
        className
      )}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-2 shadow-lg border-2 border-primary/20 max-w-[200px]">
        <p className="text-sm font-medium text-foreground text-center whitespace-pre-line">
          {message}
        </p>
      </div>
      <div className={cn('absolute w-0 h-0', tailClasses[position])} />
    </div>
  );
}

/**
 * The mascot character SVG with different moods
 */
function MascotCharacter({ 
  mood, 
  className,
}: { 
  mood: MascotMood; 
  className?: string;
}) {
  // Eye and mouth expressions based on mood
  const expressions = useMemo(() => {
    switch (mood) {
      case 'happy':
        return {
          leftEye: <circle cx="35" cy="38" r="5" className="fill-foreground" />,
          rightEye: <circle cx="65" cy="38" r="5" className="fill-foreground" />,
          mouth: <path d="M35 55 Q50 70 65 55" fill="none" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" />,
          extras: null,
        };
      case 'excited':
        return {
          leftEye: (
            <g>
              <circle cx="35" cy="38" r="6" className="fill-foreground" />
              <circle cx="36" cy="36" r="2" className="fill-background" />
            </g>
          ),
          rightEye: (
            <g>
              <circle cx="65" cy="38" r="6" className="fill-foreground" />
              <circle cx="66" cy="36" r="2" className="fill-background" />
            </g>
          ),
          mouth: <ellipse cx="50" cy="60" rx="10" ry="8" className="fill-foreground" />,
          extras: (
            <>
              {/* Excitement lines */}
              <line x1="15" y1="25" x2="8" y2="18" className="stroke-warning" strokeWidth="2" strokeLinecap="round" />
              <line x1="85" y1="25" x2="92" y2="18" className="stroke-warning" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="35" x2="3" y2="35" className="stroke-warning" strokeWidth="2" strokeLinecap="round" />
              <line x1="88" y1="35" x2="97" y2="35" className="stroke-warning" strokeWidth="2" strokeLinecap="round" />
            </>
          ),
        };
      case 'thinking':
        return {
          leftEye: <circle cx="35" cy="40" r="4" className="fill-foreground" />,
          rightEye: (
            <g>
              <circle cx="65" cy="38" r="4" className="fill-foreground" />
              <path d="M58 32 L72 32" className="stroke-foreground" strokeWidth="2" strokeLinecap="round" />
            </g>
          ),
          mouth: <path d="M40 58 Q50 55 55 58" fill="none" className="stroke-foreground" strokeWidth="2" strokeLinecap="round" />,
          extras: (
            <>
              {/* Thought bubbles */}
              <circle cx="85" cy="15" r="8" className="fill-muted stroke-border" strokeWidth="1" />
              <circle cx="78" cy="28" r="4" className="fill-muted stroke-border" strokeWidth="1" />
              <circle cx="73" cy="35" r="2" className="fill-muted stroke-border" strokeWidth="1" />
              <text x="82" y="19" className="fill-primary" fontSize="10" fontWeight="bold">?</text>
            </>
          ),
        };
      case 'celebrating':
        return {
          leftEye: <path d="M30 36 Q35 40 40 36" fill="none" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" />,
          rightEye: <path d="M60 36 Q65 40 70 36" fill="none" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" />,
          mouth: <path d="M35 55 Q50 75 65 55" fill="none" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" />,
          extras: (
            <>
              {/* Confetti */}
              <rect x="10" y="10" width="6" height="6" rx="1" className="fill-primary" transform="rotate(15 13 13)" />
              <rect x="85" y="8" width="5" height="5" rx="1" className="fill-secondary" transform="rotate(-20 87 10)" />
              <rect x="5" y="50" width="4" height="4" rx="1" className="fill-accent" transform="rotate(30 7 52)" />
              <rect x="90" y="45" width="5" height="5" rx="1" className="fill-warning" transform="rotate(-10 92 47)" />
              {/* Stars */}
              <path d="M15 30 L17 34 L21 34 L18 37 L19 41 L15 38 L11 41 L12 37 L9 34 L13 34 Z" className="fill-warning" />
              <path d="M88 28 L89 31 L92 31 L90 33 L91 36 L88 34 L85 36 L86 33 L84 31 L87 31 Z" className="fill-warning" />
            </>
          ),
        };
      case 'encouraging':
        return {
          leftEye: (
            <g>
              <circle cx="35" cy="38" r="5" className="fill-foreground" />
              <path d="M28 30 L36 34" className="stroke-foreground" strokeWidth="2" strokeLinecap="round" />
            </g>
          ),
          rightEye: (
            <g>
              <circle cx="65" cy="38" r="5" className="fill-foreground" />
              <path d="M72 30 L64 34" className="stroke-foreground" strokeWidth="2" strokeLinecap="round" />
            </g>
          ),
          mouth: <path d="M38 55 Q50 65 62 55" fill="none" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" />,
          extras: (
            <>
              {/* Thumbs up */}
              <g transform="translate(85, 50) scale(0.4)">
                <circle cx="0" cy="0" r="20" className="fill-success/30" />
                <path d="M-5 5 L-5 -10 Q-5 -15 0 -15 L5 -15 Q10 -15 10 -10 L10 5 Q10 10 5 10 L0 10" className="fill-warning stroke-warning" strokeWidth="2" />
              </g>
              {/* Sparkle */}
              <path d="M12 45 L14 50 L19 50 L15 53 L17 58 L12 55 L7 58 L9 53 L5 50 L10 50 Z" className="fill-primary/60" />
            </>
          ),
        };
      case 'waving':
        return {
          leftEye: <circle cx="35" cy="38" r="5" className="fill-foreground" />,
          rightEye: <circle cx="65" cy="38" r="5" className="fill-foreground" />,
          mouth: <path d="M35 55 Q50 68 65 55" fill="none" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" />,
          extras: (
            <>
              {/* Waving arm/hand */}
              <g className="animate-[wave_0.5s_ease-in-out_infinite] origin-bottom-left">
                <ellipse cx="88" cy="55" rx="8" ry="10" className="fill-primary" />
                <circle cx="88" cy="45" r="6" className="fill-primary" />
              </g>
              {/* Motion lines */}
              <path d="M75 42 Q80 40 78 35" className="stroke-muted-foreground/50" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d="M78 48 Q83 46 81 41" className="stroke-muted-foreground/50" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </>
          ),
        };
      case 'sleeping':
        return {
          leftEye: <path d="M30 40 L40 40" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" />,
          rightEye: <path d="M60 40 L70 40" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" />,
          mouth: <ellipse cx="50" cy="58" rx="4" ry="3" className="fill-foreground/50" />,
          extras: (
            <>
              {/* ZZZ */}
              <text x="70" y="20" className="fill-muted-foreground" fontSize="10" fontWeight="bold">z</text>
              <text x="80" y="12" className="fill-muted-foreground" fontSize="12" fontWeight="bold">z</text>
              <text x="88" y="5" className="fill-muted-foreground" fontSize="14" fontWeight="bold">Z</text>
              {/* Blush */}
              <ellipse cx="25" cy="50" rx="6" ry="3" className="fill-pink-300/50" />
              <ellipse cx="75" cy="50" rx="6" ry="3" className="fill-pink-300/50" />
            </>
          ),
        };
      default:
        return {
          leftEye: <circle cx="35" cy="38" r="5" className="fill-foreground" />,
          rightEye: <circle cx="65" cy="38" r="5" className="fill-foreground" />,
          mouth: <path d="M35 55 Q50 65 65 55" fill="none" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" />,
          extras: null,
        };
    }
  }, [mood]);

  return (
    <svg 
      viewBox="0 0 100 100" 
      className={cn('w-full h-full', className)}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Body/Head - Cute round blob shape */}
      <ellipse 
        cx="50" 
        cy="55" 
        rx="40" 
        ry="38" 
        className="fill-primary"
      />
      
      {/* Inner highlight */}
      <ellipse 
        cx="50" 
        cy="50" 
        rx="35" 
        ry="33" 
        className="fill-primary/80"
      />
      
      {/* Cheek blush */}
      <ellipse cx="25" cy="52" rx="8" ry="5" className="fill-pink-300/40" />
      <ellipse cx="75" cy="52" rx="8" ry="5" className="fill-pink-300/40" />
      
      {/* Eyes */}
      {expressions.leftEye}
      {expressions.rightEye}
      
      {/* Eye shine */}
      <circle cx="33" cy="36" r="2" className="fill-background/80" />
      <circle cx="63" cy="36" r="2" className="fill-background/80" />
      
      {/* Mouth */}
      {expressions.mouth}
      
      {/* Ears/Antenna */}
      <ellipse cx="20" cy="20" rx="8" ry="10" className="fill-primary" transform="rotate(-20 20 20)" />
      <ellipse cx="80" cy="20" rx="8" ry="10" className="fill-primary" transform="rotate(20 80 20)" />
      <circle cx="20" cy="12" r="4" className="fill-accent" />
      <circle cx="80" cy="12" r="4" className="fill-secondary" />
      
      {/* Feet */}
      <ellipse cx="35" cy="92" rx="12" ry="6" className="fill-primary" />
      <ellipse cx="65" cy="92" rx="12" ry="6" className="fill-primary" />
      
      {/* Mood-specific extras */}
      {expressions.extras}
    </svg>
  );
}

/**
 * Main Mascot component
 */
export function Mascot({
  mood = 'happy',
  size = 'md',
  message,
  bubblePosition = 'top',
  animate = true,
  className,
  onClick,
  name = 'Buddy',
}: MascotProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in on mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={cn(
        'relative inline-block transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0',
        onClick && 'cursor-pointer hover:scale-105 transition-transform',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      aria-label={`${name} the mascot is ${mood}`}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Speech bubble */}
      {message && (
        <SpeechBubble message={message} position={bubblePosition} />
      )}
      
      {/* Mascot character */}
      <div className={cn(
        sizeClasses[size],
        animate && moodAnimations[mood],
      )}>
        <MascotCharacter mood={mood} />
      </div>
    </div>
  );
}

/**
 * Pre-configured mascot variants for common use cases
 */
export function WelcomeMascot({ 
  name,
  className,
}: { 
  name?: string;
  className?: string;
}) {
  return (
    <Mascot
      mood="waving"
      size="lg"
      message={name ? `Hi ${name}! 👋\nReady to play?` : "Hi there! 👋\nLet's have fun!"}
      bubblePosition="right"
      className={className}
    />
  );
}

export function CelebrationMascot({ 
  achievement,
  className,
}: { 
  achievement?: string;
  className?: string;
}) {
  return (
    <Mascot
      mood="celebrating"
      size="lg"
      message={achievement ? `🎉 ${achievement}!\nAmazing job!` : "🎉 You did it!\nSo proud of you!"}
      bubblePosition="top"
      className={className}
    />
  );
}

export function EncouragementMascot({ 
  message,
  className,
}: { 
  message?: string;
  className?: string;
}) {
  return (
    <Mascot
      mood="encouraging"
      size="md"
      message={message || "You can do it! 💪\nKeep going!"}
      bubblePosition="right"
      className={className}
    />
  );
}

export function ThinkingMascot({ 
  hint,
  className,
}: { 
  hint?: string;
  className?: string;
}) {
  return (
    <Mascot
      mood="thinking"
      size="md"
      message={hint || "Hmm...\nLet me think..."}
      bubblePosition="right"
      className={className}
    />
  );
}

export function SleepingMascot({ 
  className,
}: { 
  className?: string;
}) {
  return (
    <Mascot
      mood="sleeping"
      size="md"
      message="Taking a break...\n💤"
      bubblePosition="top"
      className={className}
    />
  );
}

export default Mascot;
