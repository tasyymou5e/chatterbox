import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useAuthLogging } from '@/hooks/useAuthLogging';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { getAuthErrorMessage } from './authErrorUtils';
import { validateAndSanitizeFormData, validationSchemas } from '@/utils/enhancedInputValidation';

interface SignUpFormProps {
  isSignupEnabled: boolean;
  onSignUpSuccess: () => void;
}

/**
 * Sign up form component for parent account creation.
 * Uses Zod schema validation for security.
 */
export const SignUpForm = ({ isSignupEnabled, onSignUpSuccess }: SignUpFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [signupPassword, setSignupPassword] = useState('');
  const { signUp } = useAuth();
  const { logActivity } = useAuthLogging();

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!isSignupEnabled) {
      toast({
        title: 'Signup Disabled',
        description: 'Parent signup is currently disabled. Please contact support if you need assistance.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const rawData = {
      email: formData.get('signup-email') as string,
      password: formData.get('signup-password') as string,
      firstName: formData.get('first-name') as string,
      lastName: formData.get('last-name') as string,
    };

    // Validate and sanitize input using Zod schema
    const validation = validateAndSanitizeFormData(rawData, validationSchemas.signUp);
    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: validation.errors.join(', '),
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { email, password, firstName, lastName } = validation.data;

    try {
      const { error } = await signUp(email, password, firstName, lastName);

      if (error) {
        await logActivity('unknown', 'signup', false, error.message, {
          email,
          firstName,
          lastName,
          errorType: error.name || 'SignupError'
        });
        
        const errorDetails = getAuthErrorMessage(error);
        toast({
          title: errorDetails.title,
          description: errorDetails.description,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Account Created Successfully!',
          description: 'Please check your email to verify your account before signing in.',
        });
        onSignUpSuccess();
      }
    } catch (err) {
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
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first-name">First Name</Label>
          <Input
            id="first-name"
            name="first-name"
            placeholder="John"
            required
            disabled={!isSignupEnabled}
            aria-describedby="first-name-help"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Last Name</Label>
          <Input
            id="last-name"
            name="last-name"
            placeholder="Doe"
            required
            disabled={!isSignupEnabled}
            aria-describedby="last-name-help"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email Address</Label>
        <Input
          id="signup-email"
          name="signup-email"
          type="email"
          placeholder="your@example.com"
          required
          disabled={!isSignupEnabled}
          aria-describedby="signup-email-help"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          name="signup-password"
          type="password"
          placeholder="Create a secure password"
          required
          minLength={8}
          disabled={!isSignupEnabled}
          value={signupPassword}
          onChange={(e) => setSignupPassword(e.target.value)}
          aria-describedby="password-requirements"
        />
      </div>
      
      <PasswordStrengthIndicator password={signupPassword} className="mt-3" />
      
      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary-hover"
        disabled={isLoading || !isSignupEnabled}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Account & Setting Up Profile...
          </>
        ) : (
          'Create Account'
        )}
      </Button>
    </form>
  );
};
