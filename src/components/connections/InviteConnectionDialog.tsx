import { useState } from 'react';
import { UserPlus, Mail, Shield, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useConnectionStore } from '@/stores/connectionStore';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';

interface InviteConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
}

const roleOptions = [
  { value: 'therapist', label: 'Therapist', description: 'Licensed therapy professional' },
  { value: 'teacher', label: 'Teacher', description: 'Educational professional' },
  { value: 'grandparent', label: 'Grandparent', description: 'Extended family member' },
  { value: 'family_friend', label: 'Family Friend', description: 'Trusted family friend' },
] as const;

export function InviteConnectionDialog({ open, onOpenChange, familyId }: InviteConnectionDialogProps) {
  const { sendInvitation, loading } = useConnectionStore();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    role: '' as 'therapist' | 'teacher' | 'grandparent' | 'family_friend' | '',
    message: '',
    permissions: {
      can_view_progress: true,
      can_comment: false,
      can_assign_tasks: false,
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.role || !user?.id) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await sendInvitation({
      family_id: familyId,
      invited_email: formData.email,
      connection_role: formData.role,
      invited_by: user.id,
      invitation_message: formData.message || undefined,
      permissions: formData.permissions,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Invitation sent successfully',
      });
      
      // Reset form and close dialog
      setFormData({
        email: '',
        role: '',
        message: '',
        permissions: {
          can_view_progress: true,
          can_comment: false,
          can_assign_tasks: false,
        }
      });
      onOpenChange(false);
    }
  };

  const handlePermissionChange = (permission: keyof typeof formData.permissions, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: value
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Connection to Family Network
          </DialogTitle>
          <DialogDescription>
            Invite a therapist, teacher, or family member to connect with your family
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter their email address"
              required
            />
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Connection Role</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value: 'therapist' | 'teacher' | 'grandparent' | 'family_friend') => 
                setFormData(prev => ({ ...prev, role: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select their role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Personal Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Personal Message (Optional)
            </Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Add a personal message to your invitation..."
              rows={3}
            />
          </div>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permissions
              </CardTitle>
              <CardDescription>
                Choose what this connection can access and do
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>View Progress</Label>
                  <p className="text-sm text-muted-foreground">
                    Can see chore completions, achievements, and overall progress
                  </p>
                </div>
                <Switch
                  checked={formData.permissions.can_view_progress}
                  onCheckedChange={(checked) => handlePermissionChange('can_view_progress', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Add Comments</Label>
                  <p className="text-sm text-muted-foreground">
                    Can leave encouraging comments and feedback
                  </p>
                </div>
                <Switch
                  checked={formData.permissions.can_comment}
                  onCheckedChange={(checked) => handlePermissionChange('can_comment', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Assign Tasks</Label>
                  <p className="text-sm text-muted-foreground">
                    Can create and assign new chores or activities
                  </p>
                </div>
                <Switch
                  checked={formData.permissions.can_assign_tasks}
                  onCheckedChange={(checked) => handlePermissionChange('can_assign_tasks', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}