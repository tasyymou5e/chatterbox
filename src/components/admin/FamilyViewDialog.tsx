import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Home, Users, Calendar, User, Mail, Clock } from 'lucide-react';

interface FamilyMember {
  id: string;
  user_id: string;
  role: 'parent' | 'child' | 'admin';
  joined_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface Family {
  id: string;
  family_code: string;
  display_name: string;
  name: string;
  created_at: string;
  created_by: string;
  member_count: number;
  members?: FamilyMember[];
}

interface FamilyViewDialogProps {
  family: Family | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FamilyViewDialog({ family, open, onOpenChange }: FamilyViewDialogProps) {
  if (!family) return null;

  const getRoleColor = (role: string) => {
    return role === 'parent' ? 'bg-purple-600' : 'bg-green-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Home className="h-5 w-5 mr-2 text-blue-400" />
            Family Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Family Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Family Code</label>
                <div className="font-mono text-lg text-white bg-gray-700 p-2 rounded">
                  {family.family_code}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Display Name</label>
                <div className="text-lg text-white bg-gray-700 p-2 rounded">
                  {family.display_name}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Family Name</label>
                <div className="text-lg text-white bg-gray-700 p-2 rounded">
                  {family.name}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Created Date</label>
                <div className="flex items-center text-white bg-gray-700 p-2 rounded">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {new Date(family.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-300">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>{family.member_count} members</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>Family ID: {family.id}</span>
              </div>
            </div>
          </div>

          <Separator className="bg-gray-600" />

          {/* Family Members */}
          <div>
            <div className="flex items-center mb-4">
              <Users className="h-5 w-5 mr-2 text-green-400" />
              <h3 className="text-lg font-semibold text-white">
                Family Members ({family.members?.length || 0})
              </h3>
            </div>

            {family.members && family.members.length > 0 ? (
              <div className="space-y-3">
                {family.members.map((member) => (
                  <div 
                    key={member.id}
                    className="p-4 bg-gray-700/50 rounded-lg border border-gray-600"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-medium text-white">
                            {member.first_name && member.last_name 
                              ? `${member.first_name} ${member.last_name}`
                              : 'Unknown Name'
                            }
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-400 mt-1">
                            <Mail className="h-3 w-3" />
                            <span>{member.email || 'No email'}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            User ID: {member.user_id}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge 
                          variant="secondary" 
                          className={`text-white ${getRoleColor(member.role)}`}
                        >
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Badge>
                        <div className="text-xs text-gray-400">
                          Joined: {new Date(member.joined_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-700/30 rounded-lg">
                <Users className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">No family members found</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}