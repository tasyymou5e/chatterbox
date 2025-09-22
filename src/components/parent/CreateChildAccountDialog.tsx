import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, UserPlus, Copy, CheckCircle2, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createChildAccount, ChildAccountInfo } from '@/utils/secureChildAccountAccess';
import { supabase } from '@/integrations/supabase/client';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';

interface CreateChildAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ChildAccountResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountCode: string;
  status: string;
  passwordSetByParent?: boolean;
}

export default function CreateChildAccountDialog({ open, onOpenChange, onSuccess }: CreateChildAccountDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<ChildAccountResult | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Generate preview email
  const previewEmail = useMemo(() => {
    if (!user?.email || !firstName.trim()) return '';
    return `${user.email}.${firstName.trim().toLowerCase()}`;
  }, [user?.email, firstName]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setPassword('');
    setShowPassword(false);
    setCreatedAccount(null);
    setCodeCopied(false);
  };

  const validateForm = () => {
    if (!firstName.trim()) {
      toast({ variant: "destructive", title: "First name is required" });
      return false;
    }
    
    if (!lastName.trim()) {
      toast({ variant: "destructive", title: "Last name is required" });
      return false;
    }

    if (!password.trim()) {
      toast({ variant: "destructive", title: "Password is required" });
      return false;
    }

    if (password.length < 8) {
      toast({ variant: "destructive", title: "Password must be at least 8 characters" });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    if (!user?.id) {
      toast({ variant: "destructive", title: "Not authenticated" });
      return;
    }

    // Get user's family first
    const { data: userFamily } = await supabase
      .from('families')
      .select('id')
      .eq('created_by', user.id)
      .single();

    if (!userFamily) {
      toast({ 
        variant: "destructive", 
        title: "No family found", 
        description: "Please create a family first before adding children." 
      });
      return;
    }

    setLoading(true);
    try {
        const result = await createChildAccount(
          userFamily.id,
          firstName.trim(),
          lastName.trim(),
          password.trim()
        );

      if (!result.success) {
        throw new Error(result.error || 'Failed to create child account');
      }

      if (result.childAccount) {
          setCreatedAccount({
            id: result.childAccount.id,
            firstName: result.childAccount.first_name,
            lastName: result.childAccount.last_name,
            email: result.childAccount.generated_email,
            accountCode: result.childAccount.family_code,
            status: result.childAccount.status,
            passwordSetByParent: true
          });
      }
      
      toast({
        title: "✅ Child Account Created!",
        description: `Account for ${firstName} ${lastName} has been set up successfully.`,
      });

    } catch (error) {
      console.error('Error creating child account:', error);
      toast({
        variant: "destructive",
        title: "Failed to create child account",
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyAccountCode = async () => {
    if (!createdAccount) return;
    
    try {
      await navigator.clipboard.writeText(createdAccount.accountCode);
      setCodeCopied(true);
      toast({
        title: "Code Copied!",
        description: "The account code has been copied to your clipboard.",
      });
      
      // Reset copied state after 3 seconds
      setTimeout(() => setCodeCopied(false), 3000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Could not copy the code. Please copy it manually."
      });
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
    if (createdAccount) {
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Create Child Account
          </DialogTitle>
          <DialogDescription>
            {createdAccount 
              ? 'Account is ready! Your child can now login with their credentials'
              : 'Create a new account for your child with parental oversight'
            }
          </DialogDescription>
        </DialogHeader>

        {!createdAccount ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="child-first-name" className="flex items-center gap-2">
                  Child's First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="child-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Emma"
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="child-last-name" className="flex items-center gap-2">
                  Child's Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="child-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="child-password" className="flex items-center gap-2">
                  Set Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="child-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password..."
                    disabled={loading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {password && (
                  <PasswordStrengthIndicator password={password} />
                )}
              </div>
            </div>

            {firstName && lastName && (
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Account Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {firstName} {lastName}</p>
                    <p><strong>Email:</strong> {previewEmail}</p>
                    <p><strong>Role:</strong> Child</p>
                    <p><strong>Password:</strong> Set by parent</p>
                    <p className="text-muted-foreground text-xs mt-2">
                      💡 Account will be ready for immediate login after creation.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !firstName.trim() || !lastName.trim() || !password.trim() || password.length < 8}
                className="min-w-32"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Success State */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  Account Created Successfully!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p><strong>Child:</strong> {createdAccount.firstName} {createdAccount.lastName}</p>
                  <p><strong>Email:</strong> {createdAccount.email}</p>
                  <p><strong>Status:</strong> Ready to login</p>
                </div>
                
                <Separator />
                
                <div className="bg-success/10 p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-sm text-success">✅ Account Ready!</h4>
                  <p className="text-sm">Your child can now login using:</p>
                  <div className="space-y-1 text-sm font-mono bg-muted p-2 rounded">
                    <p><strong>Email:</strong> {createdAccount.email}</p>
                    <p><strong>Password:</strong> The password you set</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 Make sure to share these login credentials securely with your child.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button
                onClick={handleClose}
                className="flex items-center gap-2"
              >
                Done
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}