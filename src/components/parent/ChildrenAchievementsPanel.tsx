import { useState, useEffect } from 'react';
import { Trophy, Star, Award, Medal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { logSupabaseQuery, logDataAccessIssue, logDataFetchSuccess, createQueryTimer } from '@/utils/parentPortalLogger';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  rarity: string | null;
  point_reward: number | null;
  unlocked_at: string;
}

interface ChildAchievements {
  userId: string;
  firstName: string;
  lastName: string;
  achievements: Achievement[];
}

export function ChildrenAchievementsPanel() {
  const { user } = useAuthStore();
  const [childrenAchievements, setChildrenAchievements] = useState<ChildAchievements[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChildrenAchievements();
    }
  }, [user]);

  const fetchChildrenAchievements = async () => {
    if (!user?.id) return;
    const timer = createQueryTimer();

    try {
      // Get families created by this parent
      const { data: families, error: familiesError } = await supabase
        .from('families')
        .select('id')
        .eq('created_by', user.id);

      logSupabaseQuery(
        { component: 'Achievements', operation: 'fetchFamilies', userId: user.id, table: 'families' },
        { success: !familiesError, error: familiesError || undefined, rowCount: families?.length || 0 }
      );

      if (!families || families.length === 0) {
        logDataAccessIssue('Achievements', 'No families found', {
          userId: user.id,
          expectedData: 'at least 1 family',
          actualResult: '0 families',
          possibleCause: 'User has not created a family yet'
        });
        setLoading(false);
        return;
      }

      const familyIds = families.map(f => f.id);

      // Get child members with profiles
      const { data: childMembers, error: membersError } = await supabase
        .from('family_members')
        .select('user_id')
        .in('family_id', familyIds)
        .eq('role', 'child');

      logSupabaseQuery(
        { component: 'Achievements', operation: 'fetchChildMembers', userId: user.id, table: 'family_members', metadata: { familyIds } },
        { success: !membersError, error: membersError || undefined, rowCount: childMembers?.length || 0 }
      );

      if (!childMembers || childMembers.length === 0) {
        logDataAccessIssue('Achievements', 'No child members found', {
          userId: user.id,
          expectedData: 'at least 1 child member',
          actualResult: '0 children',
          possibleCause: 'No children have been added to the family yet'
        });
        setLoading(false);
        return;
      }

      const childUserIds = childMembers.map(m => m.user_id);

      // Get profiles for children
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', childUserIds);

      logSupabaseQuery(
        { component: 'Achievements', operation: 'fetchProfiles', userId: user.id, table: 'profiles' },
        { success: !profilesError, error: profilesError || undefined, rowCount: profiles?.length || 0 }
      );

      // Get achievements for all children
      const { data: userAchievements, error: achievementsError } = await supabase
        .from('user_achievements')
        .select(`
          user_id,
          unlocked_at,
          achievements (
            id,
            name,
            description,
            icon,
            rarity,
            point_reward
          )
        `)
        .in('user_id', childUserIds)
        .order('unlocked_at', { ascending: false });

      logSupabaseQuery(
        { component: 'Achievements', operation: 'fetchUserAchievements', userId: user.id, table: 'user_achievements' },
        { success: !achievementsError, error: achievementsError || undefined, rowCount: userAchievements?.length || 0 }
      );

      // Group achievements by child
      const achievementsByChild = new Map<string, Achievement[]>();
      
      userAchievements?.forEach(ua => {
        const achievement = ua.achievements as unknown as Achievement;
        if (!achievement) return;
        
        const existing = achievementsByChild.get(ua.user_id) || [];
        existing.push({
          ...achievement,
          unlocked_at: ua.unlocked_at,
        });
        achievementsByChild.set(ua.user_id, existing);
      });

      // Build result with profile data
      const result: ChildAchievements[] = childUserIds.map(userId => {
        const profile = profiles?.find(p => p.user_id === userId);
        return {
          userId,
          firstName: profile?.first_name || 'Child',
          lastName: profile?.last_name || '',
          achievements: achievementsByChild.get(userId) || [],
        };
      });

      logDataFetchSuccess('Achievements', {
        familyCount: families.length,
        memberCount: childMembers.length,
        recordCount: userAchievements?.length || 0,
        userId: user.id,
        duration: timer.elapsed()
      });

      setChildrenAchievements(result);
    } catch (error) {
      logSupabaseQuery(
        { component: 'Achievements', operation: 'fetchChildrenAchievements', userId: user.id },
        { success: false, error: error as Error, duration: timer.elapsed() }
      );
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string | null) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-500 text-yellow-950';
      case 'epic': return 'bg-purple-500 text-white';
      case 'rare': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getAchievementIcon = (iconName: string | null) => {
    switch (iconName) {
      case 'trophy': return <Trophy className="h-4 w-4" />;
      case 'star': return <Star className="h-4 w-4" />;
      case 'medal': return <Medal className="h-4 w-4" />;
      default: return <Award className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const totalAchievements = childrenAchievements.reduce(
    (sum, child) => sum + child.achievements.length, 
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Children's Achievements
        </CardTitle>
        <CardDescription>
          {totalAchievements} achievements unlocked across all children
        </CardDescription>
      </CardHeader>
      <CardContent>
        {childrenAchievements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No children in your family yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {childrenAchievements.map(child => (
              <div key={child.userId} className="space-y-3">
                <h4 className="font-medium text-foreground">
                  {child.firstName} {child.lastName}
                  <Badge variant="secondary" className="ml-2">
                    {child.achievements.length} achievements
                  </Badge>
                </h4>
                
                {child.achievements.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-4">
                    No achievements yet - keep learning!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {child.achievements.slice(0, 6).map(achievement => (
                      <div 
                        key={achievement.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                      >
                        <div className={`p-2 rounded-full ${getRarityColor(achievement.rarity)}`}>
                          {getAchievementIcon(achievement.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{achievement.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(achievement.unlocked_at).toLocaleDateString()}
                          </p>
                        </div>
                        {achievement.point_reward && (
                          <Badge variant="outline" className="shrink-0">
                            +{achievement.point_reward}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {child.achievements.length > 6 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{child.achievements.length - 6} more achievements
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
