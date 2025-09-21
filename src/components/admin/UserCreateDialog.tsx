import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Shield, Eye, Users, Baby, Loader2, Copy, Check } from 'lucide-react';

interface UserCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

const AVAILABLE_ROLES = [
  { 
    value: 'admin', 
    label: 'Administrator', 
    icon: Shield, 
    description: 'Full system access and management' 
  },
  { 
    value: 'read_only', 
    label: 'Read Only Admin', 
    icon: Eye, 
    description: 'Admin staff with view-only access (cannot perform edits or manage families)' 
  },
  { 
    value: 'parent', 
    label: 'Parent', 
    icon: Users, 
    description: 'Manage family and children accounts' 
  },
  { 
    value: 'child', 
    label: 'Child', 
    icon: Baby, 
    description: 'Limited access child account' 
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
    roles: []
  });
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [passwordCopied, setPasswordCopied] = useState(false);
  const { toast } = useToast();

  const handleRoleToggle = (roleValue: string) => {
    const newSelectedRoles = new Set(selectedRoles);
    if (newSelectedRoles.has(roleValue)) {
      newSelectedRoles.delete(roleValue);
    } else {
      newSelectedRoles.add(roleValue);
    }
    setSelectedRoles(newSelectedRoles);
    setFormData(prev => ({
      ...prev,
      roles: Array.from(newSelectedRoles)
    }));
  };

  const handleInputChange = (field: keyof Omit<CreateUserData, 'roles'>, value: string) => {
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

    if (formData.roles.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one role for the user.",
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
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          roles: formData.roles
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedPassword(data.password);
      
      toast({
        title: "User Created Successfully",
        description: `User ${formData.firstName} ${formData.lastName} has been created with roles: ${formData.roles.join(', ')}`,
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
      roles: []
    });
    setSelectedRoles(new Set());
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
          <div className="space-y-4">
            <h3 className="text-sm font-medium">User Roles *</h3>
            <div className="grid grid-cols-1 gap-3">
              {AVAILABLE_ROLES.map((role) => {
                const IconComponent = role.icon;
                return (
                  <div key={role.value} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={role.value}
                      checked={selectedRoles.has(role.value)}
                      onCheckedChange={() => handleRoleToggle(role.value)}
                      disabled={loading}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <Label htmlFor={role.value} className="font-medium">
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