import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserPlus, UserMinus, Mail, Search, Trash2, AlertTriangle, Key } from 'lucide-react';
import { UserPasswordResetDialog } from '@/components/admin/UserPasswordResetDialog';

interface FamilyMember {
  id: string;
  user_id: string;
  role: 'parent' | 'child' | 'admin' | 'therapist' | 'teacher' | 'grandparent' | 'family_friend';
  joined_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface Family {
  id: string;
  family_code: string;
  display_name: string;
  created_by: string;
  members?: FamilyMember[];
}

interface AdminMemberManagementDialogProps {
  family: Family | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AdminMemberManagementDialog({ 
  family, 
  open, 
  onOpenChange, 
  onSuccess 
}: AdminMemberManagementDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('child');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMemberToRemove, setSelectedMemberToRemove] = useState<FamilyMember | null>(null);
  const [passwordResetDialogOpen, setPasswordResetDialogOpen] = useState(false);
  const [selectedMemberForPasswordReset, setSelectedMemberForPasswordReset] = useState<{
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  } | null>(null);

  if (!family) return null;

  const handlePasswordReset = async (member: FamilyMember) => {
    // Fetch email for the member
    try {
      const { data, error } = await supabase.rpc('get_users_with_emails');
      if (error) throw error;
      
      const userData = data?.find((u: { user_id: string }) => u.user_id === member.user_id);
      
      setSelectedMemberForPasswordReset({
        id: member.user_id,
        email: userData?.email || '',
        first_name: member.first_name,
        last_name: member.last_name
      });
      setPasswordResetDialogOpen(true);
    } catch (error) {
      console.error('Error fetching user email:', error);
      // Still open dialog with available info
      setSelectedMemberForPasswordReset({
        id: member.user_id,
        email: '',
        first_name: member.first_name,
        last_name: member.last_name
      });
      setPasswordResetDialogOpen(true);
    }
  };

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) return;
    
    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .limit(5);

      if (error) throw error;

      // Filter out users who are already family members
      const existingUserIds = family.members?.map(m => m.user_id) || [];
      const filteredResults = (data || []).filter(user => !existingUserIds.includes(user.user_id));
      
      setSearchResults(filteredResults);
      
      if (filteredResults.length === 0) {
        toast({
          title: 'No users found',
          description: 'No matching users found or all matching users are already family members.',
          variant: 'default',
        });
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddMember = async (userToAdd: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-add-family-member', {
        body: {
          familyId: family.id,
          userId: userToAdd.user_id,
          role: selectedRole,
          userEmail: '', // Email removed from profiles for security
          userName: `${userToAdd.first_name || ''} ${userToAdd.last_name || ''}`.trim()
        }
      });

      if (error) throw error;

      const userName = `${userToAdd.first_name || ''} ${userToAdd.last_name || ''}`.trim() || 'User';
      toast({
        title: 'Member added successfully',
        description: `${userName} has been added to ${family.display_name} as ${selectedRole}.`,
      });

      // Clear form
      setSearchEmail('');
      setSearchResults([]);
      setSelectedRole('child');
      
      onSuccess();
    } catch (error: any) {
      console.error('Add member error:', error);
      toast({
        title: 'Failed to add member',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMemberToRemove) return;
    
    setLoading(true);
    try {
      const userName = `${selectedMemberToRemove.first_name || ''} ${selectedMemberToRemove.last_name || ''}`.trim() || 'User';
      const { data, error } = await supabase.functions.invoke('admin-remove-family-member', {
        body: {
          familyId: family.id,
          userId: selectedMemberToRemove.user_id,
          userEmail: '', // Email removed from profiles for security
          userName
        }
      });

      if (error) throw error;

      toast({
        title: 'Member removed successfully',
        description: `${userName} has been removed from ${family.display_name}.`,
      });

      setSelectedMemberToRemove(null);
      onSuccess();
    } catch (error: any) {
      console.error('Remove member error:', error);
      toast({
        title: 'Failed to remove member',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    const colors = {
      parent: 'bg-purple-600',
      child: 'bg-green-600',
      admin: 'bg-red-600',
      therapist: 'bg-blue-600',
      teacher: 'bg-yellow-600',
      grandparent: 'bg-pink-600',
      family_friend: 'bg-gray-600'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Users className="h-5 w-5 mr-2 text-blue-400" />
            Manage Family Members - {family.display_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          
          {/* Add Member Section */}
          <div className="space-y-4">
            <div className="flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-green-400" />
              <h3 className="text-lg font-semibold">Add New Member</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="search-email">Search by Email</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="search-email"
                    placeholder="Enter email address..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="bg-gray-700 border-gray-600"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                  />
                  <Button 
                    onClick={handleSearchUser} 
                    disabled={!searchEmail.trim() || searchLoading}
                    variant="outline"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="member-role">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="therapist">Therapist</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="grandparent">Grandparent</SelectItem>
                    <SelectItem value="family_friend">Family Friend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Found {searchResults.length} user(s):</p>
                {searchResults.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded border border-gray-600">
                     <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">
                          {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : 'User'}
                        </div>
                        <div className="text-sm text-gray-400">
                          User ID: {user.user_id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleAddMember(user)}
                      disabled={loading}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add as {selectedRole}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="bg-gray-600" />

          {/* Current Members Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-400" />
                <h3 className="text-lg font-semibold">Current Members ({family.members?.length || 0})</h3>
              </div>
            </div>

            {family.members && family.members.length > 0 ? (
              <div className="space-y-3">
                {family.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded border border-gray-600">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium">
                          {member.first_name && member.last_name 
                            ? `${member.first_name} ${member.last_name}`
                            : 'Unknown Name'
                          }
                        </div>
                        <div className="text-sm text-gray-400">User ID: {member.user_id.substring(0, 8)}...</div>
                        <div className="text-xs text-gray-500">
                          Joined: {new Date(member.joined_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant="secondary" 
                        className={`text-white ${getRoleColor(member.role)}`}
                      >
                        {member.role}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePasswordReset(member)}
                        className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20"
                        title="Reset Password"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      {member.user_id !== family.created_by && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMemberToRemove(member)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          title="Remove Member"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-700/30 rounded">
                <Users className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">No family members found</p>
              </div>
            )}
          </div>
        </div>

        {/* Remove Member Confirmation */}
        {selectedMemberToRemove && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md mx-4">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
                <h3 className="text-lg font-semibold">Remove Family Member</h3>
              </div>
              <p className="text-gray-300 mb-4">
                Are you sure you want to remove{' '}
                <span className="font-medium text-white">
                  {selectedMemberToRemove.first_name && selectedMemberToRemove.last_name
                    ? `${selectedMemberToRemove.first_name} ${selectedMemberToRemove.last_name}`
                    : 'this member'}
                </span>{' '}
                from {family.display_name}?
              </p>
              <p className="text-sm text-gray-400 mb-4">
                This action cannot be undone. The user will lose access to all family data and activities.
              </p>
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedMemberToRemove(null)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleRemoveMember}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {loading ? 'Removing...' : 'Remove Member'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Password Reset Dialog */}
        <UserPasswordResetDialog
          open={passwordResetDialogOpen}
          onOpenChange={setPasswordResetDialogOpen}
          user={selectedMemberForPasswordReset}
          onSuccess={() => {
            setSelectedMemberForPasswordReset(null);
            onSuccess();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}