import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Shield, Eye, Users, Baby, Loader2, Copy, Check, AlertTriangle, Key, Mail } from 'lucide-react';
import { validateAndSanitizeFormData, commonSchemas } from '@/utils/enhancedInputValidation';
import { useAdminRateLimiter } from '@/utils/adminRateLimiter';
import { invokeEdgeFunction } from '@/utils/secureEdgeFunctionInvoke';
import { z } from 'zod';

interface UserCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  adminRole: string | null;
  familyRole: string | null;
  customPassword: string;
  useCustomPassword: boolean;
}

const ADMIN_ROLES = [
  { 
    value: 'admin', 
    label: 'Administrator', 
    icon: Shield, 
    description: 'Full system access and management. Cannot join families.' 
  },
  { 
    value: 'read_only', 
    label: 'Read Only Admin', 
    icon: Eye, 
    description: 'Admin staff with view-only access. Cannot perform edits or join families.' 
  },
];

const FAMILY_ROLES = [
  { 
    value: 'parent', 
    label: 'Parent', 
    icon: Users, 
    description: 'Can create and manage families, assign chores, and oversee children.' 
  },
  { 
    value: 'child', 
    label: 'Child', 
    icon: Baby, 
    description: 'Family member with limited access. Must be invited to families.' 
  },
];

