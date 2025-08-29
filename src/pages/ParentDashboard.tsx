import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Heart, Users, Plus, Settings, LogOut, Target } from 'lucide-react';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

const ParentDashboard = () => {
  const { user, signOut, loading } = useAuth();
  const { isHydrated } = useAuthStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    console.log('🏠 ParentDashboard: Auth state check', {
      loading,
      isHydrated,
      user: user?.email,
      timestamp: Date.now()
    });

    // Wait for both loading to complete AND store to be hydrated before making navigation decisions
    if (!loading && isHydrated && !user) {
      console.log('🏠 ParentDashboard: No user detected after hydration, redirecting to auth');
      navigate('/auth');
      return;
    }

    if (user && isHydrated) {
      console.log('🏠 ParentDashboard: User found and hydrated, fetching profile');
      fetchProfile();
    }
  }, [user, loading, isHydrated, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
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

  // Show loading if still loading auth or if store hasn't hydrated yet or profile loading
  if (loading || !isHydrated || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-center">
          <Heart className="h-12 w-12 mx-auto mb-4 animate-pulse" />
          <p>Loading your parent dashboard...</p>
          {!isHydrated && <p className="text-sm opacity-75 mt-2">Initializing session...</p>}
        </div>
      </div>
    );
  }

  const displayName = profile?.first_name && profile?.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : user?.email || 'Parent';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Spectrum Harmony Parent Portal</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {displayName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

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
                <p className="text-sm text-muted-foreground">Family Members: 1</p>
                <p className="text-sm text-muted-foreground">Active Accounts: 1</p>
                <Button className="w-full mt-4" variant="outline">
                  View Family
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
                <Button className="w-full mt-4 bg-accent hover:bg-accent-hover">
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
                <Button variant="ghost" className="w-full justify-start" size="sm">
                  View Learning Progress
                </Button>
                <Button variant="ghost" className="w-full justify-start" size="sm">
                  Schedule Activities
                </Button>
                <Button variant="ghost" className="w-full justify-start" size="sm">
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Welcome Message */}
        <Card className="mt-8 bg-gradient-primary text-primary-foreground shadow-medium">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Welcome to Spectrum Harmony!</h3>
            <p className="opacity-90">
              You're now part of a supportive community dedicated to helping autistic children thrive. 
              Start by exploring the family management tools above or create your first child account 
              to begin their personalized learning journey.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ParentDashboard;