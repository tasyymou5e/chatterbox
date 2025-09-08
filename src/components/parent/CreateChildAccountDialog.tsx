import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, UserPlus, Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createChildAccount, ChildAccountInfo } from '@/utils/secureChildAccountAccess';
import { supabase } from '@/integrations/supabase/client';

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
}

export default function CreateChildAccountDialog({ open, onOpenChange, onSuccess }: CreateChildAccountDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [createdAccount, setCreatedAccount] = useState<ChildAccountResult | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
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
        lastName.trim()
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
          status: result.childAccount.status
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
              ? 'Share the account code with your child to complete setup'
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
                    <p><strong>Email:</strong> Will be auto-generated</p>
                    <p><strong>Role:</strong> Child</p>
                    <p className="text-muted-foreground text-xs mt-2">
                      💡 Your child will receive a unique code to complete their account setup with their own password.
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
                disabled={loading || !firstName.trim() || !lastName.trim()}
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
                  <p><strong>Status:</strong> Pending completion</p>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Account Code (Share with your child)</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 bg-muted rounded-md font-mono text-lg font-bold text-center tracking-wider">
                      {createdAccount.accountCode}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyAccountCode}
                      className="px-3"
                    >
                      {codeCopied ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-sm">Next Steps:</h4>
                  <ol className="text-sm space-y-1 ml-4">
                    <li>1. Share the account code above with {createdAccount.firstName}</li>
                    <li>2. Have them visit the signup page</li>
                    <li>3. They'll enter this code and create their password</li>
                    <li>4. Their account will be linked to your family automatically</li>
                  </ol>
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