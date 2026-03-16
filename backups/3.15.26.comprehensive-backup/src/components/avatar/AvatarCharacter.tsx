/**
 * AvatarCharacter - Renders a customizable illustrated character
 * SVG-based avatar with configurable features
 */

import { cn } from '@/lib/utils';
import {
  AvatarCustomization,
  SKIN_TONE_COLORS,
  HAIR_COLORS,
  EYE_COLORS,
  OUTFIT_COLORS,
  DEFAULT_AVATAR,
} from '@/types/avatar';

interface AvatarCharacterProps {
  customization?: AvatarCustomization;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Show animation on the character */
  animated?: boolean;
}

const sizeMap = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-32 h-32',
  xl: 'w-48 h-48',
};

/**
 * Hair style SVG paths
 */
const hairPaths: Record<string, (color: string) => React.ReactNode> = {
  short: (color) => (
    <path 
      d="M50 25 C30 25 20 40 20 55 C20 45 30 30 50 28 C70 30 80 45 80 55 C80 40 70 25 50 25" 
      fill={color}
    />
  ),
  long: (color) => (
    <>
      <path 
        d="M50 25 C30 25 18 40 18 55 L18 85 C18 90 25 92 28 88 L28 55 C28 45 35 32 50 30 C65 32 72 45 72 55 L72 88 C75 92 82 90 82 85 L82 55 C82 40 70 25 50 25" 
        fill={color}
      />
    </>
  ),
  curly: (color) => (
    <>
      <circle cx="25" cy="40" r="8" fill={color} />
      <circle cx="35" cy="30" r="9" fill={color} />
      <circle cx="50" cy="25" r="10" fill={color} />
      <circle cx="65" cy="30" r="9" fill={color} />
      <circle cx="75" cy="40" r="8" fill={color} />
      <circle cx="22" cy="55" r="7" fill={color} />
      <circle cx="78" cy="55" r="7" fill={color} />
    </>
  ),
  spiky: (color) => (
    <>
      <polygon points="50,15 45,35 55,35" fill={color} />
      <polygon points="35,20 35,40 45,35" fill={color} />
      <polygon points="65,20 55,35 65,40" fill={color} />
      <polygon points="25,30 28,50 38,40" fill={color} />
      <polygon points="75,30 62,40 72,50" fill={color} />
      <path d="M25 50 C25 40 35 30 50 28 C65 30 75 40 75 50 L75 55 C75 45 65 35 50 35 C35 35 25 45 25 55 Z" fill={color} />
    </>
  ),
  ponytail: (color) => (
    <>
      <path d="M50 25 C30 25 20 40 20 55 C20 45 30 30 50 28 C70 30 80 45 80 55 C80 40 70 25 50 25" fill={color} />
      <ellipse cx="75" cy="45" rx="8" ry="25" fill={color} />
    </>
  ),
  pigtails: (color) => (
    <>
      <path d="M50 25 C30 25 20 40 20 55 C20 45 30 30 50 28 C70 30 80 45 80 55 C80 40 70 25 50 25" fill={color} />
      <ellipse cx="22" cy="55" rx="8" ry="20" fill={color} />
      <ellipse cx="78" cy="55" rx="8" ry="20" fill={color} />
    </>
  ),
  bun: (color) => (
    <>
      <path d="M50 25 C30 25 20 40 20 55 C20 45 30 30 50 28 C70 30 80 45 80 55 C80 40 70 25 50 25" fill={color} />
      <circle cx="50" cy="18" r="12" fill={color} />
    </>
  ),
  mohawk: (color) => (
    <>
      <path d="M45 15 L50 5 L55 15 L50 20 Z" fill={color} />
      <path d="M45 20 L50 12 L55 20 L50 28 Z" fill={color} />
      <path d="M45 28 L50 20 L55 28 L50 35 Z" fill={color} />
      <path d="M30 50 C30 40 40 32 50 32 C60 32 70 40 70 50 L70 55 C70 48 60 40 50 40 C40 40 30 48 30 55 Z" fill={color} />
    </>
  ),
};

/**
 * Accessory SVG elements
 */
