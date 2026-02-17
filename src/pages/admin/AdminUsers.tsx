import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  Search, 
  UserCheck,
  Activity,
  Shield,
  Eye,
  Edit,
  Trash2,
  Key,
  UserPlus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserViewDialog } from '@/components/admin/UserViewDialog';
import { UserEditDialog } from '@/components/admin/UserEditDialog';
import { UserDeleteDialog } from '@/components/admin/UserDeleteDialog';
import { UserPasswordResetDialog } from '@/components/admin/UserPasswordResetDialog';
import { UserCreateDialog } from '@/components/admin/UserCreateDialog';
import { BulkDeleteConfirmDialog, type BulkDeleteItem } from '@/components/admin/BulkDeleteConfirmDialog';
import { AdminEmptyState } from '@/components/illustrations';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { cLog, cError, cWarn } from '@/utils/conditionalLogger';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  roles: string[];
  families: { family_code: string; display_name: string }[];
}

export default function AdminUsers() {
  const { userRole, user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordResetDialogOpen, setPasswordResetDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const toggleAllUsers = () => {
    if (selectedUserIds.size === selectableUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(selectableUsers.map(u => u.id)));
    }
  };

  const processUsers = useCallback(async (usersData: { user_id: string; email: string; first_name: string; last_name: string; created_at: string }[]) => {
    // Get user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      cError('Roles error:', rolesError);
      throw rolesError;
    }
    cLog(`Fetched roles for ${userRoles?.length || 0} users`);

    // Get family memberships with explicit join
    const { data: familyMembers, error: familiesError } = await supabase
      .from('family_members')
      .select(`
        user_id,
        family_id,
        families:family_id (
          family_code,
          display_name
        )
      `);

    if (familiesError) {
      cError('Families error:', familiesError);
      throw familiesError;
    }
    cLog(`Fetched family memberships: ${familyMembers?.length || 0} memberships`);

    // Combine the data
    const usersWithRolesAndFamilies: User[] = usersData.map(userData => {
      if (!userData.user_id) {
        cWarn('User missing user_id:', userData);
        return null;
      }

      const userRoleEntries = userRoles?.filter(ur => ur.user_id === userData.user_id) || [];
      const userFamilyEntries = familyMembers?.filter(fm => fm.user_id === userData.user_id) || [];
      
      const families = userFamilyEntries
        .map(fm => {
          const familyData = fm.families;
          if (familyData && typeof familyData === 'object') {
            const typedFamily = familyData as { family_code?: string; display_name?: string };
            return {
              family_code: typedFamily.family_code || '',
              display_name: typedFamily.display_name || ''
            };
          }
          return null;
        })
        .filter(Boolean) as { family_code: string; display_name: string }[];

      return {
        id: userData.user_id,
        email: userData.email || '',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        created_at: userData.created_at,
        roles: userRoleEntries.map(ur => ur.role),
        families: families
      };
    }).filter(Boolean) as User[];

    cLog('Processed users:', usersWithRolesAndFamilies.length);
    setUsers(usersWithRolesAndFamilies);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      cLog('Starting to fetch users...');

      // Get users with emails using secure admin function
      const { data: usersWithEmails, error: usersError } = await supabase
        .rpc('get_users_with_emails');

      if (usersError) {
        cError('Users with emails error:', usersError);
        // Fall back to profiles if RPC fails (e.g., non-admin user)
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, first_name, last_name, created_at, updated_at')
          .order('created_at', { ascending: false });
        
        if (profilesError) {
          throw profilesError;
        }
        
        // Process without emails for non-admin fallback
        const usersWithoutEmails = (profiles || []).map(profile => ({
          user_id: profile.user_id,
          email: '',
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          created_at: profile.created_at
        }));
        
        await processUsers(usersWithoutEmails);
        return;
      }
      
      cLog('Fetched users with emails:', usersWithEmails?.length || 0);
      await processUsers(usersWithEmails || []);
    } catch (error: unknown) {
      cError('Error fetching users:', getErrorMessage(error));
      toast({
        variant: 'destructive',
        title: 'Error Loading Users',
        description: getErrorMessage(error)
      });
    } finally {
      setLoading(false);
    }
  }, [processUsers, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);


  // Utility function to mask sensitive email addresses
  const getMaskedEmail = (email: string, isRevealed: boolean = false) => {
    if (!email || isRevealed) return email;
    const [local, domain] = email.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
  };

  // Toggle for revealing/hiding emails (admin only)
  const [revealEmails, setRevealEmails] = useState(false);

  const filteredUsers = users.filter(user => {
    const searchEmail = revealEmails ? user.email : getMaskedEmail(user.email);
    const matchesSearch = 
      searchEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter);
    
    return matchesSearch && matchesRole;
  });

  // Exclude current admin from selection to prevent self-deletion
  const selectableUsers = filteredUsers.filter(u => u.id !== currentUser?.id);

  const bulkDeleteItems: BulkDeleteItem[] = selectableUsers
    .filter(u => selectedUserIds.has(u.id))
    .map(u => ({ id: u.id, label: `${u.first_name} ${u.last_name} (${u.email})` }));

  const handleBulkDeleteUser = async (item: BulkDeleteItem) => {
    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
      body: { userId: item.id, userEmail: '' }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  };

  const handleBulkDeleteComplete = () => {
    setSelectedUserIds(new Set());
    fetchUsers();
    toast({ title: 'Bulk Delete Complete', description: 'Selected users have been processed.' });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-600';
      case 'read_only': return 'bg-purple-600';
      case 'parent': return 'bg-blue-600';
      case 'child': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  const _getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Shield;
      case 'read_only': return Eye;
      case 'parent': return UserCheck;
      case 'child': return Activity;
      default: return Users;
    }
  };
  void _getRoleIcon; // Available for future use

  const roleStats = {
    total: users.length,
    admins: users.filter(u => u.roles.includes('admin')).length,
    readOnly: users.filter(u => u.roles.includes('read_only')).length,
    parents: users.filter(u => u.roles.includes('parent')).length,
    children: users.filter(u => u.roles.includes('child')).length,
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    cLog('Opening edit dialog for user:', user);
    if (!user.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User ID is missing. Cannot edit user.'
      });
      return;
    }
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    if (!user.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User ID is missing. Cannot delete user.'
      });
      return;
    }
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handlePasswordReset = (user: User) => {
    cLog('Opening password reset dialog for user:', user);
    if (!user.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User ID is missing. Cannot reset password.'
      });
      return;
    }
    setSelectedUser(user);
    setPasswordResetDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Users className="h-8 w-8 mr-3 text-blue-400" />
            User Management
          </h1>
          <p className="text-gray-400 mt-1">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        {userRole === 'admin' && (
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {roleStats.total}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Admins
            </CardTitle>
            <Shield className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {roleStats.admins}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Read Only
            </CardTitle>
            <Eye className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {roleStats.readOnly}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Parents
            </CardTitle>
            <UserCheck className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {roleStats.parents}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Children
            </CardTitle>
            <Activity className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {roleStats.children}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="all" className="text-white">All Roles</SelectItem>
                <SelectItem value="admin" className="text-white">Admins</SelectItem>
                <SelectItem value="read_only" className="text-white">Read Only</SelectItem>
                <SelectItem value="parent" className="text-white">Parents</SelectItem>
                <SelectItem value="child" className="text-white">Children</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Users ({filteredUsers.length})</CardTitle>
          <CardDescription className="text-gray-400">
            All registered users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                {userRole === 'admin' && (
                  <TableHead className="text-gray-300 w-10">
                    <Checkbox
                      checked={selectableUsers.length > 0 && selectedUserIds.size === selectableUsers.length}
                      onCheckedChange={toggleAllUsers}
                      className="border-gray-500"
                    />
                  </TableHead>
                )}
                <TableHead className="text-gray-300">Name</TableHead>
                <TableHead className="text-gray-300">Email</TableHead>
                <TableHead className="text-gray-300">Roles</TableHead>
                <TableHead className="text-gray-300">Families</TableHead>
                <TableHead className="text-gray-300">Joined</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className={`border-gray-700 ${selectedUserIds.has(user.id) ? 'bg-red-900/10' : ''}`}>
                  {userRole === 'admin' && (
                    <TableCell>
                      {user.id !== currentUser?.id ? (
                        <Checkbox
                          checked={selectedUserIds.has(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                          className="border-gray-500"
                        />
                      ) : (
                        <span className="text-xs text-gray-500" title="Cannot delete yourself">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-white">
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell className="text-gray-300 font-mono text-sm relative group">
                    <div className="flex items-center space-x-2">
                      <span>{revealEmails ? user.email : getMaskedEmail(user.email)}</span>
                      {userRole === 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevealEmails(!revealEmails)}
                          className="h-6 px-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                          title={revealEmails ? "Hide emails" : "Reveal emails"}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="secondary"
                          className={`${getRoleBadgeColor(role)} text-white text-xs`}
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.families.map((family, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="border-gray-600 text-gray-300 text-xs"
                        >
                          {family.family_code}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewUser(user)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                        title="View User"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {userRole === 'admin' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="text-green-400 hover:text-green-300 hover:bg-gray-700"
                            title="Edit User"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePasswordReset(user)}
                            className="text-yellow-400 hover:text-yellow-300 hover:bg-gray-700"
                            title="Reset Password"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <AdminEmptyState
              variant={searchTerm || roleFilter !== 'all' ? 'noResults' : 'users'}
              isFiltered={!!(searchTerm || roleFilter !== 'all')}
              searchTerm={searchTerm}
              onPrimaryAction={() => setCreateDialogOpen(true)}
              primaryActionLabel="Add User"
              onSecondaryAction={() => {
                setSearchTerm('');
                setRoleFilter('all');
              }}
            />
          )}

          {/* Floating action bar for bulk selection */}
          {userRole === 'admin' && selectedUserIds.size > 0 && (
            <div className="sticky bottom-0 mt-4 flex items-center justify-between bg-gray-700 border border-gray-600 rounded-lg p-3">
              <span className="text-white text-sm font-medium">
                {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUserIds(new Set())}
                  className="border-gray-500 text-gray-300 hover:bg-gray-600"
                >
                  Deselect All
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <UserCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleDialogSuccess}
      />

      {/* Dialog Components */}
      <UserViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        user={selectedUser}
      />
      
      <UserEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onSuccess={handleDialogSuccess}
      />

      <UserPasswordResetDialog
        open={passwordResetDialogOpen}
        onOpenChange={setPasswordResetDialogOpen}
        user={selectedUser}
        onSuccess={handleDialogSuccess}
      />
      
      <UserDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={selectedUser}
        onSuccess={handleDialogSuccess}
      />

      <BulkDeleteConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        items={bulkDeleteItems}
        itemType="users"
        onExecuteDelete={handleBulkDeleteUser}
        onComplete={handleBulkDeleteComplete}
        warningLines={[
          'User profiles and personal information',
          'All assigned roles and family memberships',
          'All activity logs and related data',
          'Auth accounts will be permanently removed',
        ]}
      />
    </div>
  );
}