export const UserCreateDialog: React.FC<UserCreateDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    firstName: '',
    lastName: '',
    adminRole: null,
    familyRole: null,
    customPassword: '',
    useCustomPassword: false
  });
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const { toast } = useToast();

  // Rate limiting for user creation
  const { status: rateLimitStatus, checkLimit, resetLimit } = useAdminRateLimiter('admin-system');

  // Reset rate limit status when dialog opens
  useEffect(() => {
    if (open) {
      resetLimit('userCreation');
    }
  }, [open, resetLimit]);

  const handleAdminRoleChange = (roleValue: string) => {
    setFormData(prev => ({
      ...prev,
      adminRole: roleValue === prev.adminRole ? null : roleValue,
      // Clear family role if selecting admin role
      familyRole: roleValue ? null : prev.familyRole
    }));
  };

  const handleFamilyRoleChange = (roleValue: string) => {
    setFormData(prev => ({
      ...prev,
      familyRole: roleValue === prev.familyRole ? null : roleValue,
      // Clear admin role if selecting family role
      adminRole: roleValue ? null : prev.adminRole
    }));
  };

  const handleInputChange = (field: keyof Omit<CreateUserData, 'adminRole' | 'familyRole'>, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Check email availability when email changes
    if (field === 'email' && typeof value === 'string' && value.length > 0) {
      checkEmailAvailability(value);
    }
  };

  const checkEmailAvailability = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailAvailable(null);
      return;
    }

    setCheckingEmail(true);
    try {
      const { data, error } = await supabase.rpc('check_email_availability', { p_email: email });
      if (error) throw error;
      setEmailAvailable(data);
    } catch (error) {
      console.error('Email availability check failed:', error);
      setEmailAvailable(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  const copyPassword = async () => {
    if (generatedPassword) {
      try {
        await navigator.clipboard.writeText(generatedPassword);
        setPasswordCopied(true);
        toast({
          title: "Password Copied",
          description: "The generated password has been copied to your clipboard.",
        });
        setTimeout(() => setPasswordCopied(false), 2000);
      } catch (error) {
        toast({
          title: "Copy Failed",
          description: "Failed to copy password to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  // Zod schema for admin user creation
  const adminUserSchema = z.object({
    email: commonSchemas.email,
    firstName: commonSchemas.name,
    lastName: commonSchemas.name,
    customPassword: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
  });

  const handleCreate = async () => {
    // Check rate limit first
    const rateLimitResult = checkLimit('userCreation');
    if (!rateLimitResult.allowed) {
      toast({
        title: "Rate Limit Exceeded",
        description: `Too many user creation attempts. Please wait ${rateLimitResult.retryAfter} seconds before trying again.`,
        variant: "destructive",
      });
      return;
    }

    // Validate with Zod schema
    const validation = validateAndSanitizeFormData(
      { 
        email: formData.email, 
        firstName: formData.firstName, 
        lastName: formData.lastName,
        customPassword: formData.useCustomPassword ? formData.customPassword : undefined
      },
      adminUserSchema
    );

    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    if (formData.useCustomPassword && (!formData.customPassword || formData.customPassword.length < 8)) {
      toast({
        title: "Validation Error",
        description: "Custom password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (emailAvailable === false) {
      toast({
        title: "Email Unavailable",
        description: "This email address is already registered. Please use a different email.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.adminRole && !formData.familyRole) {
      toast({
        title: "Validation Error",
        description: "Please select either an Admin role or a Family role for the user.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const userRoles = [formData.adminRole, formData.familyRole].filter(Boolean);
      const requestBody: Record<string, unknown> = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        roles: userRoles as string[]
      };

      if (formData.useCustomPassword && formData.customPassword) {
        requestBody.customPassword = formData.customPassword;
      }

      const { data, error } = await invokeEdgeFunction<{ passwordGenerated?: boolean; error?: string }>('admin-create-user', requestBody);

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Password is no longer returned from the API for security.
      // Admin should instruct the user to use the password reset flow.
      
      toast({
        title: "User Created Successfully",
        description: `User ${formData.firstName} ${formData.lastName} has been created with roles: ${userRoles.join(', ')}`,
      });

      onSuccess();

    } catch (error) {
      console.error('Create user error:', error);
      const errorMsg = error instanceof Error ? error.message : "Failed to create user. Please try again.";
      let errorMessage = errorMsg;
      
      // Handle specific error codes from the edge function
      if (errorMsg.includes('EMAIL_EXISTS')) {
        errorMessage = "This email address is already registered. Please use a different email.";
      } else if (errorMsg.includes('WEAK_PASSWORD')) {
        errorMessage = "Password does not meet security requirements. Please use a stronger password.";
      } else if (errorMsg.includes('Role conflict')) {
        errorMessage = "Role assignment error: " + errorMsg;
      }
      
      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      adminRole: null,
      familyRole: null,
      customPassword: '',
      useCustomPassword: false
    });
    setGeneratedPassword('');
    setPasswordCopied(false);
    setEmailAvailable(null);
    setCheckingEmail(false);
    onOpenChange(false);
  };

  // Get user creation status with proper typing
  const userCreationStatus = rateLimitStatus.userCreation;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </DialogTitle>
        </DialogHeader>
        
        {/* Rate Limit Alert */}
        {userCreationStatus && userCreationStatus.remaining < 3 && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">
                  Rate Limit: {userCreationStatus.remaining} of {userCreationStatus.limit} creations remaining
                </p>
                <p className="text-sm text-muted-foreground">
                  Resets at: {userCreationStatus.resetTimeFormatted}
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={loading}
                  className={`pr-10 ${
                    emailAvailable === false ? 'border-destructive' : 
                    emailAvailable === true ? 'border-green-500' : ''
                  }`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {checkingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : emailAvailable === false ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : emailAvailable === true && formData.email ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : formData.email ? (
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  ) : null}
                </div>
              </div>
              {emailAvailable === false && (
                <p className="text-sm text-destructive">This email address is already registered</p>
              )}
              {emailAvailable === true && formData.email && (
                <p className="text-sm text-green-600">Email is available</p>
              )}
            </div>
          </div>

          {/* Password Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Password Configuration</h3>
            <div className="flex items-center justify-between space-x-3 p-3 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  <Label htmlFor="useCustomPassword" className="font-medium">
                    Set Custom Password
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formData.useCustomPassword 
                    ? "User will receive the custom password you set" 
                    : "A secure password will be automatically generated"}
                </p>
              </div>
              <Switch
                id="useCustomPassword"
                checked={formData.useCustomPassword}
                onCheckedChange={(checked) => handleInputChange('useCustomPassword', checked)}
                disabled={loading}
              />
            </div>
            
            {formData.useCustomPassword && (
              <div className="space-y-2">
                <Label htmlFor="customPassword">Custom Password *</Label>
                <Input
                  id="customPassword"
                  type="password"
                  value={formData.customPassword}
                  onChange={(e) => handleInputChange('customPassword', e.target.value)}
                  disabled={loading}
                  placeholder="Enter custom password (min 8 characters)"
                />
                {formData.customPassword && formData.customPassword.length < 8 && (
                  <p className="text-sm text-destructive">Password must be at least 8 characters long</p>
                )}
              </div>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-2">User Role *</h3>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Admin roles cannot join families, while Family roles can be invited to families.
                  Select only one role category.
                </AlertDescription>
              </Alert>
            </div>
            
            {/* Admin Roles Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Admin Roles</h4>
              <RadioGroup 
                value={formData.adminRole || ""} 
                onValueChange={handleAdminRoleChange}
                disabled={loading || formData.familyRole !== null}
              >
                {ADMIN_ROLES.map((role) => {
                  const IconComponent = role.icon;
                  return (
                    <div key={role.value} className={`flex items-start space-x-3 p-3 border rounded-lg ${formData.familyRole ? 'opacity-50' : ''}`}>
                      <RadioGroupItem value={role.value} id={`admin-${role.value}`} />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <Label htmlFor={`admin-${role.value}`} className="font-medium">
                            {role.label}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {role.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Family Roles Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Family Roles</h4>
              <RadioGroup 
                value={formData.familyRole || ""} 
                onValueChange={handleFamilyRoleChange}
                disabled={loading || formData.adminRole !== null}
              >
                {FAMILY_ROLES.map((role) => {
                  const IconComponent = role.icon;
                  return (
                    <div key={role.value} className={`flex items-start space-x-3 p-3 border rounded-lg ${formData.adminRole ? 'opacity-50' : ''}`}>
                      <RadioGroupItem value={role.value} id={`family-${role.value}`} />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <Label htmlFor={`family-${role.value}`} className="font-medium">
                            {role.label}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {role.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          </div>

          {/* Generated Password Display */}
          {generatedPassword && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Generated Password</h3>
                  <p className="text-sm text-muted-foreground">
                    Please save this password and share it securely with the user.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPassword}
                  className="flex items-center gap-2"
                >
                  {passwordCopied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="font-mono text-lg p-3 bg-background rounded border">
                {generatedPassword}
              </div>
            </div>
          )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !!generatedPassword}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserCreateDialog;
