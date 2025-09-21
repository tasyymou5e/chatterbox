import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Shield, Eye, Users, Baby, Loader2, Copy, Check, AlertTriangle } from 'lucide-react';

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
    familyRole: null
  });
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [passwordCopied, setPasswordCopied] = useState(false);
  const { toast } = useToast();

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

  const handleInputChange = (field: keyof Omit<CreateUserData, 'adminRole' | 'familyRole'>, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

  const handleCreate = async () => {
    // Validation
    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const selectedRoles = [formData.adminRole, formData.familyRole].filter(Boolean);
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          roles: selectedRoles
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedPassword(data.password);
      
      const selectedRoles = [formData.adminRole, formData.familyRole].filter(Boolean);
      toast({
        title: "User Created Successfully",
        description: `User ${formData.firstName} ${formData.lastName} has been created with roles: ${selectedRoles.join(', ')}`,
      });

      onSuccess();

    } catch (error: any) {
      console.error('Create user error:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create user. Please try again.",
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
      familyRole: null
    });
    setGeneratedPassword('');
    setPasswordCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </DialogTitle>
        </DialogHeader>

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
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={loading}
              />
            </div>
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
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <h3 className="text-sm font-medium text-green-600">User Created Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                Generated password for the new user:
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={generatedPassword}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyPassword}
                  className="flex items-center gap-1"
                >
                  {passwordCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {passwordCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Please securely share this password with the new user. They should change it on first login.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {generatedPassword ? 'Close' : 'Cancel'}
          </Button>
          {!generatedPassword && (
            <Button onClick={handleCreate} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create User
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};