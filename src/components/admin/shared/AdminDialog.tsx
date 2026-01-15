import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface BaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
}

interface AdminDialogProps extends BaseDialogProps {
  variant?: 'default' | 'destructive';
  footer?: ReactNode;
}

interface ConfirmationDialogProps extends BaseDialogProps {
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
  confirmDisabled?: boolean;
  confirmVariant?: 'default' | 'destructive';
}

/**
 * Base admin dialog component for non-destructive operations
 */
export function AdminDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  variant = 'default',
  children,
  footer,
}: AdminDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${
            variant === 'destructive' ? 'text-destructive' : ''
          }`}>
            {Icon && <Icon className="h-5 w-5" />}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Alert dialog for destructive operations requiring confirmation
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  confirmDisabled = false,
  confirmVariant = 'destructive',
}: ConfirmationDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className={`flex items-center gap-2 ${
            confirmVariant === 'destructive' ? 'text-destructive' : ''
          }`}>
            {Icon && <Icon className="h-5 w-5" />}
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={confirmDisabled || loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface ConfirmationInputProps {
  value: string;
  onChange: (value: string) => void;
  targetValue: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Reusable confirmation input component for delete operations
 */
export function ConfirmationInput({
  value,
  onChange,
  targetValue,
  label,
  placeholder = 'Type to confirm',
  disabled = false,
}: ConfirmationInputProps) {
  const isValid = value === targetValue;

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm text-muted-foreground">
          {label} Type <code className="bg-muted px-1 py-0.5 rounded text-xs">{targetValue}</code> to confirm:
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md bg-background ${
          value && !isValid ? 'border-destructive' : 'border-input'
        }`}
      />
      {value && !isValid && (
        <p className="text-xs text-destructive">
          Input does not match. Please type exactly: {targetValue}
        </p>
      )}
    </div>
  );
}

interface DialogActionsProps {
  onCancel: () => void;
  onConfirm: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  loading?: boolean;
  confirmDisabled?: boolean;
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

/**
 * Standardized dialog action buttons
 */
export function DialogActions({
  onCancel,
  onConfirm,
  cancelLabel = 'Cancel',
  confirmLabel = 'Save',
  loading = false,
  confirmDisabled = false,
  confirmVariant = 'default',
}: DialogActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={onCancel} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button
        variant={confirmVariant}
        onClick={onConfirm}
        disabled={confirmDisabled || loading}
      >
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {confirmLabel}
      </Button>
    </div>
  );
}
