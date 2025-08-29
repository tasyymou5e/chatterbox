import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Mail, 
  Calendar,
  Shield,
  UserCheck,
  Activity,
  Home
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  roles: string[];
  families: { family_code: string; display_name: string }[];
}

interface UserViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function UserViewDialog({ open, onOpenChange, user }: UserViewDialogProps) {
  if (!user) return null;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-600';
      case 'parent': return 'bg-blue-600';
      case 'child': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Shield;
      case 'parent': return UserCheck;
      case 'child': return Activity;
      default: return Users;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            User Details
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            View detailed information about this user
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="h-4 w-4" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300">First Name</label>
                <p className="text-white bg-gray-700 rounded px-3 py-2 mt-1">
                  {user.first_name || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Last Name</label>
                <p className="text-white bg-gray-700 rounded px-3 py-2 mt-1">
                  {user.last_name || 'Not provided'}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Mail className="h-3 w-3" />
                Email Address
              </label>
              <p className="text-white bg-gray-700 rounded px-3 py-2 mt-1 font-mono text-sm">
                {user.email}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Member Since
              </label>
              <p className="text-white bg-gray-700 rounded px-3 py-2 mt-1">
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Roles */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="h-4 w-4" />
              User Roles
            </h3>
            
            {user.roles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role) => {
                  const RoleIcon = getRoleIcon(role);
                  return (
                    <Badge
                      key={role}
                      className={`${getRoleBadgeColor(role)} text-white flex items-center gap-1`}
                    >
                      <RoleIcon className="h-3 w-3" />
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 italic">No roles assigned</p>
            )}
          </div>

          <Separator className="bg-gray-700" />

          {/* Family Memberships */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Home className="h-4 w-4" />
              Family Memberships
            </h3>
            
            {user.families.length > 0 ? (
              <div className="space-y-3">
                {user.families.map((family, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{family.display_name}</p>
                        <p className="text-gray-400 text-sm">Family Code: {family.family_code}</p>
                      </div>
                      <Badge variant="outline" className="border-gray-600 text-gray-300">
                        Member
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic">Not a member of any families</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}