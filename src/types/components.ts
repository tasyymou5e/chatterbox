import { ReactNode } from 'react';

/**
 * Base props shared across all components
 */
export interface BaseComponentProps {
  className?: string;
  testId?: string;
}

/**
 * Props for components with loading and error states
 */
export interface LoadableProps {
  loading?: boolean;
  error?: Error | null;
}

/**
 * Standard dialog component props
 */
export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog with form submission capabilities
 */
export interface FormDialogProps extends DialogProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Props for list item components with CRUD capabilities
 */
export interface ListItemProps<T> {
  item: T;
  isSelected?: boolean;
  onSelect?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

/**
 * Props for paginated data components
 */
export interface PaginatedProps {
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  totalItems?: number;
  totalPages?: number;
}

/**
 * Utility type for components that require children
 */
export type WithChildren<T = object> = T & { children: ReactNode };

/**
 * Utility type for components with optional children
 */
export type WithOptionalChildren<T = object> = T & { children?: ReactNode };

/**
 * Props for async data loading components
 */
export interface AsyncDataProps<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  onRetry?: () => void;
}

/**
 * Props for filterable and searchable components
 */
export interface FilterableProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filters?: Record<string, unknown>;
  onFilterChange?: (filters: Record<string, unknown>) => void;
}

/**
 * Props for sortable components
 */
export interface SortableProps {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
}

/**
 * Common button action props
 */
export interface ActionButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

/**
 * Props for confirmation dialogs
 */
export interface ConfirmationDialogProps extends DialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}

/**
 * Props for page wrapper components
 */
export interface PageProps extends BaseComponentProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
}

/**
 * Props for form field components
 */
export interface FormFieldProps {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}
