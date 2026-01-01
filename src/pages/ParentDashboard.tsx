import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useParentPortalGuard } from '@/hooks/useParentPortalGuard';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserFamilies, getSecureFamilyMembers, FamilyMemberInfo } from '@/utils/secureFamilyAccess';
import { toast } from '@/hooks/use-toast';
import { Heart, Users, Plus, Target, User } from 'lucide-react';
import CreateChildAccountDialog from '@/components/parent/CreateChildAccountDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ParentNavigation } from '@/components/parent/ParentNavigation';
import { WeeklyProgressSummary } from '@/components/parent/WeeklyProgressSummary';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface FamilyData {
  id: string;
  display_name: string;
  created_at: string;
}

// FamilyMemberInfo is now imported from secureFamilyAccess

const ParentDashboard = () => {
  const { signOut } = useAuth();
  const { isAuthorized, checking, user, isAdmin } = useParentPortalGuard();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showCreateChildDialog, setShowCreateChildDialog] = useState(false);
  const [showFamilyDialog, setShowFamilyDialog] = useState(false);
  const [familyData, setFamilyData] = useState<FamilyData[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberInfo[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);

  useEffect(() => {
    if (isAuthorized && user) {
      fetchProfile();
    }
  }, [isAuthorized, user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      // Fetch user families
      const userFamilies = await getCurrentUserFamilies();
      setFamilyData(userFamilies);
      
      // Fetch family members for the first family (assuming single family for now)
      if (userFamilies.length > 0) {
        const familyMembers = await getSecureFamilyMembers(userFamilies[0].id);
        setFamilyMembers(familyMembers);
      }
      
      // Keep existing profile fetch for other data
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleViewFamily = async () => {
    if (familyData.length === 0) return;
    
    setFamilyLoading(true);
    try {
      // Refresh family members data when opening dialog
      const familyMembers = await getSecureFamilyMembers(familyData[0].id);
      setFamilyMembers(familyMembers);
      setShowFamilyDialog(true);
    } catch (error) {
      console.error('Error fetching family members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load family members',
        variant: 'destructive',
      });
    } finally {
      setFamilyLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Sign out failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      navigate('/');
    }
  };

  // Show loading while checking authorization or loading profile
  if (checking || !isAuthorized || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-center">
          <Heart className="h-12 w-12 mx-auto mb-4 animate-pulse" />
          <p>Loading your parent dashboard...</p>
          {checking && <p className="text-sm opacity-75 mt-2">Verifying access...</p>}
          {isAdmin && <p className="text-sm opacity-75 mt-2">Admin access verification...</p>}
        </div>
      </div>
    );
  }

  const displayName = profile?.first_name && profile?.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : user?.email || 'Parent';

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <ParentNavigation />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Family Management</h2>
          <p className="text-muted-foreground">
            Manage your family members and create personalized learning experiences for your children.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Family Overview Card */}
          <Card className="bg-gradient-card shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Family Overview
              </CardTitle>
              <CardDescription>
                View and manage your family members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Family Members: {familyMembers.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  Active Families: {familyData.length}
                </p>
                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={handleViewFamily}
                  disabled={familyData.length === 0 || familyLoading}
                >
                  {familyLoading ? 'Loading...' : 'View Family'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Chore Management Card */}
          <Card className="bg-gradient-card shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-secondary" />
                Daily Tasks Management
              </CardTitle>
              <CardDescription>
                Manage chores and track progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Create, assign, and track daily tasks with gamification to motivate your children.
                </p>
                <Button 
                  className="w-full mt-4 bg-secondary hover:bg-secondary-hover"
                  onClick={() => navigate('/parent/chores')}
                >
                  Manage Tasks
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Add Child Account Card */}
          <Card className="bg-gradient-card shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-accent" />
                Add Child Account
              </CardTitle>
              <CardDescription>
                Create a new account for your child
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Set up personalized learning experiences tailored to your child's needs.
                </p>
                <Button 
                  className="w-full mt-4 bg-accent hover:bg-accent-hover"
                  onClick={() => setShowCreateChildDialog(true)}
                >
                  Create Child Account
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="bg-gradient-card shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-accent" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Common tasks and resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={() => navigate('/parent/reports')}
                >
                  View Learning Progress
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={() => navigate('/games')}
                >
                  Browse Activities
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={() => navigate('/support/contact')}
                >
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Progress Summary */}
        <div className="mt-6">
          <WeeklyProgressSummary />
        </div>

        {/* Welcome Message */}
        <Card className="mt-6 bg-gradient-primary text-primary-foreground shadow-medium">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Welcome to Chatterbox!</h3>
            <p className="opacity-90">
              You're now part of a supportive community dedicated to helping children with autism thrive. 
              Start by exploring the family management tools above or create your first child account 
              to begin their personalized learning journey.
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Create Child Account Dialog */}
      <CreateChildAccountDialog
        open={showCreateChildDialog}
        onOpenChange={setShowCreateChildDialog}
        onSuccess={() => {
          // Refresh family data when child account is created
          fetchProfile();
          toast({
            title: "Child account created",
            description: "The child can now complete their account setup with the provided code.",
          });
        }}
      />

      {/* Family Members Dialog */}
      <Dialog open={showFamilyDialog} onOpenChange={setShowFamilyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Family Members
              {familyData.length > 0 && (
                <Badge variant="secondary">{familyData[0].display_name}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {familyMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No family members found</p>
                  <p className="text-sm">Create a child account to get started</p>
                </div>
              ) : (
                familyMembers.map((member) => {
                  const displayName = member.first_name && member.last_name
                    ? `${member.first_name} ${member.last_name}`
                    : member.first_name || 'Family Member';
                  
                  return (
                    <Card key={member.user_id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{displayName}</h4>
                            <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={member.role === 'parent' ? 'default' : 'secondary'}>
                            {member.role}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Joined {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParentDashboard;