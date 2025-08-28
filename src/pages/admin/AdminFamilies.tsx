import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Home, 
  Search, 
  Users, 
  Eye,
  Edit,
  Trash2,
  Plus,
  ChevronRight,
  ChevronDown,
  User,
  Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CreateTestFamilyButton from '@/components/admin/CreateTestFamilyButton';

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
  expanded?: boolean;
}

export default function AdminFamilies() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchFamilies();
  }, []);

  const fetchFamilies = async () => {
    try {
      console.log('Fetching families as admin user...');
      
      // Get families with their members first
      const { data: familiesData, error: familiesError } = await supabase
        .from('families')
        .select(`
          *,
          family_members (
            id,
            user_id,
            role,
            joined_at
          )
        `)
        .order('created_at', { ascending: false });

      if (familiesError) {
        console.error('Error fetching families:', familiesError);
        throw familiesError;
      }

      console.log(`Found ${familiesData?.length || 0} families`);

      // Get all unique user IDs from family members
      const allUserIds = [...new Set(
        (familiesData || [])
          .flatMap(family => family.family_members || [])
          .map(member => member.user_id)
      )];

      // Fetch profiles for all users at once
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', allUserIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Create a map of user profiles for quick lookup
      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.user_id, profile])
      );

      // Transform the data to include member details and count
      const familiesWithMembers = (familiesData || []).map(family => {
        const members = (family.family_members || []).map(member => {
          const profile = profilesMap.get(member.user_id);
          return {
            id: member.id,
            user_id: member.user_id,
            role: member.role,
            joined_at: member.joined_at,
            first_name: profile?.first_name,
            last_name: profile?.last_name,
            email: profile?.email
          };
        });

        return {
          ...family,
          member_count: family.family_members?.length || 0,
          members,
          expanded: false
        };
      });

      setFamilies(familiesWithMembers);
      console.log('Successfully loaded families with member details');
    } catch (error) {
      console.error('Error fetching families:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load families'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFamilyExpansion = (familyId: string) => {
    setFamilies(prev => prev.map(family => 
      family.id === familyId 
        ? { ...family, expanded: !family.expanded }
        : family
    ));
  };

  const getRoleColor = (role: string) => {
    return role === 'parent' ? 'bg-purple-600' : 'bg-green-600';
  };

  const filteredFamilies = families.filter(family =>
    family.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    family.family_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Home className="h-8 w-8 mr-3 text-blue-400" />
            Family Management
          </h1>
          <p className="text-gray-400 mt-1">
            Manage and monitor all registered families
          </p>
        </div>
        <CreateTestFamilyButton onSuccess={fetchFamilies} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Total Families
            </CardTitle>
            <Home className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {families.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Total Members
            </CardTitle>
            <Users className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {families.reduce((sum, family) => sum + family.member_count, 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Average Family Size
            </CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {families.length > 0 
                ? Math.round(families.reduce((sum, family) => sum + family.member_count, 0) / families.length * 10) / 10
                : 0
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Search Families</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by family name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Families Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Families ({filteredFamilies.length})</CardTitle>
          <CardDescription className="text-gray-400">
            All registered family groups in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredFamilies.map((family) => (
              <Collapsible key={family.id} open={family.expanded} onOpenChange={() => toggleFamilyExpansion(family.id)}>
                <div className="border border-gray-700 rounded-lg bg-gray-800/50">
                  {/* Family Header Row */}
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 hover:bg-gray-700/30 cursor-pointer transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-gray-400">
                          {family.expanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                        <div className="font-mono text-white">{family.family_code}</div>
                        <div className="text-white">{family.display_name}</div>
                        <Badge 
                          variant="secondary" 
                          className="bg-blue-600 text-white cursor-pointer hover:bg-blue-500"
                        >
                          {family.member_count} members
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-gray-300 text-sm">
                          {new Date(family.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-400 hover:text-green-300 hover:bg-gray-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  {/* Family Members */}
                  <CollapsibleContent>
                    <div className="border-t border-gray-700 bg-gray-800/80">
                      {family.members && family.members.length > 0 ? (
                        <div className="p-4">
                          <div className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            Family Members ({family.members.length})
                          </div>
                          <div className="space-y-2">
                            {family.members.map((member) => (
                              <div 
                                key={member.id} 
                                className="flex items-center justify-between p-3 bg-gray-700/30 rounded-md border border-gray-600/30"
                              >
                                <div className="flex items-center space-x-3">
                                  <User className="h-4 w-4 text-gray-400" />
                                  <div>
                                    <div className="text-white font-medium">
                                      {member.first_name && member.last_name 
                                        ? `${member.first_name} ${member.last_name}`
                                        : 'Unknown Name'
                                      }
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                                      <Mail className="h-3 w-3" />
                                      <span>{member.email || 'No email'}</span>
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
                                  <div className="text-xs text-gray-400">
                                    Joined: {new Date(member.joined_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-400">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No members found</p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>

          {filteredFamilies.length === 0 && (
            <div className="text-center py-8">
              <Home className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {searchTerm ? 'No families match your search.' : 'No families found.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}