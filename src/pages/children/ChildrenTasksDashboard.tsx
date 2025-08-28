import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChildrenChoresDashboard } from '@/components/chores/ChildrenChoresDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Home, Users } from 'lucide-react';

interface Family {
  id: string;
  name: string;
  display_name: string;
}

const ChildrenTasksDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [familiesLoading, setFamiliesLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchUserFamilies();
    }
  }, [user, loading, navigate]);

  const fetchUserFamilies = async () => {
    if (!user) return;

    try {
      // Get families where user is a member
      const { data: familyMembers, error } = await supabase
        .from('family_members')
        .select(`
          family_id,
          families (
            id,
            name,
            display_name
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching families:', error);
        return;
      }

      const userFamilies = familyMembers
        ?.map(fm => fm.families)
        .filter(Boolean) as Family[];

      setFamilies(userFamilies || []);
      
      // Auto-select first family if only one exists
      if (userFamilies && userFamilies.length === 1) {
        setSelectedFamily(userFamilies[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setFamiliesLoading(false);
    }
  };

  if (loading || familiesLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-center">
          <Heart className="h-12 w-12 mx-auto mb-4 animate-pulse" />
          <p>Loading your tasks...</p>
        </div>
      </div>
    );
  }

  // Family selection screen
  if (!selectedFamily && families.length > 1) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-xl font-bold text-foreground">Spectrum Harmony</h1>
                  <p className="text-sm text-muted-foreground">Choose your family</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </div>
          </div>
        </header>

        {/* Family Selection */}
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">Select Your Family</h2>
              <p className="text-muted-foreground">
                Choose which family's tasks you'd like to view
              </p>
            </div>

            <div className="grid gap-4">
              {families.map((family) => (
                <Card
                  key={family.id}
                  className="hover:shadow-medium transition-shadow cursor-pointer"
                  onClick={() => setSelectedFamily(family.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      {family.display_name}
                    </CardTitle>
                    <CardDescription>
                      View and complete tasks for the {family.display_name} family
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // No families found
  if (families.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-xl font-bold text-foreground">Spectrum Harmony</h1>
                  <p className="text-sm text-muted-foreground">My Tasks</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Family Found</h2>
            <p className="text-muted-foreground mb-6">
              You don't seem to be part of any family yet. Ask a parent or guardian to add you to their family.
            </p>
            <Button onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Main dashboard with selected family
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Spectrum Harmony</h1>
                <p className="text-sm text-muted-foreground">
                  {families.find(f => f.id === selectedFamily)?.display_name} Tasks
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {families.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedFamily(null)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Switch Family
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-8">
        {selectedFamily && <ChildrenChoresDashboard familyId={selectedFamily} />}
      </main>
    </div>
  );
};

export default ChildrenTasksDashboard;