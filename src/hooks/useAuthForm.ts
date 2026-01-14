import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

type AuthFormType = 'signin' | 'signup' | 'reset';

interface UseAuthFormOptions {
  type: AuthFormType;
  onSuccess?: () => void;
}

interface AuthFormData {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Consolidated hook for authentication form logic.
 * Handles signin, signup, and password reset with consistent error handling.
 * 
 * @param options - Form configuration with type and success callback
 * @returns handleSubmit function and loading state
 * 
 * @example
 * const { handleSubmit, isLoading } = useAuthForm({ 
 *   type: 'signin', 
 *   onSuccess: () => navigate('/dashboard') 
 * });
 */
export function useAuthForm({ type, onSuccess }: UseAuthFormOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  
  const handleSubmit = useCallback(async (formData: AuthFormData) => {
    if (isLoading) return { error: { message: 'Operation in progress' } };
    
    setIsLoading(true);
    
    try {
      let result;
      
      switch (type) {
        case 'signin':
          if (!formData.password) {
            return { error: { message: 'Password is required' } };
          }
          result = await signIn(formData.email, formData.password);
          if (!result.error) {
            toast.success('Signed in successfully');
          }
          break;
          
        case 'signup':
          if (!formData.password) {
            return { error: { message: 'Password is required' } };
          }
          result = await signUp(
            formData.email, 
            formData.password, 
            formData.firstName, 
            formData.lastName
          );
          if (!result.error) {
            toast.success('Account created! Check your email for verification.');
          }
          break;
          
        case 'reset':
          result = await resetPassword(formData.email);
          if (!result.error) {
            toast.success('Password reset email sent');
          }
          break;
          
        default:
          return { error: { message: 'Invalid form type' } };
      }
      
      if (result.error) {
        toast.error(result.error.message || 'An error occurred');
      } else {
        onSuccess?.();
      }
      
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [type, signIn, signUp, resetPassword, onSuccess, isLoading]);
  
  return { handleSubmit, isLoading };
}
