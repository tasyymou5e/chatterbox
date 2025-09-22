import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cError } from '@/utils/conditionalLogger';
import { getErrorMessage } from '@/types/interfaces';
import { 
  Users, 
  Save,
  X,
  Shield,
  UserCheck,
  Activity,
  Key,
  Eye,
  Baby,
  AlertTriangle
} from 'lucide-react';
import { UserPasswordResetDialog } from './UserPasswordResetDialog';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  roles: string[];
  families: { family_code: string; display_name: string }[];
}

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}

const ADMIN_ROLES = [
  { value: 'admin', label: 'Administrator', icon: Shield, description: 'Full system access. Cannot join families.' },
  { value: 'read_only', label: 'Read Only Admin', icon: Eye, description: 'Admin staff with view-only access. Cannot join families.' }
];

const FAMILY_ROLES = [
  { value: 'parent', label: 'Parent', icon: UserCheck, description: 'Can create and manage families, assign chores, and oversee children.' },
  { value: 'child', label: 'Child', icon: Baby, description: 'Family member with limited access. Must be invited to families.' }
];

export function UserEditDialog({ open, onOpenChange, user, onSuccess }: UserEditDialogProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: ''
  });
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [familyRole, setFamilyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || ''
      });
      
      // Separate admin and family roles
      const adminRoles = user.roles.filter(role => ['admin', 'read_only'].includes(role));
      const familyRoles = user.roles.filter(role => ['parent', 'child'].includes(role));
      
      setAdminRole(adminRoles[0] || null);
      setFamilyRole(familyRoles[0] || null);
    }
  }, [user]);

  if (!user) return null;

  const handleAdminRoleChange = (roleValue: string) => {
    setAdminRole(roleValue === adminRole ? null : roleValue);
    // Clear family role if selecting admin role
    if (roleValue && roleValue !== adminRole) {
      setFamilyRole(null);
    }
  };

  const handleFamilyRoleChange = (roleValue: string) => {
    setFamilyRole(roleValue === familyRole ? null : roleValue);
    // Clear admin role if selecting family role
    if (roleValue && roleValue !== familyRole) {
      setAdminRole(null);
    }
  };

  const handleSave = async () => {
    if (!formData.first_name.trim() || !formData.email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'First name and email are required'
      });
      return;
    }

    setLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim()
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update roles - remove all existing roles first
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Add new roles
      const newRoles = [adminRole, familyRole].filter(Boolean);
      if (newRoles.length > 0) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(
            newRoles.map(role => ({
              user_id: user.id,
              role: role as any
            }))
          );

        if (insertError) throw insertError;
      }

      toast({
        title: 'Success',
        description: 'User updated successfully'
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      cError('Error updating user', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(error)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            Edit User
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Update user profile information and roles
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh] pr-4">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="h-4 w-4" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-gray-300">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-gray-300">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* Role Management */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Shield className="h-4 w-4" />
                User Roles
              </h3>
              
              <Alert className="border-amber-800 bg-amber-900/20">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-amber-400">
                  <strong>Important:</strong> Admin roles cannot join families, while Family roles can be invited to families.
                  Select only one role category.
                </AlertDescription>
              </Alert>
              
              {/* Admin Roles Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">Admin Roles</h4>
                <RadioGroup 
                  value={adminRole || ""} 
                  onValueChange={handleAdminRoleChange}
                  disabled={loading || familyRole !== null}
                >
                  {ADMIN_ROLES.map((role) => {
                    const RoleIcon = role.icon;
                    return (
                      <div key={role.value} className={`flex items-start space-x-3 p-3 rounded-lg border border-gray-700 hover:border-gray-600 ${familyRole ? 'opacity-50' : ''}`}>
                        <RadioGroupItem value={role.value} id={`admin-${role.value}`} className="text-white" />
                        <div className="flex-1">
                          <label 
                            htmlFor={`admin-${role.value}`} 
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <RoleIcon className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-white">{role.label}</span>
                          </label>
                          <p className="text-sm text-gray-400 mt-1">{role.description}</p>
                        </div>
                        {adminRole === role.value && (
                          <Badge className="bg-blue-600 text-white">
                            Selected
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              {/* Family Roles Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">Family Roles</h4>
                <RadioGroup 
                  value={familyRole || ""} 
                  onValueChange={handleFamilyRoleChange}
                  disabled={loading || adminRole !== null}
                >
                  {FAMILY_ROLES.map((role) => {
                    const RoleIcon = role.icon;
                    return (
                      <div key={role.value} className={`flex items-start space-x-3 p-3 rounded-lg border border-gray-700 hover:border-gray-600 ${adminRole ? 'opacity-50' : ''}`}>
                        <RadioGroupItem value={role.value} id={`family-${role.value}`} className="text-white" />
                        <div className="flex-1">
                          <label 
                            htmlFor={`family-${role.value}`} 
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <RoleIcon className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-white">{role.label}</span>
                          </label>
                          <p className="text-sm text-gray-400 mt-1">{role.description}</p>
                        </div>
                        {familyRole === role.value && (
                          <Badge className="bg-blue-600 text-white">
                            Selected
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              {!adminRole && !familyRole && (
                <div className="text-amber-400 text-sm bg-amber-900/20 border border-amber-800 rounded p-3">
                  ⚠️ Warning: User will have no roles assigned. This may limit their access to the system.
                </div>
              )}
            </div>

            <Separator className="bg-gray-700" />

            {/* Password Reset Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Password Management
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Reset the user's password or require them to change it on next login
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPasswordResetOpen(true)}
                  className="border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Password Reset Dialog */}
      <UserPasswordResetDialog
        open={passwordResetOpen}
        onOpenChange={setPasswordResetOpen}
        user={user}
        onSuccess={() => {
          setPasswordResetOpen(false);
          onSuccess();
        }}
      />
    </Dialog>
  );
}