import { useState, useEffect } from 'react';
import { Play, Clock, Star, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface ContentInteraction {
  contentTitle: string;
  contentType: string;
  interactionCount: number;
  totalDuration: number;
  lastPlayed: string;
}

interface ChildContentUsage {
  userId: string;
  firstName: string;
  lastName: string;
  interactions: ContentInteraction[];
  totalTime: number;
}

export function ChildrenContentUsage() {
  const { user } = useAuthStore();
  const [childrenUsage, setChildrenUsage] = useState<ChildContentUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchContentUsage();
    }
  }, [user]);

  const fetchContentUsage = async () => {
    if (!user?.id) return;

    try {
      // Get families created by this parent
      const { data: families } = await supabase
        .from('families')
        .select('id')
        .eq('created_by', user.id);

      if (!families || families.length === 0) {
        setLoading(false);
        return;
      }

      const familyIds = families.map(f => f.id);

      // Get child members with profiles
      const { data: childMembers } = await supabase
        .from('family_members')
        .select('user_id')
        .in('family_id', familyIds)
        .eq('role', 'child');

      if (!childMembers || childMembers.length === 0) {
        setLoading(false);
        return;
      }

      const childUserIds = childMembers.map(m => m.user_id);

      // Get profiles for children
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', childUserIds);

      // Get content interactions for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: interactions } = await supabase
        .from('content_interactions')
        .select(`
          user_id,
          interaction_type,
          session_duration,
          timestamp,
          content_items (
            title,
            content_type
          )
        `)
        .in('user_id', childUserIds)
        .gte('timestamp', thirtyDaysAgo.toISOString())
        .order('timestamp', { ascending: false });

      // Aggregate by child and content
      const usageByChild = new Map<string, Map<string, ContentInteraction>>();
      const totalTimeByChild = new Map<string, number>();

      interactions?.forEach(interaction => {
        const contentItem = interaction.content_items as { title: string; content_type: string } | null;
        if (!contentItem) return;

        if (!usageByChild.has(interaction.user_id)) {
          usageByChild.set(interaction.user_id, new Map());
          totalTimeByChild.set(interaction.user_id, 0);
        }

        const childMap = usageByChild.get(interaction.user_id)!;
        const key = contentItem.title;
        const existing = childMap.get(key);

        if (existing) {
          existing.interactionCount++;
          existing.totalDuration += interaction.session_duration || 0;
          if (interaction.timestamp > existing.lastPlayed) {
            existing.lastPlayed = interaction.timestamp;
          }
        } else {
          childMap.set(key, {
            contentTitle: contentItem.title,
            contentType: contentItem.content_type,
            interactionCount: 1,
            totalDuration: interaction.session_duration || 0,
            lastPlayed: interaction.timestamp,
          });
        }

        totalTimeByChild.set(
          interaction.user_id, 
          (totalTimeByChild.get(interaction.user_id) || 0) + (interaction.session_duration || 0)
        );
      });

      // Build result
      const result: ChildContentUsage[] = childUserIds.map(userId => {
        const profile = profiles?.find(p => p.user_id === userId);
        const childInteractions = usageByChild.get(userId);
        
        return {
          userId,
          firstName: profile?.first_name || 'Child',
          lastName: profile?.last_name || '',
          interactions: childInteractions 
            ? Array.from(childInteractions.values())
                .sort((a, b) => b.interactionCount - a.interactionCount)
                .slice(0, 5)
            : [],
          totalTime: totalTimeByChild.get(userId) || 0,
        };
      });

      setChildrenUsage(result);
    } catch (error) {
      console.error('Error fetching content usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'game': return <Play className="h-3 w-3" />;
      case 'lesson': return <BookOpen className="h-3 w-3" />;
      default: return <Star className="h-3 w-3" />;
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
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const totalFamilyTime = childrenUsage.reduce((sum, child) => sum + child.totalTime, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          Content Usage
        </CardTitle>
        <CardDescription>
          {formatDuration(totalFamilyTime)} total learning time (last 30 days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {childrenUsage.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No children in your family yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {childrenUsage.map(child => (
              <div key={child.userId} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">
                    {child.firstName} {child.lastName}
                  </h4>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(child.totalTime)}
                  </Badge>
                </div>
                
                {child.interactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-4">
                    No activity recorded yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {child.interactions.map((interaction, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            {getContentTypeIcon(interaction.contentType)}
                            {interaction.contentType}
                          </Badge>
                          <span className="text-sm font-medium truncate max-w-[200px]">
                            {interaction.contentTitle}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{interaction.interactionCount}x played</span>
                          <span>{formatDuration(interaction.totalDuration)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
