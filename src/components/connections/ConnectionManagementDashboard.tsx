import { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Shield, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useConnectionStore, FamilyConnection, FamilyInvitation } from '@/stores/connectionStore';
import { useToast } from '@/hooks/use-toast';
import { InviteConnectionDialog } from './InviteConnectionDialog';
import { ConnectionPermissionsDialog } from './ConnectionPermissionsDialog';

interface ConnectionManagementDashboardProps {
  familyId: string;
}

const roleLabels = {
  therapist: 'Therapist',
  teacher: 'Teacher', 
  grandparent: 'Grandparent',
  family_friend: 'Family Friend'
};

const roleColors = {
  therapist: 'bg-blue-100 text-blue-800',
  teacher: 'bg-green-100 text-green-800',
  grandparent: 'bg-purple-100 text-purple-800',
  family_friend: 'bg-orange-100 text-orange-800'
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  revoked: 'bg-gray-100 text-gray-800'
};

export function ConnectionManagementDashboard({ familyId }: ConnectionManagementDashboardProps) {
  const { 
    connections, 
    invitations, 
    loading, 
    error,
    fetchConnections, 
    fetchInvitations,
    updateConnection,
    removeConnection
  } = useConnectionStore();

  const { toast } = useToast();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<FamilyConnection | null>(null);

  useEffect(() => {
    if (familyId) {
      fetchConnections(familyId);
      fetchInvitations(familyId);
    }
  }, [familyId, fetchConnections, fetchInvitations]);

  const handleUpdatePermissions = (connection: FamilyConnection) => {
    setSelectedConnection(connection);
    setShowPermissionsDialog(true);
  };

  const handleRemoveConnection = async (connectionId: string) => {
    const { error } = await removeConnection(connectionId);
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove connection',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Connection removed successfully',
      });
    }
  };

  if (loading && connections.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-muted rounded-lg" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  const activeConnections = connections.filter(conn => conn.status === 'accepted');
  const pendingInvitations = invitations.filter(inv => !inv.accepted_at && new Date(inv.expires_at) > new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Extended Family Network</h2>
          <p className="text-muted-foreground">
            Connect with therapists, teachers, and family members to support your child together
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Connection
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{activeConnections.length}</p>
                <p className="text-sm text-muted-foreground">Active Connections</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingInvitations.length}</p>
                <p className="text-sm text-muted-foreground">Pending Invitations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {activeConnections.filter(c => c.permissions.can_view_progress).length}
                </p>
                <p className="text-sm text-muted-foreground">Can View Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Connections
          </CardTitle>
          <CardDescription>
            Manage permissions and settings for connected family network members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeConnections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No active connections yet</p>
              <p>Invite therapists, teachers, or family members to join your network</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeConnections.map((connection, index) => (
                <div key={connection.id}>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-medium text-foreground">
                          {connection.connected_user_profile?.first_name} {connection.connected_user_profile?.last_name}
                        </div>
                        <Badge className={roleColors[connection.connection_role]}>
                          {roleLabels[connection.connection_role]}
                        </Badge>
                        <Badge className={statusColors[connection.status]}>
                          {connection.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-2">
                        {connection.connected_user_profile?.email}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Can view progress: {connection.permissions.can_view_progress ? 'Yes' : 'No'}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Can comment: {connection.permissions.can_comment ? 'Yes' : 'No'}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Can assign tasks: {connection.permissions.can_assign_tasks ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdatePermissions(connection)}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Permissions
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveConnection(connection.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                  {index < activeConnections.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Invitations waiting for response
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-foreground">{invitation.invited_email}</span>
                      <Badge className={roleColors[invitation.connection_role]}>
                        {roleLabels[invitation.connection_role]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-orange-600">
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <InviteConnectionDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        familyId={familyId}
      />

      {selectedConnection && (
        <ConnectionPermissionsDialog
          open={showPermissionsDialog}
          onOpenChange={setShowPermissionsDialog}
          connection={selectedConnection}
          onUpdate={updateConnection}
        />
      )}
    </div>
  );
}