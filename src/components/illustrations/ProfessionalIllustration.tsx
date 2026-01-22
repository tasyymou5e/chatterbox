/**
 * ProfessionalIllustration - unDraw style illustrations for professional sections
 * Clean, modern illustrations for Parent/Admin portals
 */

import { cn } from '@/lib/utils';
import { IllustrationWrapper, IllustrationSize, IllustrationAnimation } from './IllustrationWrapper';

export type ProfessionalIllustrationVariant = 
  | 'family' 
  | 'progress' 
  | 'security' 
  | 'collaboration'
  | 'education'
  | 'empty';

interface ProfessionalIllustrationProps {
  /** Which illustration to show */
  variant: ProfessionalIllustrationVariant;
  /** Size of the illustration */
  size?: IllustrationSize;
  /** Additional CSS classes */
  className?: string;
  /** Animation type */
  animate?: IllustrationAnimation;
}

/**
 * unDraw style SVG illustrations - clean, modern, professional
 */
const illustrations: Record<ProfessionalIllustrationVariant, React.FC<{ className?: string }>> = {
  family: ({ className }) => (
    <svg viewBox="0 0 200 160" className={cn('w-full h-full', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Family group - unDraw style */}
      {/* Adult 1 */}
      <circle cx="60" cy="45" r="18" className="fill-primary/20"/>
      <circle cx="60" cy="45" r="15" className="fill-primary/30"/>
      <path d="M60 63 L60 100" className="stroke-primary" strokeWidth="3" strokeLinecap="round"/>
      <path d="M60 70 L45 85" className="stroke-primary" strokeWidth="3" strokeLinecap="round"/>
      <path d="M60 70 L75 85" className="stroke-primary" strokeWidth="3" strokeLinecap="round"/>
      <path d="M60 100 L50 130" className="stroke-primary" strokeWidth="3" strokeLinecap="round"/>
      <path d="M60 100 L70 130" className="stroke-primary" strokeWidth="3" strokeLinecap="round"/>
      
      {/* Adult 2 */}
      <circle cx="140" cy="45" r="18" className="fill-secondary/20"/>
      <circle cx="140" cy="45" r="15" className="fill-secondary/30"/>
      <path d="M140 63 L140 100" className="stroke-secondary" strokeWidth="3" strokeLinecap="round"/>
      <path d="M140 70 L125 85" className="stroke-secondary" strokeWidth="3" strokeLinecap="round"/>
      <path d="M140 70 L155 85" className="stroke-secondary" strokeWidth="3" strokeLinecap="round"/>
      <path d="M140 100 L130 130" className="stroke-secondary" strokeWidth="3" strokeLinecap="round"/>
      <path d="M140 100 L150 130" className="stroke-secondary" strokeWidth="3" strokeLinecap="round"/>
      
      {/* Child in middle */}
      <circle cx="100" cy="65" r="14" className="fill-accent/20"/>
      <circle cx="100" cy="65" r="11" className="fill-accent/30"/>
      <path d="M100 79 L100 105" className="stroke-accent" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M100 85 L90 95" className="stroke-accent" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M100 85 L110 95" className="stroke-accent" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M100 105 L93 130" className="stroke-accent" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M100 105 L107 130" className="stroke-accent" strokeWidth="2.5" strokeLinecap="round"/>
      
      {/* Connection lines */}
      <path d="M75 80 Q100 70 125 80" className="stroke-muted-foreground/40" strokeWidth="1.5" strokeDasharray="4 4" fill="none"/>
      
      {/* Heart above */}
      <path d="M100 20 C95 12 85 15 85 25 C85 35 100 42 100 42 C100 42 115 35 115 25 C115 15 105 12 100 20" className="fill-destructive/40"/>
    </svg>
  ),

  progress: ({ className }) => (
    <svg viewBox="0 0 200 160" className={cn('w-full h-full', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Chart background */}
      <rect x="30" y="30" width="140" height="100" rx="8" className="fill-muted/30"/>
      
      {/* Grid lines */}
      <line x1="50" y1="50" x2="50" y2="110" className="stroke-border" strokeWidth="1"/>
      <line x1="50" y1="110" x2="155" y2="110" className="stroke-border" strokeWidth="1"/>
      
      {/* Bars */}
      <rect x="60" y="85" width="18" height="25" rx="2" className="fill-primary/60"/>
      <rect x="85" y="70" width="18" height="40" rx="2" className="fill-primary/70"/>
      <rect x="110" y="55" width="18" height="55" rx="2" className="fill-primary/80"/>
      <rect x="135" y="40" width="18" height="70" rx="2" className="fill-primary"/>
      
      {/* Trend line */}
      <path d="M69 82 L94 67 L119 52 L144 37" className="stroke-secondary" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      
      {/* Arrow up */}
      <path d="M160 25 L170 35 M170 25 L160 35" className="stroke-success" strokeWidth="2" strokeLinecap="round"/>
      <path d="M165 20 L165 40" className="stroke-success" strokeWidth="2" strokeLinecap="round"/>
      
      {/* Decorative dots */}
      <circle cx="69" cy="82" r="4" className="fill-secondary"/>
      <circle cx="94" cy="67" r="4" className="fill-secondary"/>
      <circle cx="119" cy="52" r="4" className="fill-secondary"/>
      <circle cx="144" cy="37" r="4" className="fill-secondary"/>
    </svg>
  ),

  security: ({ className }) => (
    <svg viewBox="0 0 200 160" className={cn('w-full h-full', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield */}
      <path d="M100 20 L150 40 L150 80 C150 110 125 135 100 145 C75 135 50 110 50 80 L50 40 Z" className="fill-primary/20 stroke-primary" strokeWidth="3"/>
      
      {/* Inner shield */}
      <path d="M100 35 L135 50 L135 78 C135 100 118 118 100 125 C82 118 65 100 65 78 L65 50 Z" className="fill-primary/10"/>
      
      {/* Checkmark */}
      <path d="M80 80 L95 95 L125 60" className="stroke-success" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      
      {/* Lock icon at bottom */}
      <rect x="88" y="125" width="24" height="18" rx="3" className="fill-muted-foreground/60"/>
      <path d="M93 125 L93 118 C93 112 100 108 107 118 L107 125" className="stroke-muted-foreground/60" strokeWidth="3" fill="none"/>
      
      {/* Decorative circles */}
      <circle cx="40" cy="50" r="6" className="fill-secondary/30"/>
      <circle cx="160" cy="50" r="6" className="fill-secondary/30"/>
      <circle cx="30" cy="90" r="4" className="fill-accent/30"/>
      <circle cx="170" cy="90" r="4" className="fill-accent/30"/>
    </svg>
  ),

  collaboration: ({ className }) => (
    <svg viewBox="0 0 200 160" className={cn('w-full h-full', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Person 1 */}
      <circle cx="50" cy="50" r="16" className="fill-primary/25"/>
      <circle cx="50" cy="50" r="12" className="fill-primary/35"/>
      <path d="M50 66 L50 95" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M50 75 L35 85" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M50 75 L65 85" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M50 95 L40 120" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M50 95 L60 120" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round"/>
      
      {/* Person 2 */}
      <circle cx="150" cy="50" r="16" className="fill-secondary/25"/>
      <circle cx="150" cy="50" r="12" className="fill-secondary/35"/>
      <path d="M150 66 L150 95" className="stroke-secondary" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M150 75 L135 85" className="stroke-secondary" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M150 75 L165 85" className="stroke-secondary" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M150 95 L140 120" className="stroke-secondary" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M150 95 L160 120" className="stroke-secondary" strokeWidth="2.5" strokeLinecap="round"/>
      
      {/* Connection/handshake in middle */}
      <ellipse cx="100" cy="85" rx="30" ry="20" className="fill-muted/40"/>
      <path d="M75 85 L90 80 L100 88 L110 80 L125 85" className="stroke-accent" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      
      {/* Connection lines */}
      <path d="M66 70 Q100 55 134 70" className="stroke-muted-foreground/30" strokeWidth="1.5" strokeDasharray="4 4" fill="none"/>
      
      {/* Sparkles */}
      <circle cx="100" cy="40" r="5" className="fill-warning/60"/>
      <circle cx="85" cy="55" r="3" className="fill-warning/40"/>
      <circle cx="115" cy="55" r="3" className="fill-warning/40"/>
    </svg>
  ),

  education: ({ className }) => (
    <svg viewBox="0 0 200 160" className={cn('w-full h-full', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Graduation cap */}
      <path d="M100 30 L30 60 L100 90 L170 60 Z" className="fill-primary/80"/>
      <path d="M100 90 L100 110" className="stroke-primary" strokeWidth="3"/>
      <rect x="95" y="105" width="10" height="12" className="fill-primary"/>
      <circle cx="100" cy="122" r="5" className="fill-warning"/>
      
      {/* Tassel */}
      <path d="M170 60 L170 85" className="stroke-primary" strokeWidth="2"/>
      <path d="M168 85 Q170 95 172 85" className="stroke-primary" strokeWidth="2" fill="none"/>
      
      {/* Book */}
      <rect x="40" y="100" width="50" height="35" rx="2" className="fill-secondary/60"/>
      <line x1="65" y1="100" x2="65" y2="135" className="stroke-background" strokeWidth="2"/>
      <line x1="50" y1="110" x2="60" y2="110" className="stroke-muted-foreground/40" strokeWidth="1"/>
      <line x1="50" y1="118" x2="58" y2="118" className="stroke-muted-foreground/40" strokeWidth="1"/>
      <line x1="70" y1="110" x2="80" y2="110" className="stroke-muted-foreground/40" strokeWidth="1"/>
      <line x1="70" y1="118" x2="78" y2="118" className="stroke-muted-foreground/40" strokeWidth="1"/>
      
      {/* Lightbulb */}
      <circle cx="140" cy="115" r="15" className="fill-warning/30 stroke-warning" strokeWidth="2"/>
      <path d="M135 130 L145 130 M133 135 L147 135" className="stroke-warning" strokeWidth="2" strokeLinecap="round"/>
      <path d="M140 105 L140 100" className="stroke-warning" strokeWidth="2" strokeLinecap="round"/>
      <path d="M132 108 L128 104" className="stroke-warning" strokeWidth="2" strokeLinecap="round"/>
      <path d="M148 108 L152 104" className="stroke-warning" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  empty: ({ className }) => (
    <svg viewBox="0 0 200 160" className={cn('w-full h-full', className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Empty box */}
      <rect x="50" y="50" width="100" height="80" rx="8" className="fill-muted/40 stroke-border" strokeWidth="2"/>
      <path d="M50 70 L150 70" className="stroke-border" strokeWidth="2"/>
      
      {/* Box flaps */}
      <path d="M50 50 L65 35 L135 35 L150 50" className="stroke-border" strokeWidth="2" fill="none"/>
      <path d="M65 35 L65 50" className="stroke-border" strokeWidth="2"/>
      <path d="M135 35 L135 50" className="stroke-border" strokeWidth="2"/>
      
      {/* Question mark or search icon inside */}
      <circle cx="100" cy="100" r="18" className="stroke-muted-foreground/50" strokeWidth="2" fill="none"/>
      <line x1="113" y1="113" x2="125" y2="125" className="stroke-muted-foreground/50" strokeWidth="3" strokeLinecap="round"/>
      
      {/* Decorative elements */}
      <circle cx="35" cy="80" r="5" className="fill-primary/20"/>
      <circle cx="165" cy="80" r="5" className="fill-secondary/20"/>
      <circle cx="40" cy="120" r="3" className="fill-accent/20"/>
      <circle cx="160" cy="120" r="3" className="fill-accent/20"/>
      
      {/* Sparkle indicating potential */}
      <path d="M170 40 L172 46 L178 46 L173 50 L175 56 L170 52 L165 56 L167 50 L162 46 L168 46 Z" className="fill-warning/60"/>
    </svg>
  ),
};

/**
 * Professional illustration component with unDraw style
 */
export function ProfessionalIllustration({
  variant,
  size = 'lg',
  className,
  animate = 'fadeIn',
}: ProfessionalIllustrationProps) {
  const Illustration = illustrations[variant];

  return (
    <IllustrationWrapper
      alt={`${variant} illustration`}
      size={size}
      animate={animate}
      className={className}
    >
      <Illustration className="text-foreground" />
    </IllustrationWrapper>
  );
}

export default ProfessionalIllustration;
