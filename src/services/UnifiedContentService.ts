/**
 * UnifiedContentService - Central service for fetching all child content
 */

import { supabase } from '@/integrations/supabase/client';
import type { KidContentItem, ContentType, AgeGroup, ContentQueryOptions, AccessLevel } from '@/types/kidsPortal';
import type { AutismFeatures } from '@/types/autism';

class UnifiedContentServiceClass {
  async getAllContentForChild(
    childId: string,
    familyId: string,
    options: ContentQueryOptions = {}
  ): Promise<KidContentItem[]> {
    const { contentType, ageGroup, onlyFavorites, limit = 50, offset = 0 } = options;
    const results: KidContentItem[] = [];

    if (!contentType || contentType === 'game') {
      const games = await this.getGamesForChild(childId, familyId, ageGroup);
      results.push(...games);
    }

    if (!contentType || contentType === 'chore') {
      const chores = await this.getChoresForChild(childId);
      results.push(...chores);
    }

    if (!contentType || contentType === 'task') {
      const assignedGames = await this.getAssignedGamesForChild(childId, familyId);
      // Mark assigned games and add any not already in results
      const existingIds = new Set(results.map(r => r.id));
      for (const game of assignedGames) {
        if (!existingIds.has(game.id)) {
          results.push(game);
        }
      }
    }

    const filtered = onlyFavorites ? results.filter(item => item.isFavorite) : results;
    return filtered.slice(offset, offset + limit);
  }

  async getGamesForChild(
    childId: string,
    familyId: string,
    ageGroup?: AgeGroup | 'all'
  ): Promise<KidContentItem[]> {
    try {
      // Fetch all data in parallel for better performance
      const [contentResult, accessResult, prefsResult] = await Promise.all([
        supabase
          .from('content_items')
          .select(`
            id, title, description, url, thumbnail_url, content_type,
            age_min, age_max, autism_features, category_id,
            content_categories ( id, name )
          `)
          .eq('is_active', true)
          .order('title'),
        supabase
          .from('family_content_access')
          .select('content_item_id, access_type')
          .eq('family_id', familyId),
        supabase
          .from('child_content_preferences')
          .select('*')
          .eq('child_id', childId)
          .eq('content_type', 'game'),
      ]);

      if (contentResult.error) throw contentResult.error;

      const contentItems = contentResult.data;
      const accessData = accessResult.data;
      const prefsData = prefsResult.data;

      const accessMap = new Map<string, AccessLevel>();
      accessData?.forEach(a => accessMap.set(a.content_item_id, a.access_type as AccessLevel));

      const prefsMap = new Map();
      prefsData?.forEach(p => prefsMap.set(p.content_id, p));

      const games: KidContentItem[] = (contentItems || [])
        .filter(item => {
          const access = accessMap.get(item.id);
          if (access === 'blocked') return false;
          if (ageGroup && ageGroup !== 'all') {
            const itemAgeGroup = this.getAgeGroup(item.age_min, item.age_max);
            if (!itemAgeGroup.includes(ageGroup)) return false;
          }
          return true;
        })
        .map(item => {
          const prefs = prefsMap.get(item.id);
          const access = accessMap.get(item.id) || 'allowed';
          return {
            id: item.id,
            type: 'game' as ContentType,
            title: item.title,
            description: item.description || '',
            ageGroup: this.getAgeGroup(item.age_min, item.age_max),
            familyAccess: access as AccessLevel,
            autismFeatures: item.autism_features as AutismFeatures | undefined,
            thumbnailUrl: item.thumbnail_url || undefined,
            launchUrl: item.url || undefined,
            categoryId: item.category_id || undefined,
            categoryName: (item.content_categories as { name: string } | null)?.name,
            isFavorite: prefs?.is_favorite || false,
            lastPlayedAt: prefs?.last_played_at || undefined,
            playCount: prefs?.play_count || 0,
            bestScore: prefs?.best_score || undefined,
          };
        });

      return games;
    } catch (error) {
      console.error('Error fetching games:', error);
      return [];
    }
  }

