import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  UserX, 
  Shield, 
  Users, 
  CheckCircle,
  XCircle 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RoleConflict {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  conflicting_roles: string[];
  conflict_type: string;
}

export const RoleConflictPanel: React.FC = () => {
  const [conflicts, setConflicts] = useState<RoleConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchConflicts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('detect_role_conflicts');
      
      if (error) throw error;
      
      setConflicts(data || []);
    } catch (error: any) {
      console.error('Error fetching role conflicts:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fetch role conflicts'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, []);

  const resolveConflict = async (conflict: RoleConflict, keepRole: 'admin' | 'family') => {
    setResolving(prev => new Set(prev).add(conflict.user_id));
    
    try {
      // Delete all existing roles for user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', conflict.user_id);

      if (deleteError) throw deleteError;

      // Determine which role to keep
      let roleToKeep: string;
      if (keepRole === 'admin') {
        // Keep the first admin role found
        roleToKeep = conflict.conflicting_roles.find(role => ['admin', 'read_only'].includes(role)) || 'read_only';
      } else {
        // Keep the first family role found
        roleToKeep = conflict.conflicting_roles.find(role => ['parent', 'child'].includes(role)) || 'child';
      }

      // Insert the resolved role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: conflict.user_id,
          role: roleToKeep as any
        });

      if (insertError) throw insertError;

      toast({
        title: 'Conflict Resolved',
        description: `${conflict.first_name} ${conflict.last_name} now has only the ${roleToKeep} role.`
      });

      // Refresh conflicts
      fetchConflicts();

    } catch (error: any) {
      console.error('Error resolving conflict:', error);
      toast({
        variant: 'destructive',
        title: 'Resolution Failed',
        description: error.message || 'Failed to resolve role conflict'
      });
    } finally {
      setResolving(prev => {
        const newSet = new Set(prev);
        newSet.delete(conflict.user_id);
        return newSet;
      });
    }
  };

  const getConflictDescription = (conflictType: string) => {
    switch (conflictType) {
      case 'admin_family_conflict':
        return 'User has both admin and family roles. Admin roles cannot join families.';
      case 'multiple_admin_roles':
        return 'User has multiple admin roles. Users can only have one admin role.';
      case 'multiple_family_roles':
        return 'User has multiple family roles. Users can only have one family role.';
      default:
        return 'Unknown role conflict detected.';
    }
  };

  const getConflictSeverity = (conflictType: string) => {
    if (conflictType === 'admin_family_conflict') return 'critical';
    return 'warning';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Role Conflict Detection
            </CardTitle>
            <CardDescription>
              Detect and resolve users with conflicting role assignments
            </CardDescription>
          </div>
          <Button
            onClick={fetchConflicts}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Scanning for role conflicts...
          </div>
        ) : conflicts.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-600">
              <strong>No role conflicts detected.</strong> All users have valid role assignments.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{conflicts.length} role conflict{conflicts.length > 1 ? 's' : ''} detected.</strong> 
                These users need immediate attention to prevent access issues.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {conflicts.map((conflict) => (
                <Card key={conflict.user_id} className="border-l-4 border-l-amber-500">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            {conflict.first_name} {conflict.last_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">{conflict.email}</p>
                        </div>
                        <Badge variant={getConflictSeverity(conflict.conflict_type) === 'critical' ? 'destructive' : 'secondary'}>
                          {conflict.conflict_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {getConflictDescription(conflict.conflict_type)}
                        </p>
                        <div className="flex gap-1 flex-wrap">
                          {conflict.conflicting_roles.map((role) => (
                            <Badge key={role} variant="outline" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {conflict.conflict_type === 'admin_family_conflict' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveConflict(conflict, 'admin')}
                            disabled={resolving.has(conflict.user_id)}
                            className="text-xs"
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            Keep Admin Role
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveConflict(conflict, 'family')}
                            disabled={resolving.has(conflict.user_id)}
                            className="text-xs"
                          >
                            <Users className="h-3 w-3 mr-1" />
                            Keep Family Role
                          </Button>
                        </div>
                      )}

                       {(conflict.conflict_type === 'multiple_admin_roles' || conflict.conflict_type === 'multiple_family_roles') && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveConflict(conflict, conflict.conflict_type.includes('admin') ? 'admin' : 'family')}
                            disabled={resolving.has(conflict.user_id)}
                            className="text-xs"
                          >
                            <UserX className="h-3 w-3 mr-1" />
                            Auto-Resolve (Keep First Role)
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
