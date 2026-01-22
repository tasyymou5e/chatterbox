/**
 * AvatarDisplaySafe - Error boundary wrapper for avatar display
 * Provides graceful fallback if avatar rendering fails
 */

import { ErrorBoundary } from 'react-error-boundary';
import { AvatarDisplay } from './AvatarDisplay';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AvatarConfig, AvatarCustomization } from '@/types/avatar';
import { cn } from '@/lib/utils';

interface AvatarDisplaySafeProps {
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
 * Get initials from name for fallback display
 */
function getInitials(name?: string): string {
  if (!name) {
    return '?';
  }
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Fallback UI when avatar fails to render
 */
function AvatarFallbackUI({ 
  name, 
  size = 'md',
  className,
}: { 
  name?: string; 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  return (
    <Avatar className={cn(sizeClasses[size], 'border-2 border-muted', className)}>
      <AvatarFallback className="bg-muted text-muted-foreground font-medium">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * Error-safe avatar display component
 * Wraps AvatarDisplay in an error boundary with graceful fallback
 */
export function AvatarDisplaySafe(props: AvatarDisplaySafeProps) {
  return (
    <ErrorBoundary 
      fallback={
        <AvatarFallbackUI 
          name={props.name} 
          size={props.size} 
          className={props.className}
        />
      }
    >
      <AvatarDisplay {...props} />
    </ErrorBoundary>
  );
}

export default AvatarDisplaySafe;