  async getChoresForChild(childId: string): Promise<KidContentItem[]> {
    try {
      const { data: assignments, error } = await supabase
        .from('chore_assignments')
        .select(`id, status, due_date, chores ( id, title, description, points, estimated_duration, difficulty, autism_friendly_features )`)
        .eq('child_id', childId)
        .in('status', ['assigned', 'in_progress'])
        .order('due_date');

      if (error) throw error;

      return (assignments || []).map(assignment => {
        const chore = assignment.chores as { id: string; title: string; description: string | null; points: number; estimated_duration: number | null; difficulty: string | null; autism_friendly_features: Record<string, boolean> | null; } | null;
        if (!chore) return null;
        return {
          id: assignment.id,
          type: 'chore' as ContentType,
          title: chore.title,
          description: chore.description || 'Complete this task!',
          ageGroup: ['3-5', '6-8', '9-12', '13+'] as AgeGroup[],
          familyAccess: 'allowed' as AccessLevel,
          autismFeatures: chore.autism_friendly_features as AutismFeatures | undefined,
          estimatedDuration: chore.estimated_duration || undefined,
          difficultyLevel: (chore.difficulty as 'easy' | 'medium' | 'hard') || undefined,
          completionPercentage: assignment.status === 'in_progress' ? 50 : 0,
        };
      }).filter(Boolean) as KidContentItem[];
    } catch (error) {
      console.error('Error fetching chores:', error);
      return [];
    }
  }

  /**
   * Get games that have been specifically assigned to a child by a parent
   */
  async getAssignedGamesForChild(childId: string, familyId: string): Promise<KidContentItem[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: assignments, error } = await (supabase.rpc as any)('get_child_game_assignments', {
        p_child_id: childId,
        p_family_id: familyId,
      }) as { data: { content_item_id: string; is_required: boolean; difficulty_override: string | null; due_date: string | null }[] | null; error: { code?: string; message?: string } | null };

      if (error) {
        console.error('Error fetching assigned games:', error);
        return [];
      }

      if (!assignments || assignments.length === 0) return [];

      // Fetch the actual content items for these assignments
      const contentIds = assignments.map(a => a.content_item_id);
      const { data: contentItems, error: contentError } = await supabase
        .from('content_items')
        .select(`
          id, title, description, url, thumbnail_url, content_type,
          age_min, age_max, autism_features, category_id,
          content_categories ( id, name )
        `)
        .in('id', contentIds);

      if (contentError) throw contentError;

      const assignmentMap = new Map(assignments.map(a => [a.content_item_id, a]));

      return (contentItems || []).map(item => {
        const assignment = assignmentMap.get(item.id);
        return {
          id: item.id,
          type: 'task' as ContentType, // Show as task since it's assigned
          title: item.title,
          description: item.description || '',
          ageGroup: this.getAgeGroup(item.age_min, item.age_max),
          familyAccess: 'featured' as AccessLevel, // Assigned games are featured
          autismFeatures: item.autism_features as AutismFeatures | undefined,
          thumbnailUrl: item.thumbnail_url || undefined,
          launchUrl: item.url || undefined,
          categoryId: item.category_id || undefined,
          categoryName: (item.content_categories as { name: string } | null)?.name,
          difficultyLevel: (assignment?.difficulty_override as 'easy' | 'medium' | 'hard') || undefined,
          // Mark as assigned
          isFavorite: assignment?.is_required || false,
        };
      });
    } catch (error) {
      console.error('Error fetching assigned games:', error);
      return [];
    }
  }

  async toggleFavorite(childId: string, contentId: string, contentType: ContentType): Promise<boolean> {
    try {
      const { data: existing } = await supabase
        .from('child_content_preferences')
        .select('id, is_favorite')
        .eq('child_id', childId)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .single();

      if (existing) {
        await supabase.from('child_content_preferences').update({ is_favorite: !existing.is_favorite }).eq('id', existing.id);
        return !existing.is_favorite;
      } else {
        await supabase.from('child_content_preferences').insert({ child_id: childId, content_id: contentId, content_type: contentType, is_favorite: true });
        return true;
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }
  }

  async recordInteraction(childId: string, contentId: string, contentType: ContentType): Promise<void> {
    try {
      const { data: existing } = await supabase
        .from('child_content_preferences')
        .select('id, play_count')
        .eq('child_id', childId)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .single();

      if (existing) {
        await supabase.from('child_content_preferences').update({ play_count: (existing.play_count || 0) + 1, last_played_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await supabase.from('child_content_preferences').insert({ child_id: childId, content_id: contentId, content_type: contentType, play_count: 1, last_played_at: new Date().toISOString() });
      }
    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  }

  private getAgeGroup(minAge?: number | null, maxAge?: number | null): AgeGroup[] {
    const groups: AgeGroup[] = [];
    const min = minAge || 0;
    const max = maxAge || 99;
    if (min <= 5 && max >= 3) groups.push('3-5');
    if (min <= 8 && max >= 6) groups.push('6-8');
    if (min <= 12 && max >= 9) groups.push('9-12');
    if (max >= 13) groups.push('13+');
    return groups.length > 0 ? groups : ['3-5', '6-8', '9-12', '13+'];
  }
}

export const UnifiedContentService = new UnifiedContentServiceClass();
export default UnifiedContentService;
