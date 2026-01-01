import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { ConnectionManagementDashboard } from '@/components/connections/ConnectionManagementDashboard';
import { ParentNavigation } from '@/components/parent/ParentNavigation';

interface Family {
  id: string;
  name: string;
  display_name: string;
}

export default function ParentConnectionManagement() {
  const { user, loading: authLoading } = useAuthStore();
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserFamilies();
    }
  }, [user]);

  const fetchUserFamilies = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('families')
        .select('id, name, display_name')
        .eq('created_by', user.id);

      if (error) throw error;

      setFamilies(data || []);
      if (data && data.length > 0) {
        setSelectedFamily(data[0]);
      }
    } catch (error) {
      console.error('Error fetching families:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <ParentNavigation />
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="animate-pulse">
              <Users className="h-16 w-16 mx-auto text-primary mb-4" />
            </div>
            <p className="text-muted-foreground">Loading your network...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <ParentNavigation />
        <div className="flex items-center justify-center py-16">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please log in to manage your family network</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (families.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <ParentNavigation />
        <div className="flex items-center justify-center py-16">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>No Families Found</CardTitle>
              <CardDescription>
                You need to create a family first before managing connections
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (families.length > 1 && !selectedFamily) {
    return (
      <div className="min-h-screen bg-background">
        <ParentNavigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Users className="h-6 w-6" />
                Select Family
              </CardTitle>
              <CardDescription>Choose which family network you'd like to manage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {families.map((family) => (
                <Card 
                  key={family.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedFamily(family)}
                >
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground">{family.display_name}</h3>
                    <p className="text-muted-foreground">Family Code: {family.name}</p>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ParentNavigation />
      
      <div className="container mx-auto p-6">
        {/* Family Selector for multiple families */}
        {families.length > 1 && selectedFamily && (
          <div className="mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-foreground">Managing: {selectedFamily.display_name}</h2>
                    <p className="text-sm text-muted-foreground">Family Code: {selectedFamily.name}</p>
                  </div>
                  <div className="flex gap-2">
                    {families.map((family) => (
                      <button
                        key={family.id}
                        onClick={() => setSelectedFamily(family)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          selectedFamily.id === family.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {family.display_name}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Connection Management Dashboard */}
        {selectedFamily && (
          <ConnectionManagementDashboard familyId={selectedFamily.id} />
        )}
      </div>
    </div>
  );
}