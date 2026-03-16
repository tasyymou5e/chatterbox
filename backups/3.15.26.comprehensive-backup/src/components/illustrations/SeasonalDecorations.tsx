/**
 * SeasonalDecorations - Automatic seasonal theme decorations for Kids Portal
 * Detects current season/holiday and renders appropriate themed elements
 */

import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export type Season = 'winter' | 'spring' | 'summer' | 'fall';
export type Holiday = 'christmas' | 'halloween' | 'valentines' | 'easter' | 'none';

interface SeasonalConfig {
  season: Season;
  holiday: Holiday;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

/**
 * Determines current season based on date
 */
function getSeason(date: Date): Season {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

/**
 * Detects if there's a current holiday
 */
function getHoliday(date: Date): Holiday {
  const month = date.getMonth();
  const day = date.getDate();

  // Christmas season (Dec 1-31)
  if (month === 11) return 'christmas';
  // Halloween (Oct 15-31)
  if (month === 9 && day >= 15) return 'halloween';
  // Valentine's (Feb 1-14)
  if (month === 1 && day <= 14) return 'valentines';
  // Easter approximation (late March/April)
  if ((month === 2 && day >= 20) || (month === 3 && day <= 25)) return 'easter';

  return 'none';
}

/**
 * Hook to get current seasonal configuration
 */
export function useSeasonalTheme(): SeasonalConfig {
  return useMemo(() => {
    const now = new Date();
    const season = getSeason(now);
    const holiday = getHoliday(now);

    const seasonColors: Record<Season, SeasonalConfig['colors']> = {
      winter: { primary: 'hsl(200 80% 70%)', secondary: 'hsl(220 60% 85%)', accent: 'hsl(0 0% 95%)' },
      spring: { primary: 'hsl(340 70% 75%)', secondary: 'hsl(120 50% 70%)', accent: 'hsl(60 80% 75%)' },
      summer: { primary: 'hsl(45 100% 60%)', secondary: 'hsl(200 80% 60%)', accent: 'hsl(30 90% 65%)' },
      fall: { primary: 'hsl(25 80% 55%)', secondary: 'hsl(45 70% 50%)', accent: 'hsl(10 70% 45%)' },
    };

    return {
      season,
      holiday,
      colors: seasonColors[season],
    };
  }, []);
}

interface SeasonalDecorationsProps {
  className?: string;
  intensity?: 'subtle' | 'normal' | 'festive';
  position?: 'corners' | 'scattered' | 'border';
}

/**
 * Winter snowflakes decoration
 */
function WinterDecorations({ className, intensity = 'normal' }: { className?: string; intensity: string }) {
  const count = intensity === 'subtle' ? 4 : intensity === 'festive' ? 12 : 8;
  
  return (
    <svg className={cn('absolute inset-0 pointer-events-none overflow-visible', className)} viewBox="0 0 200 200">
      {Array.from({ length: count }).map((_, i) => (
        <g key={i} className="animate-[float_4s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.3}s` }}>
          {/* Snowflake */}
          <g transform={`translate(${20 + (i * 25) % 160}, ${15 + (i * 37) % 170}) scale(${0.3 + (i % 3) * 0.15})`}>
            <line x1="0" y1="-8" x2="0" y2="8" stroke="hsl(200 80% 90%)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="-8" y1="0" x2="8" y2="0" stroke="hsl(200 80% 90%)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="-5.5" y1="-5.5" x2="5.5" y2="5.5" stroke="hsl(200 80% 90%)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="5.5" y1="-5.5" x2="-5.5" y2="5.5" stroke="hsl(200 80% 90%)" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="0" cy="0" r="2" fill="hsl(200 80% 95%)" />
          </g>
        </g>
      ))}
    </svg>
  );
}

/**
 * Spring flowers decoration
 */
function SpringDecorations({ className, intensity = 'normal' }: { className?: string; intensity: string }) {
  const count = intensity === 'subtle' ? 3 : intensity === 'festive' ? 8 : 5;
  const flowerColors = ['hsl(340 70% 75%)', 'hsl(280 60% 75%)', 'hsl(60 80% 70%)', 'hsl(320 65% 80%)'];
  
  return (
    <svg className={cn('absolute inset-0 pointer-events-none overflow-visible', className)} viewBox="0 0 200 200">
      {Array.from({ length: count }).map((_, i) => (
        <g key={i} className="animate-[bounce_3s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.5}s` }}>
          {/* Flower */}
          <g transform={`translate(${15 + (i * 40) % 170}, ${20 + (i * 45) % 160}) scale(${0.4 + (i % 2) * 0.2})`}>
            {/* Petals */}
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <ellipse
                key={angle}
                cx="0"
                cy="-8"
                rx="4"
                ry="8"
                fill={flowerColors[i % flowerColors.length]}
                opacity="0.8"
                transform={`rotate(${angle})`}
              />
            ))}
            {/* Center */}
            <circle cx="0" cy="0" r="4" fill="hsl(45 90% 60%)" />
          </g>
        </g>
      ))}
      {/* Butterflies */}
      {intensity !== 'subtle' && (
        <g className="animate-[float_5s_ease-in-out_infinite]">
          <g transform="translate(150, 40) scale(0.5)">
            <ellipse cx="-8" cy="0" rx="8" ry="6" fill="hsl(280 70% 70%)" opacity="0.7" transform="rotate(-20)"/>
            <ellipse cx="8" cy="0" rx="8" ry="6" fill="hsl(280 70% 70%)" opacity="0.7" transform="rotate(20)"/>
            <ellipse cx="0" cy="0" rx="2" ry="6" fill="hsl(0 0% 20%)"/>
          </g>
        </g>
      )}
    </svg>
  );
}