const accessories: Record<string, React.ReactNode> = {
  none: null,
  glasses: (
    <>
      <circle cx="38" cy="52" r="10" fill="none" stroke="#333" strokeWidth="2" />
      <circle cx="62" cy="52" r="10" fill="none" stroke="#333" strokeWidth="2" />
      <line x1="48" y1="52" x2="52" y2="52" stroke="#333" strokeWidth="2" />
      <line x1="28" y1="52" x2="22" y2="48" stroke="#333" strokeWidth="2" />
      <line x1="72" y1="52" x2="78" y2="48" stroke="#333" strokeWidth="2" />
    </>
  ),
  sunglasses: (
    <>
      <rect x="28" y="45" width="20" height="14" rx="3" fill="#333" />
      <rect x="52" y="45" width="20" height="14" rx="3" fill="#333" />
      <line x1="48" y1="52" x2="52" y2="52" stroke="#333" strokeWidth="2" />
      <line x1="28" y1="48" x2="22" y2="45" stroke="#333" strokeWidth="2" />
      <line x1="72" y1="48" x2="78" y2="45" stroke="#333" strokeWidth="2" />
    </>
  ),
  hat: (
    <g>
      <ellipse cx="50" cy="28" rx="30" ry="8" fill="#333" />
      <rect x="35" y="10" width="30" height="20" rx="5" fill="#333" />
    </g>
  ),
  bow: (
    <g>
      <circle cx="30" cy="35" r="6" fill="#E91E63" />
      <circle cx="20" cy="35" r="8" fill="#E91E63" />
      <circle cx="40" cy="35" r="8" fill="#E91E63" />
    </g>
  ),
  headband: (
    <path 
      d="M20 40 Q30 30 50 30 Q70 30 80 40" 
      fill="none" 
      stroke="#9B59B6" 
      strokeWidth="4" 
      strokeLinecap="round"
    />
  ),
  crown: (
    <g>
      <polygon points="30,35 35,20 40,30 45,15 50,28 55,15 60,30 65,20 70,35" fill="#F1C40F" stroke="#E67E22" strokeWidth="1" />
      <rect x="30" y="35" width="40" height="6" fill="#F1C40F" stroke="#E67E22" strokeWidth="1" />
    </g>
  ),
  flower: (
    <g>
      <circle cx="25" cy="35" r="4" fill="#E91E63" />
      <circle cx="21" cy="31" r="4" fill="#E91E63" />
      <circle cx="29" cy="31" r="4" fill="#E91E63" />
      <circle cx="21" cy="39" r="4" fill="#E91E63" />
      <circle cx="29" cy="39" r="4" fill="#E91E63" />
      <circle cx="25" cy="35" r="3" fill="#F1C40F" />
    </g>
  ),
};

/**
 * Illustrated avatar character component
 */
export function AvatarCharacter({
  customization = DEFAULT_AVATAR,
  size = 'md',
  className,
  animated = false,
}: AvatarCharacterProps) {
  const skinColor = SKIN_TONE_COLORS[customization.skinTone];
  const hairColor = HAIR_COLORS[customization.hairColor];
  const eyeColor = EYE_COLORS[customization.eyeColor];
  const outfitColor = OUTFIT_COLORS[customization.outfitColor];

  const HairComponent = hairPaths[customization.hairStyle];
  const AccessoryComponent = accessories[customization.accessory];

  return (
    <div 
      className={cn(
        sizeMap[size],
        'relative rounded-full overflow-hidden',
        animated && 'animate-[float_3s_ease-in-out_infinite]',
        className
      )}
    >
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <circle cx="50" cy="50" r="50" className="fill-primary/20" />
        
        {/* Neck */}
        <rect x="42" y="70" width="16" height="15" fill={skinColor} />
        
        {/* Body/Outfit */}
        <ellipse cx="50" cy="95" rx="25" ry="18" fill={outfitColor} />
        <path 
          d="M35 85 Q50 75 65 85 L65 100 L35 100 Z" 
          fill={outfitColor}
        />
        
        {/* Face */}
        <ellipse cx="50" cy="50" rx="28" ry="30" fill={skinColor} />
        
        {/* Hair (behind face for some styles) */}
        {HairComponent && HairComponent(hairColor)}
        
        {/* Eyes */}
        <ellipse cx="38" cy="52" rx="6" ry="7" fill="white" />
        <ellipse cx="62" cy="52" rx="6" ry="7" fill="white" />
        <circle cx="38" cy="53" r="4" fill={eyeColor} />
        <circle cx="62" cy="53" r="4" fill={eyeColor} />
        <circle cx="39" cy="51" r="1.5" fill="white" />
        <circle cx="63" cy="51" r="1.5" fill="white" />
        
        {/* Eyebrows */}
        <path d="M32 44 Q38 42 44 44" fill="none" stroke={hairColor} strokeWidth="2" strokeLinecap="round" />
        <path d="M56 44 Q62 42 68 44" fill="none" stroke={hairColor} strokeWidth="2" strokeLinecap="round" />
        
        {/* Nose */}
        <ellipse cx="50" cy="60" rx="3" ry="4" fill={skinColor} />
        <path d="M47 62 Q50 65 53 62" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
        
        {/* Mouth - happy smile */}
        <path 
          d="M40 68 Q50 78 60 68" 
          fill="none" 
          stroke="#333" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
        
        {/* Blush */}
        <ellipse cx="30" cy="62" rx="5" ry="3" fill="#FFB6C1" opacity="0.5" />
        <ellipse cx="70" cy="62" rx="5" ry="3" fill="#FFB6C1" opacity="0.5" />
        
        {/* Accessory */}
        {AccessoryComponent}
      </svg>
    </div>
  );
}

export default AvatarCharacter;
