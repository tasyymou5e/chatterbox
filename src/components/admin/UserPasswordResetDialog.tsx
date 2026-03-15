import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Copy, RefreshCw, Key, Loader2 } from 'lucide-react';
import { invokeEdgeFunction } from '@/utils/secureEdgeFunctionInvoke';
import { cLog, cError } from '@/utils/wideLogger';
import { getErrorMessage } from '@/types/interfaces';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface UserPasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess?: () => void;
}

export const UserPasswordResetDialog: React.FC<UserPasswordResetDialogProps> = ({
  open,
  onOpenChange,
  user,
  onSuccess
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateSecurePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each type
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // special
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    const shuffled = password.split('').sort(() => Math.random() - 0.5).join('');
    setPassword(shuffled);
    setConfirmPassword(shuffled);
    
    toast({
      title: "Password Generated",
      description: "A secure password has been generated and is ready to copy.",
    });
  };

  const copyToClipboard = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      toast({
        title: "Password Copied",
        description: "The password has been copied to your clipboard.",
      });
    }
  };

  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['bg-red-500', 'bg-red-400', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
    
    return { strength, label: labels[strength] || 'Very Weak', color: colors[strength] || 'bg-red-500' };
  };

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (!password) {
      toast({
        title: "Validation Error",
        description: "Password is required.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      cLog('Calling admin-update-user for user:', user.id);

      // Call edge function with automatic session refresh
      const { data, error } = await invokeEdgeFunction<{ error?: string }>('admin-update-user', {
        userId: user.id,
        newPassword: password,
        forcePasswordChange
      });

      cLog('Edge function response:', { data, error });

      // Check for invocation error (network/CORS/etc)
      if (error) {
        cError('Edge function invocation error:', error);
        // Detect CORS/network issues and provide clearer message
        const errorMsg = error.message || '';
        if (errorMsg.includes('Failed to send') || errorMsg.includes('fetch') || errorMsg.includes('network')) {
          throw new Error('Network error: Unable to reach password reset service. Please check your connection and try again.');
        }
        throw new Error(error.message || 'Failed to call password reset service');
      }

      // Check for application-level error in response data
      if (data?.error) {
        cError('Edge function returned error:', data.error);
        throw new Error(data.error);
      }

      toast({
        title: "Password Reset Successful",
        description: `Password has been reset for ${user.first_name} ${user.last_name} (${user.email}).`,
      });

      // Reset form
      setPassword('');
      setConfirmPassword('');
      setForcePasswordChange(false);
      
      onOpenChange(false);
      onSuccess?.();

    } catch (error: unknown) {
      cError('Password reset error', error);
      toast({
        title: "Password Reset Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    setConfirmPassword('');
    setForcePasswordChange(false);
    onOpenChange(false);
  };

  if (!user) return null;

  const passwordStrength = getPasswordStrength(password);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Reset password for <strong>{user.first_name} {user.last_name}</strong> ({user.email})
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Password Generation */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={generateSecurePassword}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Secure Password
              </Button>
              {password && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  title="Copy password to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Password Strength:</span>
                    <span className="font-medium">{passwordStrength.label}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-500">Passwords do not match</p>
              )}
            </div>

            {/* Force Password Change Option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="force-change"
                checked={forcePasswordChange}
                onCheckedChange={(checked) => setForcePasswordChange(checked === true)}
              />
              <Label htmlFor="force-change" className="text-sm">
                Force user to change password on next login
              </Label>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading || !password || password !== confirmPassword}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Reset Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};