/**
 * Summer sunshine decoration
 */
function SummerDecorations({ className, intensity = 'normal' }: { className?: string; intensity: string }) {
  return (
    <svg className={cn('absolute inset-0 pointer-events-none overflow-visible', className)} viewBox="0 0 200 200">
      {/* Main sun */}
      <g className="animate-[pulse_4s_ease-in-out_infinite]">
        <circle cx="170" cy="25" r="20" fill="hsl(45 100% 60%)" opacity="0.9"/>
        <circle cx="170" cy="25" r="15" fill="hsl(45 100% 70%)"/>
        {/* Sun rays */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <line
            key={angle}
            x1="170"
            y1="25"
            x2={170 + Math.cos(angle * Math.PI / 180) * 30}
            y2={25 + Math.sin(angle * Math.PI / 180) * 30}
            stroke="hsl(45 100% 65%)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
        ))}
      </g>
      
      {/* Beach balls / bubbles */}
      {intensity !== 'subtle' && (
        <>
          <circle cx="30" cy="170" r="12" fill="hsl(200 80% 60%)" opacity="0.5" className="animate-[bounce_3s_ease-in-out_infinite]"/>
          <circle cx="50" cy="150" r="8" fill="hsl(340 70% 65%)" opacity="0.4" className="animate-[bounce_4s_ease-in-out_infinite]" style={{ animationDelay: '0.5s' }}/>
        </>
      )}
      
      {/* Waves at bottom */}
      <path
        d="M0 185 Q25 180 50 185 T100 185 T150 185 T200 185"
        fill="none"
        stroke="hsl(200 80% 70%)"
        strokeWidth="2"
        opacity="0.4"
        className="animate-[float_3s_ease-in-out_infinite]"
      />
    </svg>
  );
}

/**
 * Fall leaves decoration
 */
function FallDecorations({ className, intensity = 'normal' }: { className?: string; intensity: string }) {
  const count = intensity === 'subtle' ? 4 : intensity === 'festive' ? 10 : 6;
  const leafColors = ['hsl(25 80% 55%)', 'hsl(45 70% 50%)', 'hsl(10 70% 45%)', 'hsl(35 75% 45%)'];
  
  return (
    <svg className={cn('absolute inset-0 pointer-events-none overflow-visible', className)} viewBox="0 0 200 200">
      {Array.from({ length: count }).map((_, i) => (
        <g 
          key={i} 
          className="animate-[float_5s_ease-in-out_infinite]" 
          style={{ animationDelay: `${i * 0.4}s` }}
          transform={`translate(${10 + (i * 30) % 180}, ${20 + (i * 35) % 160}) rotate(${i * 25})`}
        >
          {/* Leaf shape */}
          <path
            d="M0 -10 Q8 -5 8 5 Q4 10 0 12 Q-4 10 -8 5 Q-8 -5 0 -10 Z"
            fill={leafColors[i % leafColors.length]}
            opacity="0.7"
            transform={`scale(${0.6 + (i % 3) * 0.2})`}
          />
          {/* Leaf vein */}
          <line x1="0" y1="-8" x2="0" y2="10" stroke="hsl(25 50% 30%)" strokeWidth="0.5" opacity="0.5"/>
        </g>
      ))}
      
      {/* Acorn for festive */}
      {intensity === 'festive' && (
        <g transform="translate(160, 160) scale(0.8)">
          <ellipse cx="0" cy="5" rx="8" ry="10" fill="hsl(30 50% 35%)"/>
          <path d="M-8 0 Q-10 -8 0 -10 Q10 -8 8 0 Z" fill="hsl(30 40% 25%)"/>
          <rect x="-1" y="-14" width="2" height="4" fill="hsl(30 30% 20%)"/>
        </g>
      )}
    </svg>
  );
}

/**
 * Christmas holiday decoration
 */
