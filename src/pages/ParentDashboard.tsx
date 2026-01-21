import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useParentPortalGuard } from '@/hooks/useParentPortalGuard';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserFamilies, getSecureFamilyMembers, FamilyMemberInfo } from '@/utils/secureFamilyAccess';
import { toast } from '@/hooks/use-toast';
import { Heart, Users, Plus, Target, User, Gamepad2 } from 'lucide-react';
import CreateChildAccountDialog from '@/components/parent/CreateChildAccountDialog';
import { ChildGameAssignmentDialog } from '@/components/parent/ChildGameAssignmentDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ParentNavigation } from '@/components/parent/ParentNavigation';
import { WeeklyProgressSummary } from '@/components/parent/WeeklyProgressSummary';
import { logSupabaseQuery, logDataAccessIssue, logDataFetchSuccess, createQueryTimer } from '@/utils/parentPortalLogger';

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
  const { isAuthorized, checking, user, isAdmin: _isAdmin } = useParentPortalGuard();
  void _isAdmin; // Available for future admin-specific UI
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showCreateChildDialog, setShowCreateChildDialog] = useState(false);
  const [showFamilyDialog, setShowFamilyDialog] = useState(false);
  const [showGameAssignmentDialog, setShowGameAssignmentDialog] = useState(false);
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
    const timer = createQueryTimer();

    try {
      // Fetch user families
      const userFamilies = await getCurrentUserFamilies();
      logSupabaseQuery(
        { component: 'Dashboard', operation: 'getCurrentUserFamilies', userId: user.id },
        { success: true, rowCount: userFamilies.length, duration: timer.elapsed() }
      );
      
      if (userFamilies.length === 0) {
        logDataAccessIssue('Dashboard', 'No families found for user', {
          userId: user.id,
          expectedData: 'at least 1 family',
          actualResult: '0 families',
          possibleCause: 'User may not have created a family or RLS policy issue'
        });
      }
      
      setFamilyData(userFamilies);
      
      // Fetch family members for the first family (assuming single family for now)
      let fetchedMembers: FamilyMemberInfo[] = [];
      if (userFamilies.length > 0) {
        fetchedMembers = await getSecureFamilyMembers(userFamilies[0].id);
        logSupabaseQuery(
          { component: 'Dashboard', operation: 'getSecureFamilyMembers', userId: user.id, familyId: userFamilies[0].id },
          { success: true, rowCount: fetchedMembers.length }
        );
        setFamilyMembers(fetchedMembers);
      }
      
      // Keep existing profile fetch for other data
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      logSupabaseQuery(
        { component: 'Dashboard', operation: 'fetchProfile', userId: user.id, table: 'profiles' },
        { success: !error, error: error || undefined, rowCount: data ? 1 : 0 }
      );

      if (error) {
        logDataAccessIssue('Dashboard', 'Failed to fetch user profile', {
          userId: user.id,
          expectedData: 'user profile record',
          actualResult: error.message,
          possibleCause: 'Profile may not exist or RLS policy issue'
        });
      } else {
        setProfile(data);
      }
      
      // Log successful completion
      logDataFetchSuccess('Dashboard', {
        familyCount: userFamilies.length,
        memberCount: fetchedMembers.length,
        userId: user.id,
        duration: timer.elapsed()
      });
    } catch (error) {
      logSupabaseQuery(
        { component: 'Dashboard', operation: 'fetchProfile', userId: user.id },
        { success: false, error: error as Error, duration: timer.elapsed() }
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handleViewFamily = async () => {
    if (familyData.length === 0) return;
    
    setFamilyLoading(true);
    const timer = createQueryTimer();
    try {
      // Refresh family members data when opening dialog
      const members = await getSecureFamilyMembers(familyData[0].id);
      logSupabaseQuery(
        { component: 'Dashboard', operation: 'handleViewFamily', userId: user?.id, familyId: familyData[0].id },
        { success: true, rowCount: members.length, duration: timer.elapsed() }
      );
      setFamilyMembers(members);
      setShowFamilyDialog(true);
    } catch (error) {
      logSupabaseQuery(
        { component: 'Dashboard', operation: 'handleViewFamily', userId: user?.id, familyId: familyData[0].id },
        { success: false, error: error as Error, duration: timer.elapsed() }
      );
      toast({
        title: 'Error',
        description: 'Failed to load family members',
        variant: 'destructive',
      });
    } finally {
      setFamilyLoading(false);
    }
  };

  const _handleSignOut = async () => {
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
  void _handleSignOut; // Available for future UI integration

  // Show loading while checking authorization or loading profile
  // Keep navigation visible during loading for better UX
  if (checking || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ParentNavigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <Heart className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
              <p className="text-muted-foreground">Loading your parent dashboard...</p>
              {checking && <p className="text-sm text-muted-foreground mt-2">Verifying access...</p>}
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // If not authorized after check completes, show access denied with navigation
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background">
        <ParentNavigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">You don't have access to this page.</p>
              <Button onClick={() => navigate('/auth')}>Go to Login</Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const _displayName = profile?.first_name && profile?.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : user?.email || 'Parent';
  void _displayName; // Available for future use in welcome message

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

          {/* Game Assignment Card */}
          <Card className="bg-gradient-card shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-primary" />
                Game Assignments
              </CardTitle>
              <CardDescription>
                Assign educational games to your children
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Choose specific games for each child with custom difficulty settings and due dates.
                </p>
                <Button 
                  className="w-full mt-4"
                  onClick={() => setShowGameAssignmentDialog(true)}
                  disabled={familyMembers.filter(m => m.role === 'child').length === 0}
                >
                  Assign Games
                </Button>
                {familyMembers.filter(m => m.role === 'child').length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Create a child account first to assign games
                  </p>
                )}
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

      {/* Game Assignment Dialog */}
      <ChildGameAssignmentDialog
        isOpen={showGameAssignmentDialog}
        onClose={() => setShowGameAssignmentDialog(false)}
        familyId={familyData[0]?.id || ''}
        parentId={user?.id || ''}
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