import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChoreManagementDashboard } from '@/components/chores/ChoreManagementDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Users } from 'lucide-react';
import { ParentNavigation } from '@/components/parent/ParentNavigation';
import { logSupabaseQuery, logDataAccessIssue, logDataFetchSuccess, createQueryTimer } from '@/utils/wideLogger';

interface Family {
  id: string;
  name: string;
  display_name: string;
}

const ParentChoreManagement = () => {
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
    const timer = createQueryTimer();
    
    try {
      // Step 1: Get family IDs where user is a member
      const { data: memberFamilies, error: memberError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id);

      logSupabaseQuery(
        { component: 'ChoreManagement', operation: 'fetchMemberFamilies', userId: user.id, table: 'family_members' },
        { success: !memberError, error: memberError || undefined, rowCount: memberFamilies?.length || 0 }
      );

      // Step 2: Get families where user is creator
      const { data: creatorFamilies, error: creatorError } = await supabase
        .from('families')
        .select('id, name, display_name')
        .eq('created_by', user.id);

      logSupabaseQuery(
        { component: 'ChoreManagement', operation: 'fetchCreatorFamilies', userId: user.id, table: 'families' },
        { success: !creatorError, error: creatorError || undefined, rowCount: creatorFamilies?.length || 0 }
      );

      // Step 3: Get families by member IDs
      const memberFamilyIds = memberFamilies?.map(mf => mf.family_id) || [];
      let memberFamiliesData: Family[] = [];
      
      if (memberFamilyIds.length > 0) {
        const { data: familiesById, error: familiesError } = await supabase
          .from('families')
          .select('id, name, display_name')
          .in('id', memberFamilyIds);

        logSupabaseQuery(
          { component: 'ChoreManagement', operation: 'fetchFamiliesById', userId: user.id, table: 'families', metadata: { familyIds: memberFamilyIds } },
          { success: !familiesError, error: familiesError || undefined, rowCount: familiesById?.length || 0 }
        );

        if (!familiesError && familiesById) {
          memberFamiliesData = familiesById;
        }
      }

      // Step 4: Merge and deduplicate
      const allFamilies = [...(creatorFamilies || []), ...memberFamiliesData];
      const uniqueFamilies = allFamilies.filter((family, index, self) =>
        index === self.findIndex(f => f.id === family.id)
      );

      if (uniqueFamilies.length === 0) {
        logDataAccessIssue('ChoreManagement', 'No families found for user', {
          userId: user.id,
          expectedData: 'at least 1 family',
          actualResult: '0 families',
          possibleCause: 'User may not have created a family or is not a member of any family'
        });
      }

      logDataFetchSuccess('ChoreManagement', {
        familyCount: uniqueFamilies.length,
        userId: user.id,
        duration: timer.elapsed()
      });

      setFamilies(uniqueFamilies);
      
      if (uniqueFamilies.length === 1) {
        setSelectedFamily(uniqueFamilies[0].id);
      }
    } catch (error) {
      logSupabaseQuery(
        { component: 'ChoreManagement', operation: 'fetchUserFamilies', userId: user.id },
        { success: false, error: error as Error, duration: timer.elapsed() }
      );
    } finally {
      setFamiliesLoading(false);
    }
  };

  if (loading || familiesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ParentNavigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <Heart className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
              <p className="text-muted-foreground">Loading chore management...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Family selection screen
  if (!selectedFamily && families.length > 1) {
    return (
      <div className="min-h-screen bg-background">
        <ParentNavigation />

        {/* Family Selection */}
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">Select Family</h2>
              <p className="text-muted-foreground">
                Choose which family's chores you'd like to manage
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
                      Manage daily tasks and chores for the {family.display_name} family
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
        <ParentNavigation />

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Family Found</h2>
            <p className="text-muted-foreground mb-6">
              You haven't created a family yet. Create your first family to start managing chores.
            </p>
            <Button onClick={() => navigate('/parent')}>
              Go to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Main chore management dashboard
  return (
    <div className="min-h-screen bg-background">
      <ParentNavigation />

      {/* Family switcher for multiple families */}
      {families.length > 1 && (
        <div className="container mx-auto px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Managing: <span className="font-medium text-foreground">{families.find(f => f.id === selectedFamily)?.display_name}</span>
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedFamily(null)}
            >
              <Users className="h-4 w-4 mr-2" />
              Switch Family
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {selectedFamily && <ChoreManagementDashboard familyId={selectedFamily} />}
      </main>
    </div>
  );
};

export default ParentChoreManagement;
