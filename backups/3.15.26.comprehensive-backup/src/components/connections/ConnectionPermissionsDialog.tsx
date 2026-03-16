import { useState, useEffect } from 'react';
import { Shield, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FamilyConnection } from '@/stores/connectionStore';
import { useToast } from '@/hooks/use-toast';

interface ConnectionPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: FamilyConnection;
  onUpdate: (connectionId: string, updates: Partial<FamilyConnection>) => Promise<{ error: any }>;
}

const roleLabels = {
  therapist: 'Therapist',
  teacher: 'Teacher', 
  grandparent: 'Grandparent',
  family_friend: 'Family Friend'
};

const roleColors = {
  therapist: 'bg-primary/10 text-primary',
  teacher: 'bg-secondary/10 text-secondary',
  grandparent: 'bg-accent/10 text-accent',
  family_friend: 'bg-muted text-muted-foreground'
};

export function ConnectionPermissionsDialog({ 
  open, 
  onOpenChange, 
  connection, 
  onUpdate 
}: ConnectionPermissionsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState(connection.permissions);

  // Reset permissions when connection changes
  useEffect(() => {
    setPermissions(connection.permissions);
  }, [connection]);

  const handlePermissionChange = (permission: keyof typeof permissions, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    
    const { error } = await onUpdate(connection.id, { permissions });
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update permissions',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Permissions updated successfully',
      });
      onOpenChange(false);
    }
    
    setLoading(false);
  };

  const hasChanges = JSON.stringify(permissions) !== JSON.stringify(connection.permissions);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Permissions
          </DialogTitle>
          <DialogDescription>
            Update what this connection can access and do
          </DialogDescription>
        </DialogHeader>

        {/* Connection Info */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="font-medium text-foreground">
                {connection.connected_user_profile?.first_name} {connection.connected_user_profile?.last_name}
              </div>
              <Badge className={roleColors[connection.connection_role]}>
                {roleLabels[connection.connection_role]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {connection.connected_user_profile?.email}
            </p>
          </CardContent>
        </Card>

        {/* Permissions Settings */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5 flex-1">
                <Label className="font-medium">View Progress & Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Can see chore completions, achievements, progress reports, and family activity
                </p>
              </div>
              <Switch
                checked={permissions.can_view_progress}
                onCheckedChange={(checked) => handlePermissionChange('can_view_progress', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5 flex-1">
                <Label className="font-medium">Add Comments & Feedback</Label>
                <p className="text-sm text-muted-foreground">
                  Can leave encouraging comments, provide feedback, and celebrate achievements
                </p>
              </div>
              <Switch
                checked={permissions.can_comment}
                onCheckedChange={(checked) => handlePermissionChange('can_comment', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5 flex-1">
                <Label className="font-medium">Assign Tasks & Activities</Label>
                <p className="text-sm text-muted-foreground">
                  Can create and assign new chores, set goals, and suggest activities
                </p>
              </div>
              <Switch
                checked={permissions.can_assign_tasks}
                onCheckedChange={(checked) => handlePermissionChange('can_assign_tasks', checked)}
              />
            </div>
          </div>

          {/* Recommended Settings by Role */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Recommended Settings</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm text-muted-foreground">
                {connection.connection_role === 'therapist' && (
                  <p>
                    <strong>Therapists</strong> typically need view and comment access to track therapeutic progress and provide feedback.
                  </p>
                )}
                {connection.connection_role === 'teacher' && (
                  <p>
                    <strong>Teachers</strong> benefit from viewing progress and may assign educational tasks that support school goals.
                  </p>
                )}
                {connection.connection_role === 'grandparent' && (
                  <p>
                    <strong>Grandparents</strong> usually enjoy viewing progress and leaving encouraging comments for motivation.
                  </p>
                )}
                {connection.connection_role === 'family_friend' && (
                  <p>
                    <strong>Family friends</strong> typically have view access to stay connected and offer support when needed.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={loading || !hasChanges}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}