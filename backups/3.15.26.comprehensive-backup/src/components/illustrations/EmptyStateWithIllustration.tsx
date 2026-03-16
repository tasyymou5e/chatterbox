/**
 * EmptyStateWithIllustration - Reusable empty state with illustration
 * Provides a friendly, visual empty state for various sections
 */

import { cn } from '@/lib/utils';
import { KidsIllustration, KidsIllustrationVariant } from './KidsIllustration';
import { Button } from '@/components/ui/button';

interface EmptyStateWithIllustrationProps {
  /** Type of portal/section */
  variant: 'kids' | 'professional';
  /** Which illustration to show */
  illustration: KidsIllustrationVariant;
  /** Main title */
  title: string;
  /** Descriptive message */
  message: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * Empty state component with playful illustrations
 */
export function EmptyStateWithIllustration({
  variant,
  illustration,
  title,
  message,
  action,
  className,
}: EmptyStateWithIllustrationProps) {
  const isKids = variant === 'kids';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        isKids && 'py-16',
        className
      )}
    >
      <KidsIllustration
        variant={illustration}
        size={isKids ? 'xl' : 'lg'}
        animate="fadeIn"
      />

      <h3
        className={cn(
          'mt-6 font-semibold',
          isKids 
            ? 'text-2xl md:text-3xl text-foreground' 
            : 'text-xl text-foreground'
        )}
      >
        {title}
      </h3>

      <p
        className={cn(
          'mt-2 max-w-md',
          isKids
            ? 'text-lg text-muted-foreground'
            : 'text-sm text-muted-foreground'
        )}
      >
        {message}
      </p>

      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'default'}
          size={isKids ? 'lg' : 'default'}
          className={cn(
            'mt-6',
            isKids && 'text-lg px-8 py-3'
          )}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Kids-specific empty state with enhanced visuals
 */
export function KidsEmptyState({
  illustration,
  title,
  message,
  action,
  className,
}: Omit<EmptyStateWithIllustrationProps, 'variant'>) {
  return (
    <EmptyStateWithIllustration
      variant="kids"
      illustration={illustration}
      title={title}
      message={message}
      action={action}
      className={className}
    />
  );
}

/**
 * Loading state with illustration for kids portal
 */
export function KidsLoadingState({
  message = 'Loading...',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4',
        className
      )}
    >
      <KidsIllustration
        variant="thinking"
        size="xl"
        message={message}
        animate="float"
      />
    </div>
  );
}

/**
 * Break reminder state with calming illustration
 */
export function KidsBreakState({
  onResume,
  className,
}: {
  onResume: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <KidsIllustration
        variant="resting"
        size="xl"
        animate="fadeIn"
      />

      <h3 className="mt-6 text-2xl md:text-3xl font-semibold text-foreground">
        Time for a break! 🌟
      </h3>

      <p className="mt-2 text-lg text-muted-foreground max-w-md">
        You've been doing great! Take a moment to rest your eyes and stretch.
      </p>

      <Button
        onClick={onResume}
        size="lg"
        className="mt-6 text-lg px-8 py-3"
      >
        I'm Ready to Continue!
      </Button>
    </div>
  );
}

export default EmptyStateWithIllustration;