function ChristmasDecorations({ className, intensity = 'normal' }: { className?: string; intensity: string }) {
  return (
    <svg className={cn('absolute inset-0 pointer-events-none overflow-visible', className)} viewBox="0 0 200 200">
      {/* Snow */}
      <WinterDecorations intensity={intensity} />
      
      {/* Ornaments in corners */}
      <g>
        {/* Red ornament */}
        <circle cx="25" cy="25" r="10" fill="hsl(0 70% 50%)" className="animate-[bounce_3s_ease-in-out_infinite]"/>
        <rect x="23" y="13" width="4" height="4" fill="hsl(45 80% 50%)" rx="1"/>
        
        {/* Green ornament */}
        <circle cx="175" cy="175" r="8" fill="hsl(120 60% 35%)" className="animate-[bounce_3s_ease-in-out_infinite]" style={{ animationDelay: '0.5s' }}/>
        <rect x="173" y="165" width="4" height="4" fill="hsl(45 80% 50%)" rx="1"/>
      </g>
      
      {/* Candy canes */}
      {intensity !== 'subtle' && (
        <g transform="translate(170, 30) rotate(30)">
          <path d="M0 0 L0 20 Q0 30 -10 30" fill="none" stroke="hsl(0 0% 100%)" strokeWidth="4" strokeLinecap="round"/>
          <path d="M0 0 L0 20 Q0 30 -10 30" fill="none" stroke="hsl(0 70% 50%)" strokeWidth="4" strokeLinecap="round" strokeDasharray="4 4"/>
        </g>
      )}
      
      {/* Stars */}
      <path d="M100 10 L102 16 L108 16 L103 20 L105 26 L100 22 L95 26 L97 20 L92 16 L98 16 Z" fill="hsl(45 100% 60%)" className="animate-pulse"/>
    </svg>
  );
}

/**
 * Halloween decoration
 */
function HalloweenDecorations({ className, intensity = 'normal' }: { className?: string; intensity: string }) {
  return (
    <svg className={cn('absolute inset-0 pointer-events-none overflow-visible', className)} viewBox="0 0 200 200">
      {/* Pumpkin */}
      <g transform="translate(170, 170) scale(0.7)" className="animate-[bounce_4s_ease-in-out_infinite]">
        <ellipse cx="0" cy="0" rx="18" ry="15" fill="hsl(25 90% 50%)"/>
        <rect x="-3" y="-20" width="6" height="8" fill="hsl(120 40% 25%)" rx="2"/>
        {/* Face */}
        <path d="M-8 -3 L-4 2 L-8 2 Z" fill="hsl(45 100% 50%)"/>
        <path d="M8 -3 L4 2 L8 2 Z" fill="hsl(45 100% 50%)"/>
        <path d="M-6 6 Q0 10 6 6 L4 8 Q0 12 -4 8 Z" fill="hsl(45 100% 50%)"/>
      </g>
      
      {/* Bats */}
      {intensity !== 'subtle' && (
        <>
          <g transform="translate(30, 30)" className="animate-[float_3s_ease-in-out_infinite]">
            <path d="M0 0 Q-8 -5 -15 0 Q-10 2 -8 0 L0 3 L8 0 Q10 2 15 0 Q8 -5 0 0 Z" fill="hsl(270 30% 15%)"/>
          </g>
          <g transform="translate(150, 50) scale(0.7)" className="animate-[float_4s_ease-in-out_infinite]" style={{ animationDelay: '1s' }}>
            <path d="M0 0 Q-8 -5 -15 0 Q-10 2 -8 0 L0 3 L8 0 Q10 2 15 0 Q8 -5 0 0 Z" fill="hsl(270 30% 20%)"/>
          </g>
        </>
      )}
      
      {/* Spider web corner */}
      <g opacity="0.3">
        <path d="M0 0 L30 0 M0 0 L25 15 M0 0 L20 25 M0 0 L10 30 M0 0 L0 30" stroke="hsl(0 0% 70%)" strokeWidth="0.5" fill="none"/>
        <path d="M5 0 Q5 5 0 5 M12 0 Q12 12 0 12 M20 0 Q20 20 0 20" stroke="hsl(0 0% 70%)" strokeWidth="0.5" fill="none"/>
      </g>
    </svg>
  );
}

/**
 * Main seasonal decorations component
 */
export function SeasonalDecorations({
  className,
  intensity = 'normal',
  position: _position = 'scattered',
}: SeasonalDecorationsProps) {
  const { season, holiday } = useSeasonalTheme();
  // _position reserved for future layout variants

  const DecorationComponent = useMemo(() => {
    // Holiday takes precedence
    if (holiday === 'christmas') return ChristmasDecorations;
    if (holiday === 'halloween') return HalloweenDecorations;
    // Easter uses spring
    if (holiday === 'easter') return SpringDecorations;
    // Valentine's uses spring with hearts (could extend)
    if (holiday === 'valentines') return SpringDecorations;

    // Default to season
    switch (season) {
      case 'winter': return WinterDecorations;
      case 'spring': return SpringDecorations;
      case 'summer': return SummerDecorations;
      case 'fall': return FallDecorations;
      default: return SpringDecorations;
    }
  }, [season, holiday]);

  return <DecorationComponent className={className} intensity={intensity} />;
}

/**
 * Seasonal wrapper for Kids Portal content
 */
interface SeasonalWrapperProps {
  children: React.ReactNode;
  className?: string;
  showDecorations?: boolean;
  intensity?: 'subtle' | 'normal' | 'festive';
}

export function SeasonalWrapper({
  children,
  className,
  showDecorations = true,
  intensity = 'normal',
}: SeasonalWrapperProps) {
  return (
    <div className={cn('relative', className)}>
      {showDecorations && (
        <SeasonalDecorations intensity={intensity} className="z-0" />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export default SeasonalDecorations;
