/**
 * AdminEmptyState - Professional empty state for admin tables
 * Uses unDraw style illustrations with contextual messages and actions
 */

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ProfessionalIllustration, ProfessionalIllustrationVariant } from '@/components/illustrations';
import { Plus, Search, RefreshCw } from 'lucide-react';

type AdminEmptyStateVariant = 'users' | 'families' | 'content' | 'noResults';

interface AdminEmptyStateProps {
  /** Type of empty state to show */
  variant: AdminEmptyStateVariant;
  /** Whether showing filtered results with no matches */
  isFiltered?: boolean;
  /** Search term that was used */
  searchTerm?: string;
  /** Primary action button */
  onPrimaryAction?: () => void;
  /** Custom primary action label */
  primaryActionLabel?: string;
  /** Secondary action (usually clear filters) */
  onSecondaryAction?: () => void;
  /** Additional CSS classes */
  className?: string;
}

const variantConfig: Record<AdminEmptyStateVariant, {
  illustration: ProfessionalIllustrationVariant;
  title: string;
  message: string;
  filteredTitle: string;
  filteredMessage: string;
  actionLabel: string;
  actionIcon: typeof Plus;
}> = {
  users: {
    illustration: 'users',
    title: 'No users yet',
    message: 'Create your first user to get started managing your team.',
    filteredTitle: 'No users found',
    filteredMessage: 'Try adjusting your search or filter criteria.',
    actionLabel: 'Add User',
    actionIcon: Plus,
  },
  families: {
    illustration: 'family',
    title: 'No families yet',
    message: 'Families help organize users into groups. Create a test family to explore.',
    filteredTitle: 'No families found',
    filteredMessage: 'Try a different search term or clear your filters.',
    actionLabel: 'Create Test Family',
    actionIcon: Plus,
  },
  content: {
    illustration: 'content',
    title: 'No content items',
    message: 'Start building your content library by adding educational materials.',
    filteredTitle: 'No content matches',
    filteredMessage: 'Adjust your category or status filters to see more items.',
    actionLabel: 'Add Content',
    actionIcon: Plus,
  },
  noResults: {
    illustration: 'noResults',
    title: 'No results found',
    message: 'We couldn\'t find anything matching your search.',
    filteredTitle: 'No matches',
    filteredMessage: 'Try different keywords or clear your filters.',
    actionLabel: 'Clear Search',
    actionIcon: RefreshCw,
  },
};

/**
 * Professional empty state component for admin tables
 */
export function AdminEmptyState({
  variant,
  isFiltered = false,
  searchTerm,
  onPrimaryAction,
  primaryActionLabel,
  onSecondaryAction,
  className,
}: AdminEmptyStateProps) {
  const config = variantConfig[variant];
  const ActionIcon = config.actionIcon;

  const title = isFiltered ? config.filteredTitle : config.title;
  const message = isFiltered 
    ? (searchTerm 
        ? `No results for "${searchTerm}". ${config.filteredMessage}` 
        : config.filteredMessage)
    : config.message;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      <ProfessionalIllustration
        variant={config.illustration}
        size="xl"
        animate="fadeIn"
      />

      <h3 className="mt-6 text-xl font-semibold text-foreground">
        {title}
      </h3>

      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        {message}
      </p>

      <div className="mt-6 flex items-center gap-3">
        {onPrimaryAction && (
          <Button onClick={onPrimaryAction} className="gap-2">
            <ActionIcon className="h-4 w-4" />
            {primaryActionLabel || config.actionLabel}
          </Button>
        )}

        {isFiltered && onSecondaryAction && (
          <Button variant="outline" onClick={onSecondaryAction} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      {isFiltered && searchTerm && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Search className="h-3 w-3" />
          <span>Searched for: "{searchTerm}"</span>
        </div>
      )}
    </div>
  );
}

export default AdminEmptyState;
