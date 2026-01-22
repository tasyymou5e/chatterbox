import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, UserPlus, Lock } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { validateAndSanitizeFormData } from '@/utils/enhancedInputValidation';
import { z } from 'zod';

interface ChildSignupFormProps {
  initialCode?: string;
  onBackToSignIn: () => void;
}
/**
 * SECURE Child account signup form for completing account setup with parent-provided code.
 * 
 * Security Features:
 * - Uses secure edge function that NEVER exposes generated_email to client
 * - Supports optional PIN verification
 * - Rate limiting and lockout protection
 */
export const ChildSignupForm = ({ initialCode = '', onBackToSignIn }: ChildSignupFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [accountCode, setAccountCode] = useState(initialCode);
  const [verificationPin, setVerificationPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPinField, setShowPinField] = useState(false);
  const [lockInfo, setLockInfo] = useState<{ isLocked: boolean; remainingSeconds: number } | null>(null);
  const navigate = useNavigate();

  // Zod schema for child signup - PIN is optional
  const childSignupSchema = z.object({
    code: z.string().min(1, 'Account code is required'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long'),
    confirmPassword: z.string(),
    pin: z.string().optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setLockInfo(null);

    const formDataObj = new FormData(e.currentTarget);
    const code = formDataObj.get('account-code') as string;
    const childPassword = formDataObj.get('child-password') as string;
    const confirmPassword = formDataObj.get('child-confirm-password') as string;
    const pin = formDataObj.get('verification-pin') as string;

    const validation = validateAndSanitizeFormData(
      { code, password: childPassword, confirmPassword, pin: pin || undefined },
      childSignupSchema
    );

    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: validation.errors.join(', '),
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      // Call the SECURE edge function - generated_email is NEVER exposed to client
      const { data, error } = await supabase.functions.invoke('complete-child-account', {
        body: {
          familyCode: code.trim().toUpperCase(),
          password: childPassword,
          verificationPin: pin || undefined
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: 'Setup Failed',
          description: 'Failed to complete account setup. Please try again.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Handle locked account
      if (data?.isLocked) {
        const minutes = Math.ceil(data.lockRemainingSeconds / 60);
        setLockInfo({
          isLocked: true,
          remainingSeconds: data.lockRemainingSeconds
        });
        toast({
          title: 'Account Temporarily Locked',
          description: `Too many failed attempts. Please try again in ${minutes} minutes.`,
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Handle error responses
      if (!data?.success) {
        // Check if PIN is required
        if (data?.error?.includes('PIN')) {
          setShowPinField(true);
          toast({
            title: 'Verification Required',
            description: 'Please enter the verification PIN your parent gave you.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Invalid Code',
            description: data?.error || 'Invalid account code or setup incomplete',
            variant: 'destructive'
          });
        }
        setIsLoading(false);
        return;
      }

      // Success! Auto-login with the returned credentials
      if (data.credentials?.email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.credentials.email,
          password: childPassword
        });

        if (signInError) {
          console.error('Auto-login failed:', signInError);
          // Account was created, user just needs to sign in manually
          toast({
            title: "Account Created!",
            description: `Welcome ${data.child?.firstName}! Please sign in with your new account.`,
          });
          onBackToSignIn();
          setIsLoading(false);
          return;
        }
      }

      navigate('/children/tasks');
      
      toast({
        title: "Account setup complete!",
        description: `Welcome ${data.child?.firstName}! Your account is ready to use.`,
      });

    } catch (error) {
      console.error('Error during child account setup:', error);
      toast({
        title: 'Setup Failed',
        description: 'Failed to complete account setup. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate lockout display
  const lockoutMinutes = lockInfo ? Math.ceil(lockInfo.remainingSeconds / 60) : 0;

  return (
    <div className="space-y-4">
      <div className="mb-4 text-center">
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

      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-accent/10 rounded-full">
            <UserPlus className="h-8 w-8 text-accent" />
          </div>
        </div>
        <h3 className="text-lg font-semibold">Complete Your Account</h3>
        <p className="text-sm text-muted-foreground">
          Enter the account code your parent gave you and create your password
        </p>
      </div>

      {lockInfo?.isLocked && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
          <Lock className="h-5 w-5 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive font-medium">
            Account temporarily locked
          </p>
          <p className="text-xs text-muted-foreground">
            Please try again in {lockoutMinutes} minute{lockoutMinutes !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="account-code">Account Code</Label>
          <Input
            id="account-code"
            name="account-code"
            type="text"
            placeholder="FAM-XXXX-XXX"
            required
            value={accountCode}
            onChange={(e) => setAccountCode(e.target.value.toUpperCase())}
            className="font-mono"
            aria-describedby="account-code-help"
            disabled={lockInfo?.isLocked}
          />
          <p id="account-code-help" className="text-xs text-muted-foreground">
            This is the family code your parent gave you to set up your account
          </p>
        </div>

        {showPinField && (
          <div className="space-y-2">
            <Label htmlFor="verification-pin">Verification PIN</Label>
            <Input
              id="verification-pin"
              name="verification-pin"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Enter 6-digit PIN"
              value={verificationPin}
              onChange={(e) => setVerificationPin(e.target.value.replace(/\D/g, ''))}
              className="font-mono text-center tracking-widest"
              aria-describedby="pin-help"
              disabled={lockInfo?.isLocked}
            />
            <p id="pin-help" className="text-xs text-muted-foreground">
              Your parent should have given you a 6-digit PIN along with the code
            </p>
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="child-password">Create Your Password</Label>
          <Input
            id="child-password"
            name="child-password"
            type="password"
            placeholder="Create a secure password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="child-password-requirements"
            disabled={lockInfo?.isLocked}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="child-confirm-password">Confirm Password</Label>
          <Input
            id="child-confirm-password"
            name="child-confirm-password"
            type="password"
            placeholder="Confirm your password"
            required
            minLength={8}
            aria-describedby="child-confirm-password-help"
            disabled={lockInfo?.isLocked}
          />
        </div>
        
        <PasswordStrengthIndicator password={password} className="mt-3" />
        
        <Button
          type="submit"
          className="w-full bg-accent hover:bg-accent-hover"
          disabled={isLoading || !accountCode || lockInfo?.isLocked}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting Up Your Account...
            </>
          ) : (
            'Complete Account Setup'
          )}
        </Button>
      </form>
      
      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground">
          Don't have an account code?{' '}
          <button
            type="button"
            onClick={onBackToSignIn}
            className="text-primary hover:text-primary-hover underline"
          >
            Ask your parent to create one for you
          </button>
        </p>
      </div>
    </div>
  );
};