import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';

import { useLoginRateLimiter } from '@/hooks/useLoginRateLimiter';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getAuthErrorMessage } from './authErrorUtils';
import { validateAndSanitizeFormData, validationSchemas } from '@/utils/enhancedInputValidation';
import { getDashboardPath } from '@/utils/authHelpers';

interface SignInFormProps {
  onForgotPassword: () => void;
  onChildSignup: () => void;
}

/**
 * Sign in form component with rate limiting and input validation.
 */
export const SignInForm = ({ onForgotPassword, onChildSignup }: SignInFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { checkAttempt, formattedTimeRemaining, refreshStatus } = useLoginRateLimiter('user');

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const rawData = {
      email: formData.get('signin-email') as string,
      password: formData.get('signin-password') as string,
    };

    // Validate and sanitize input using Zod schema
    const validation = validateAndSanitizeFormData(rawData, validationSchemas.signIn);
    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: validation.errors.join(', '),
        variant: 'destructive',
      });
      return;
    }

    const { email, password } = validation.data;

    // Check rate limit BEFORE attempting login
    if (!checkAttempt(email)) {
      toast({
        title: 'Too Many Attempts',
        description: `Account temporarily locked. Please wait ${formattedTimeRemaining} before trying again.`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error, user, userRole } = await signIn(email, password);

      if (error) {
        // Failed login is already logged by authActionsStore
        refreshStatus(email);
        
        const errorDetails = getAuthErrorMessage(error);
        toast({
          title: errorDetails.title,
          description: errorDetails.description,
          variant: 'destructive',
        });
      } else if (user) {
        toast({
          title: 'Welcome Back!',
          description: 'You have been signed in successfully.',
        });
        
        // Navigate explicitly using the role returned from signIn
        const dashboardPath = getDashboardPath(userRole || 'parent');
        navigate(dashboardPath, { replace: true });
      }
    } catch (err) {
      refreshStatus(email);
      const errorDetails = getAuthErrorMessage(err);
      toast({
        title: errorDetails.title,
        description: errorDetails.description,
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email Address</Label>
        <Input
          id="signin-email"
          name="signin-email"
          type="email"
          placeholder="your@example.com"
          required
          autoComplete="email"
          spellCheck={false}
          aria-describedby="signin-email-help"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          name="signin-password"
          type="password"
          placeholder="Enter your password"
          required
          aria-describedby="signin-password-help"
        />
      </div>
      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary-hover"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing In & Verifying Access...
          </>
        ) : (
          'Sign In'
        )}
      </Button>
      
      {/* Forgot Password Link */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-primary hover:text-primary-hover underline"
        >
          Forgot your password?
        </button>
      </div>

      {/* Child Signup Link */}
      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground">
          Have an account code from your parent?{' '}
          <button
            type="button"
            onClick={onChildSignup}
            className="text-accent hover:text-accent-hover underline"
          >
            Complete your account setup
          </button>
        </p>
      </div>
    </form>
  );
};
