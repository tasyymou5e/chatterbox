import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateChildAccountAccess, completeChildAccount } from '@/utils/secureChildAccountAccess';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, UserPlus } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';

interface ChildSignupFormProps {
  initialCode?: string;
  onBackToSignIn: () => void;
}

/**
 * Child account signup form for completing account setup with parent-provided code.
 */
export const ChildSignupForm = ({ initialCode = '', onBackToSignIn }: ChildSignupFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [accountCode, setAccountCode] = useState(initialCode);
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const code = formData.get('account-code') as string;
    const childPassword = formData.get('child-password') as string;
    const confirmPassword = formData.get('child-confirm-password') as string;

    if (childPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please ensure both passwords are identical.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      // Get the child account details first
      const { data: childAccount, error: fetchError } = await supabase
        .from('child_accounts')
        .select('*')
        .eq('family_code', code)
        .eq('status', 'pending')
        .single();

      if (fetchError || !childAccount) {
        toast({
          title: 'Invalid Code',
          description: 'Invalid account code or setup incomplete',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Enhanced validation with expiration checking
      const validation = await validateChildAccountAccess(code, childAccount.generated_email);
      
      if (!validation.valid) {
        if (validation.expired) {
          toast({
            title: 'Code Expired',
            description: 'This account access code has expired. Please ask your parent to create a new one.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Invalid Code',
            description: validation.error || 'Invalid account code or setup incomplete',
            variant: 'destructive'
          });
        }
        setIsLoading(false);
        return;
      }

      // Create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: childAccount.generated_email,
        password: childPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: childAccount.first_name,
            last_name: childAccount.last_name,
            account_type: 'child'
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Complete the child account setup using secure function
      const result = await completeChildAccount(code, childAccount.generated_email, authData.user.id);
      
      if (!result.success) {
        toast({
          title: 'Setup Failed',
          description: result.error || 'Failed to complete account setup',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      navigate('/children/tasks');
      
      toast({
        title: "Account setup complete!",
        description: `Welcome ${childAccount.first_name}! Your account is ready to use.`,
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="account-code">Account Code</Label>
          <Input
            id="account-code"
            name="account-code"
            type="text"
            placeholder="CHILD-XXXXXXXX"
            required
            value={accountCode}
            onChange={(e) => setAccountCode(e.target.value.toUpperCase())}
            className="font-mono"
            aria-describedby="account-code-help"
          />
          <p id="account-code-help" className="text-xs text-muted-foreground">
            This is the code your parent gave you to set up your account
          </p>
        </div>
        
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
          />
        </div>
        
        <PasswordStrengthIndicator password={password} className="mt-3" />
        
        <Button
          type="submit"
          className="w-full bg-accent hover:bg-accent-hover"
          disabled={isLoading || !accountCode}
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
