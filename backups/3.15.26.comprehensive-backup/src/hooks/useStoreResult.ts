import { useToast } from '@/hooks/use-toast';
import type { StoreResult, StoreError } from '@/services/storeUtils';

/**
 * Hook to handle store operation results with automatic toast notifications
 * Usage: 
 * 
 * const handleResult = useStoreResult();
 * const result = await choreStore.createChore(data);
 * handleResult(result, { 
 *   successTitle: 'Success!',
 *   errorTitle: 'Error creating chore'
 * });
 */
export const useStoreResult = () => {
  const { toast } = useToast();

  const handleResult = (
    result: StoreResult,
    options?: {
      successTitle?: string;
      errorTitle?: string;
      showSuccess?: boolean;
      showError?: boolean;
    }
  ) => {
    const {
      successTitle = 'Success',
      errorTitle = 'Error',
      showSuccess = true,
      showError = true,
    } = options || {};

    if (result.success === true) {
      if (showSuccess) {
        toast({
          title: successTitle,
          description: result.result.message || 'Operation completed successfully',
        });
      }
      return result.result.data;
    }
    
    if (result.success === false) {
      if (showError) {
        toast({
          title: errorTitle,
          description: result.error.message,
          variant: 'destructive',
        });
      }
      return null;
    }

    return null;
  };

  return handleResult;
};

/**
 * Hook to handle store errors with automatic error notifications
 */
export const useStoreError = () => {
  const { toast } = useToast();

  const handleError = (error: StoreError | null, title = 'Error') => {
    if (error) {
      toast({
        title,
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return handleError;
};