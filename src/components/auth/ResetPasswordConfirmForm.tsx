import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Shield, CheckCircle } from 'lucide-react';

interface ResetPasswordConfirmFormProps {
  onBackToSignIn: () => void;
}

/**
 * Password reset confirmation form for setting a new password.
 */
export const ResetPasswordConfirmForm = ({ onBackToSignIn }: ResetPasswordConfirmFormProps) => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isResetComplete, setIsResetComplete] = useState(false);

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(({ error }) => {
        if (error) {
          console.error('Session setup error:', error);
          toast({
            title: "Invalid Reset Link",
            description: "The password reset link is invalid or expired.",
            variant: "destructive",
          });
        } else {
          setIsValidToken(true);
        }
        setIsCheckingToken(false);
      });
    } else {
      setIsCheckingToken(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const password = formData.get('new-password') as string;
    const confirmPassword = formData.get('confirm-password') as string;
    
    if (!password || !confirmPassword) {
      toast({
        title: "Fields Required",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please ensure both passwords are identical",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        toast({
          title: "Update Failed",
          description: error.message || "Failed to update password. Please try again.",
          variant: "destructive",
        });
      } else {
        setIsResetComplete(true);
        toast({
          title: "Password Updated",
          description: "Your password has been successfully updated.",
        });
        
        setTimeout(() => {
          onBackToSignIn();
        }, 3000);
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingToken) {
    return (
      <div className="flex flex-col items-center space-y-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Verifying reset link...</p>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="text-center space-y-4">
        <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
          <Shield className="h-8 w-8 text-destructive mx-auto mb-2" />
          <h3 className="font-medium text-destructive mb-1">Invalid Reset Link</h3>
          <p className="text-sm text-muted-foreground">
            The password reset link is invalid or has expired.
          </p>
        </div>
        <Button type="button" onClick={onBackToSignIn} className="w-full">
          Back to Sign In
        </Button>
      </div>
    );
  }

  if (isResetComplete) {
    return (
      <div className="text-center space-y-4">
        <div className="p-4 bg-success/10 rounded-lg border border-success/20">
          <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
          <h3 className="font-medium text-success mb-1">Password Updated</h3>
          <p className="text-sm text-muted-foreground">
            Your password has been successfully updated. Redirecting to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h3 className="text-lg font-semibold">Set New Password</h3>
        <p className="text-sm text-muted-foreground">
          Enter your new password below
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <Input
            id="new-password"
            name="new-password"
            type="password"
            required
            minLength={8}
            placeholder="Enter new password (min 8 characters)"
            aria-describedby="new-password-help"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            name="confirm-password"
            type="password"
            required
            minLength={8}
            placeholder="Confirm new password"
            aria-describedby="confirm-password-help"
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
              Updating Password...
            </>
          ) : (
            'Update Password'
          )}
        </Button>
      </form>
    </div>
  );
};
