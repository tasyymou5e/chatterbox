import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { getAuthErrorMessage } from './authErrorUtils';

interface ForgotPasswordFormProps {
  onBackToSignIn: () => void;
}

/**
 * Forgot password form for requesting password reset emails.
 */
export const ForgotPasswordForm = ({ onBackToSignIn }: ForgotPasswordFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await resetPassword(email, 'user');

      if (error) {
        const errorDetails = getAuthErrorMessage(error);
        toast({
          title: errorDetails.title,
          description: errorDetails.description,
          variant: 'destructive',
        });
      } else {
        setIsEmailSent(true);
        toast({
          title: 'Password Reset Email Sent',
          description: 'Please check your email for password reset instructions.',
        });
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
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBackToSignIn}
          className="p-0 h-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Sign In
        </Button>
      </div>

      {!isEmailSent ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email Address</Label>
            <Input
              id="forgot-email"
              name="forgot-email"
              type="email"
              placeholder="Enter your email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby="forgot-email-help"
            />
            <p id="forgot-email-help" className="text-xs text-muted-foreground">
              We'll send you instructions to reset your password
            </p>
          </div>
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary-hover"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Reset Instructions...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Reset Instructions
              </>
            )}
          </Button>
        </form>
      ) : (
        <div className="text-center space-y-4">
          <div className="p-4 bg-success/10 rounded-lg border border-success/20">
            <Mail className="h-8 w-8 text-success mx-auto mb-2" />
            <h3 className="font-medium text-success mb-1">Email Sent!</h3>
            <p className="text-sm text-muted-foreground">
              We've sent password reset instructions to{' '}
              <span className="font-medium">{email}</span>
            </p>
          </div>
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEmailSent(false);
                setEmail('');
              }}
              className="w-full"
            >
              Try Different Email
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onBackToSignIn}
              className="w-full text-xs"
            >
              Back to Sign In
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
