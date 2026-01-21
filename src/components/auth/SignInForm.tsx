import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useAuthLogging } from '@/hooks/useAuthLogging';
import { useLoginRateLimiter } from '@/hooks/useLoginRateLimiter';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getAuthErrorMessage } from './authErrorUtils';
import { validateAndSanitizeFormData, validationSchemas } from '@/utils/enhancedInputValidation';

interface SignInFormProps {
  onForgotPassword: () => void;
  onChildSignup: () => void;
}

/**
 * Sign in form component with rate limiting and input validation.
 */
export const SignInForm = ({ onForgotPassword, onChildSignup }: SignInFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const { logActivity, createSession } = useAuthLogging();
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
      const { error, user } = await signIn(email, password);

      if (error) {
        await logActivity('unknown', 'failed_login', false, error.message, {
          email,
          errorType: error.name || 'SigninError',
          attemptedAt: new Date().toISOString()
        });
        
        refreshStatus(email);
        
        const errorDetails = getAuthErrorMessage(error);
        toast({
          title: errorDetails.title,
          description: errorDetails.description,
          variant: 'destructive',
        });
      } else if (user) {
        const sessionId = await logActivity(user.id, 'login', true, undefined, {
          email,
          loginMethod: 'email_password',
          loginAt: new Date().toISOString()
        });
        
        if (sessionId) {
          await createSession(user.id);
        }
        
        toast({
          title: 'Welcome Back!',
          description: 'You have been signed in successfully.',
        });
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
