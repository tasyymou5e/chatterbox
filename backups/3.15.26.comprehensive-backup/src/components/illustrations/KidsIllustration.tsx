/**
 * KidsIllustration - Open Doodles style illustrations for Kids Portal
 * Playful, hand-drawn style illustrations for empty states and loading screens
 */

import { cn } from '@/lib/utils';
import { IllustrationWrapper, IllustrationSize, IllustrationAnimation } from './IllustrationWrapper';

export type KidsIllustrationVariant = 
  | 'playing' 
  | 'reading' 
  | 'celebrating' 
  | 'thinking' 
  | 'exploring' 
  | 'resting';

interface KidsIllustrationProps {
  /** Which illustration to show */
  variant: KidsIllustrationVariant;
  /** Size of the illustration */
  size?: IllustrationSize;
  /** Optional message below the illustration */
  message?: string;
  /** Additional CSS classes */
  className?: string;
  /** Animation type */
  animate?: IllustrationAnimation;
}

/**
 * Open Doodles style SVG illustrations
 * Hand-drawn, playful, inclusive characters with soft colors
 */
const illustrations: Record<KidsIllustrationVariant, React.FC<{ className?: string }>> = {
  playing: ({ className }) => (
    <svg viewBox="0 0 200 200" className={cn('w-full h-full', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Playful child with ball - Open Doodles style */}
      <circle cx="100" cy="60" r="30" className="fill-primary/20 stroke-primary" strokeWidth="3" strokeLinecap="round"/>
      {/* Face */}
      <circle cx="90" cy="55" r="4" className="fill-foreground"/>
      <circle cx="110" cy="55" r="4" className="fill-foreground"/>
      <path d="M92 70 Q100 78 108 70" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" fill="none"/>
      {/* Hair */}
      <path d="M70 50 Q75 30 100 28 Q125 30 130 50" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M75 45 Q80 35 90 38" className="stroke-foreground" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Body */}
      <path d="M100 90 L100 130" className="stroke-primary" strokeWidth="4" strokeLinecap="round"/>
      {/* Arms reaching for ball */}
      <path d="M100 100 Q130 80 150 100" className="stroke-primary" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M100 100 Q70 90 60 110" className="stroke-primary" strokeWidth="4" strokeLinecap="round" fill="none"/>
      {/* Legs */}
      <path d="M100 130 Q90 150 80 170" className="stroke-primary" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M100 130 Q110 150 120 170" className="stroke-primary" strokeWidth="4" strokeLinecap="round" fill="none"/>
      {/* Ball */}
      <circle cx="155" cy="95" r="20" className="fill-accent/30 stroke-accent" strokeWidth="3"/>
      <path d="M145 85 Q155 95 165 85" className="stroke-accent" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Stars around */}
      <path d="M40 40 L45 50 L55 50 L47 56 L50 66 L40 60 L30 66 L33 56 L25 50 L35 50 Z" className="fill-warning/60"/>
      <path d="M160 150 L163 156 L170 156 L165 160 L167 167 L160 163 L153 167 L155 160 L150 156 L157 156 Z" className="fill-warning/60"/>
    </svg>
  ),

  reading: ({ className }) => (
    <svg viewBox="0 0 200 200" className={cn('w-full h-full', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Child reading a book */}
      <circle cx="100" cy="50" r="28" className="fill-secondary/20 stroke-secondary" strokeWidth="3"/>
      {/* Face - focused expression */}
      <circle cx="92" cy="47" r="3" className="fill-foreground"/>
      <circle cx="108" cy="47" r="3" className="fill-foreground"/>
      <path d="M95 58 Q100 62 105 58" className="stroke-foreground" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Hair with ponytail */}
      <path d="M72 40 Q78 25 100 22 Q122 25 128 40" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <ellipse cx="130" cy="35" rx="8" ry="12" className="stroke-foreground fill-foreground/10" strokeWidth="2"/>
      {/* Body sitting */}
      <path d="M100 78 L100 110" className="stroke-secondary" strokeWidth="4" strokeLinecap="round"/>
      {/* Arms holding book */}
      <path d="M100 90 L70 100 L70 140" className="stroke-secondary" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M100 90 L130 100 L130 140" className="stroke-secondary" strokeWidth="4" strokeLinecap="round" fill="none"/>
      {/* Legs crossed */}
      <path d="M100 110 Q80 130 90 150" className="stroke-secondary" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M100 110 Q120 130 110 150" className="stroke-secondary" strokeWidth="4" strokeLinecap="round" fill="none"/>
      {/* Book */}
      <rect x="65" y="115" width="70" height="50" rx="3" className="fill-primary/20 stroke-primary" strokeWidth="2"/>
      <line x1="100" y1="115" x2="100" y2="165" className="stroke-primary" strokeWidth="2"/>
      <line x1="75" y1="130" x2="95" y2="130" className="stroke-muted-foreground" strokeWidth="1"/>
      <line x1="75" y1="140" x2="90" y2="140" className="stroke-muted-foreground" strokeWidth="1"/>
      <line x1="105" y1="130" x2="125" y2="130" className="stroke-muted-foreground" strokeWidth="1"/>
      <line x1="105" y1="140" x2="120" y2="140" className="stroke-muted-foreground" strokeWidth="1"/>
      {/* Sparkles */}
      <circle cx="45" cy="80" r="4" className="fill-warning"/>
      <circle cx="155" cy="70" r="3" className="fill-warning"/>
      <circle cx="160" cy="170" r="5" className="fill-accent/50"/>
    </svg>
  ),

  celebrating: ({ className }) => (
    <svg viewBox="0 0 200 200" className={cn('w-full h-full', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Happy celebrating child */}
      <circle cx="100" cy="55" r="28" className="fill-warning/20 stroke-warning" strokeWidth="3"/>
      {/* Big happy face */}
      <circle cx="90" cy="50" r="4" className="fill-foreground"/>
      <circle cx="110" cy="50" r="4" className="fill-foreground"/>
      <path d="M85 62 Q100 75 115 62" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" fill="none"/>
      {/* Excited eyebrows */}
      <path d="M82 42 L92 38" className="stroke-foreground" strokeWidth="2" strokeLinecap="round"/>
      <path d="M108 38 L118 42" className="stroke-foreground" strokeWidth="2" strokeLinecap="round"/>
      {/* Bouncy hair */}
      <path d="M72 45 Q80 20 100 18 Q120 20 128 45" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" fill="none"/>
      {/* Body jumping */}
      <path d="M100 83 L100 115" className="stroke-warning" strokeWidth="4" strokeLinecap="round"/>
      {/* Arms up in celebration */}
      <path d="M100 95 Q60 70 50 50" className="stroke-warning" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M100 95 Q140 70 150 50" className="stroke-warning" strokeWidth="4" strokeLinecap="round" fill="none"/>
      {/* Legs in jump pose */}
      <path d="M100 115 Q85 135 70 150" className="stroke-warning" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M100 115 Q115 135 130 150" className="stroke-warning" strokeWidth="4" strokeLinecap="round" fill="none"/>
      {/* Confetti */}
      <rect x="40" y="40" width="8" height="8" rx="1" className="fill-primary" transform="rotate(15 44 44)"/>
      <rect x="150" y="35" width="10" height="10" rx="1" className="fill-secondary" transform="rotate(-20 155 40)"/>
      <rect x="55" y="90" width="6" height="6" rx="1" className="fill-accent" transform="rotate(30 58 93)"/>
      <rect x="140" y="100" width="7" height="7" rx="1" className="fill-warning" transform="rotate(-10 143 103)"/>
      {/* Stars */}
      <path d="M35 70 L38 77 L46 77 L40 82 L42 90 L35 85 L28 90 L30 82 L24 77 L32 77 Z" className="fill-warning"/>
      <path d="M165 80 L167 85 L173 85 L169 88 L170 94 L165 91 L160 94 L161 88 L157 85 L163 85 Z" className="fill-warning"/>
      <path d="M100 170 L103 177 L111 177 L105 182 L107 190 L100 185 L93 190 L95 182 L89 177 L97 177 Z" className="fill-primary"/>
    </svg>
  ),

  thinking: ({ className }) => (
    <svg viewBox="0 0 200 200" className={cn('w-full h-full', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Curious thinking child */}
      <circle cx="100" cy="70" r="32" className="fill-primary/15 stroke-primary" strokeWidth="3"/>
      {/* Thinking expression - one eye squinting */}
      <circle cx="88" cy="65" r="4" className="fill-foreground"/>
      <path d="M105 62 Q112 65 105 68" className="stroke-foreground" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Thoughtful mouth */}
      <path d="M90 82 Q100 80 110 82" className="stroke-foreground" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Hair */}
      <path d="M68 60 Q75 35 100 32 Q125 35 132 60" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M75 50 Q85 42 95 48" className="stroke-foreground" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Body */}
      <path d="M100 102 L100 140" className="stroke-primary" strokeWidth="4" strokeLinecap="round"/>
      {/* One arm on chin thinking pose */}
      <path d="M100 115 L75 105 L75 80" className="stroke-primary" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M100 115 L130 130" className="stroke-primary" strokeWidth="4" strokeLinecap="round" fill="none"/>
      {/* Legs */}
      <path d="M100 140 L85 170" className="stroke-primary" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M100 140 L115 170" className="stroke-primary" strokeWidth="4" strokeLinecap="round" fill="none"/>
      {/* Thought bubbles */}
      <circle cx="145" cy="40" r="18" className="fill-muted stroke-border" strokeWidth="2"/>
      <circle cx="130" cy="55" r="8" className="fill-muted stroke-border" strokeWidth="1.5"/>
      <circle cx="120" cy="62" r="4" className="fill-muted stroke-border" strokeWidth="1"/>
      {/* Question mark in thought bubble */}
      <text x="140" y="47" className="fill-primary text-lg font-bold" fontSize="20">?</text>
      {/* Small decorative elements */}
      <circle cx="40" cy="120" r="5" className="fill-secondary/40"/>
      <circle cx="160" cy="150" r="6" className="fill-accent/40"/>
    </svg>
  ),

  exploring: ({ className }) => (
    <svg viewBox="0 0 200 200" className={cn('w-full h-full', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Adventurous exploring child */}
      <circle cx="90" cy="55" r="28" className="fill-accent/20 stroke-accent" strokeWidth="3"/>
      {/* Wide curious eyes */}
      <circle cx="82" cy="52" r="5" className="fill-foreground"/>
      <circle cx="98" cy="52" r="5" className="fill-foreground"/>
      <circle cx="83" cy="51" r="2" className="fill-background"/>
      <circle cx="99" cy="51" r="2" className="fill-background"/>
      {/* Excited open mouth */}
      <ellipse cx="90" cy="68" rx="8" ry="5" className="fill-foreground/80"/>
      {/* Messy adventure hair */}
      <path d="M62 45 Q70 25 90 22 Q110 25 118 45" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M65 40 L60 30" className="stroke-foreground" strokeWidth="2" strokeLinecap="round"/>
      <path d="M115 40 L120 32" className="stroke-foreground" strokeWidth="2" strokeLinecap="round"/>
      {/* Body walking/exploring */}
      <path d="M90 83 L95 125" className="stroke-accent" strokeWidth="4" strokeLinecap="round"/>
      {/* Arms - one pointing forward */}
      <path d="M95 100 L130 85" className="stroke-accent" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M95 100 L65 110" className="stroke-accent" strokeWidth="4" strokeLinecap="round" fill="none"/>
      {/* Legs in walking pose */}
      <path d="M95 125 L80 165" className="stroke-accent" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M95 125 L115 160" className="stroke-accent" strokeWidth="4" strokeLinecap="round" fill="none"/>
      {/* Magnifying glass */}
      <circle cx="145" cy="75" r="18" className="stroke-primary" strokeWidth="3" fill="none"/>
      <circle cx="145" cy="75" r="14" className="fill-primary/10"/>
      <line x1="157" y1="87" x2="170" y2="100" className="stroke-primary" strokeWidth="4" strokeLinecap="round"/>
      {/* Discovery sparkles */}
      <path d="M160 40 L162 47 L170 47 L164 52 L166 60 L160 55 L154 60 L156 52 L150 47 L158 47 Z" className="fill-warning"/>
      <circle cx="45" cy="90" r="4" className="fill-warning"/>
      <circle cx="35" cy="140" r="5" className="fill-secondary/50"/>
      <circle cx="170" cy="130" r="3" className="fill-primary/50"/>
    </svg>
  ),

  resting: ({ className }) => (
    <svg viewBox="0 0 200 200" className={cn('w-full h-full', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Relaxed resting child */}
      <ellipse cx="100" cy="110" rx="60" ry="25" className="fill-muted/50"/>
      <circle cx="85" cy="80" r="28" className="fill-secondary/20 stroke-secondary" strokeWidth="3"/>
      {/* Peaceful closed eyes */}
      <path d="M75 77 Q80 80 85 77" className="stroke-foreground" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M90 77 Q95 80 100 77" className="stroke-foreground" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Content smile */}
      <path d="M80 90 Q88 96 96 90" className="stroke-foreground" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Relaxed hair */}
      <path d="M57 70 Q65 50 85 48 Q105 50 113 70" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" fill="none"/>
      {/* Body lying down */}
      <path d="M85 108 Q110 108 140 100" className="stroke-secondary" strokeWidth="4" strokeLinecap="round"/>
      {/* Arms relaxed */}
      <path d="M90 105 L70 120" className="stroke-secondary" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M120 102 L130 85" className="stroke-secondary" strokeWidth="4" strokeLinecap="round" fill="none"/>
      {/* Legs stretched */}
      <path d="M140 100 L160 110" className="stroke-secondary" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M140 100 L155 120" className="stroke-secondary" strokeWidth="4" strokeLinecap="round" fill="none"/>
      {/* Pillow */}
      <ellipse cx="70" cy="95" rx="20" ry="12" className="fill-primary/20 stroke-primary" strokeWidth="2"/>
      {/* ZZZ sleep bubbles */}
      <text x="115" y="55" className="fill-muted-foreground font-bold" fontSize="14">z</text>
      <text x="130" y="45" className="fill-muted-foreground font-bold" fontSize="18">z</text>
      <text x="148" y="32" className="fill-muted-foreground font-bold" fontSize="22">z</text>
      {/* Soft clouds/stars */}
      <circle cx="40" cy="40" r="6" className="fill-muted/60"/>
      <circle cx="50" cy="45" r="4" className="fill-muted/40"/>
      <circle cx="160" cy="60" r="5" className="fill-muted/50"/>
    </svg>
  ),
};

/**
 * Kids Portal illustration component with Open Doodles style
 */
export function KidsIllustration({
  variant,
  size = 'lg',
  message,
  className,
  animate = 'fadeIn',
}: KidsIllustrationProps) {
  const Illustration = illustrations[variant];

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <IllustrationWrapper
        alt={`${variant} illustration`}
        size={size}
        animate={animate}
        decorative={!message}
      >
        <Illustration className="text-foreground" />
      </IllustrationWrapper>
      {message && (
        <p className="text-lg font-medium text-muted-foreground text-center animate-fade-in">
          {message}
        </p>
      )}
    </div>
  );
}

export default KidsIllustration;
