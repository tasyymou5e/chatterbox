/**
 * AvatarDisplay - Unified avatar display component
 * Shows either illustrated avatar or uploaded photo
 */

import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AvatarCharacter } from './AvatarCharacter';
import { AvatarConfig, AvatarCustomization, DEFAULT_AVATAR } from '@/types/avatar';

interface AvatarDisplayProps {
  /** Full avatar config from database */
  avatar?: AvatarConfig | null;
  /** Or just customization for preview */
  customization?: AvatarCustomization;
  /** Fallback name for initials */
  name?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
  /** Show animation */
  animated?: boolean;
  /** Click handler to open avatar editor */
  onClick?: () => void;
  /** Show edit indicator on hover */
  editable?: boolean;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
};

/**
 * Get initials from name
 */
function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Unified avatar display component
 */
export function AvatarDisplay({
  avatar,
  customization,
  name,
  size = 'md',
  className,
  animated = false,
  onClick,
  editable = false,
}: AvatarDisplayProps) {
  // Determine what to show
  const isUploaded = avatar?.avatarType === 'uploaded' && avatar.uploadedUrl;
  const effectiveCustomization = customization || (avatar ? {
    baseCharacter: avatar.baseCharacter,
    skinTone: avatar.skinTone,
    hairColor: avatar.hairColor,
    hairStyle: avatar.hairStyle,
    eyeColor: avatar.eyeColor,
    accessory: avatar.accessory,
    outfitColor: avatar.outfitColor,
  } : null);

  // Show uploaded photo
  if (isUploaded) {
    return (
      <div 
        className={cn(
          'relative group',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <Avatar className={cn(sizeClasses[size], 'border-2 border-primary/20')}>
          <AvatarImage 
            src={avatar.uploadedUrl} 
            alt={name ? `${name}'s profile picture` : 'User profile picture'} 

          />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        {editable && (
          <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-medium">Edit</span>
          </div>
        )}
      </div>
    );
  }

  // Show illustrated avatar
  if (effectiveCustomization) {
    return (
      <div 
        className={cn(
          'relative group',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <AvatarCharacter
          customization={effectiveCustomization}
          size={size}
          animated={animated}
          className="border-2 border-primary/20"
        />
        {editable && (
          <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-medium">Edit</span>
          </div>
        )}
      </div>
    );
  }

  // Fallback to initials
  return (
    <div 
      className={cn(
        'relative group',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <Avatar className={cn(sizeClasses[size], 'border-2 border-primary/20')}>
        <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      {editable && (
        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs font-medium">Edit</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact avatar for certificates - shows just the character
 */
export function CertificateAvatar({
  avatar,
  customization,
  name,
  className,
}: {
  avatar?: AvatarConfig | null;
  customization?: AvatarCustomization;
  name?: string;
  className?: string;
}) {
  const isUploaded = avatar?.avatarType === 'uploaded' && avatar.uploadedUrl;
  const effectiveCustomization = customization || (avatar ? {
    baseCharacter: avatar.baseCharacter,
    skinTone: avatar.skinTone,
    hairColor: avatar.hairColor,
    hairStyle: avatar.hairStyle,
    eyeColor: avatar.eyeColor,
    accessory: avatar.accessory,
    outfitColor: avatar.outfitColor,
  } : DEFAULT_AVATAR);

  if (isUploaded) {
    return (
      <div className={cn('w-20 h-20 rounded-full overflow-hidden border-4 border-warning', className)}>
        <img 
          src={avatar.uploadedUrl}
          alt={name ? `${name}'s profile picture` : 'User profile picture'}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={cn('w-20 h-20', className)}>
      <AvatarCharacter
        customization={effectiveCustomization}
        size="lg"
        className="border-4 border-warning"
      />
    </div>
  );
}

export default AvatarDisplay;
