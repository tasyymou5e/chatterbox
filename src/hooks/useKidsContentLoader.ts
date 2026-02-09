/**
 * useKidsContentLoader - React hook for loading unified content
 * Combines games, chores, and activities with caching and real-time updates
 * Uses RealtimeManager for connection pooling and reconnection handling
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UnifiedContentService } from '@/services/UnifiedContentService';
import { realtimeManager } from '@/services/RealtimeManager';
import type { KidContentItem, ContentType, AgeGroup, ContentQueryOptions } from '@/types/kidsPortal';

interface UseKidsContentLoaderOptions {
  childId: string | undefined;
  familyId: string | undefined;
  contentType?: ContentType;
  ageGroup?: AgeGroup | 'all';
  onlyFavorites?: boolean;
}

interface UseKidsContentLoaderResult {
  content: KidContentItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  toggleFavorite: (item: KidContentItem) => Promise<void>;
  recordLaunch: (item: KidContentItem) => Promise<void>;
  contentCounts: Record<AgeGroup | 'all', number>;
}

export function useKidsContentLoader({
  childId,
  familyId,
  contentType,
  ageGroup = 'all',
  onlyFavorites = false
}: UseKidsContentLoaderOptions): UseKidsContentLoaderResult {
  const queryClient = useQueryClient();

  // Build query options
  const queryOptions: ContentQueryOptions = useMemo(() => ({
    contentType,
    ageGroup,
    onlyFavorites,
    limit: 100
  }), [contentType, ageGroup, onlyFavorites]);

  // Main content query
  const {
    data: content = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['kids-content', childId, familyId, queryOptions],
    queryFn: async () => {
      if (!childId || !familyId) return [];
      return UnifiedContentService.getAllContentForChild(childId, familyId, queryOptions);
    },
    enabled: !!childId && !!familyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Calculate content counts per age group
  const contentCounts = useMemo(() => {
    const counts: Record<AgeGroup | 'all', number> = {
      'all': content.length,
      '3-5': 0,
      '6-8': 0,
      '9-12': 0,
      '13+': 0
    };

    content.forEach(item => {
      item.ageGroup.forEach(ag => {
        counts[ag] = (counts[ag] || 0) + 1;
      });
    });

    return counts;
  }, [content]);

  // Toggle favorite handler
  const toggleFavorite = useCallback(async (item: KidContentItem) => {
    if (!childId) return;

    const newFavoriteState = await UnifiedContentService.toggleFavorite(
      childId,
      item.id,
      item.type
    );

    // Optimistically update the cache
    queryClient.setQueryData<KidContentItem[]>(
      ['kids-content', childId, familyId, queryOptions],
      (old) => old?.map(c => 
        c.id === item.id ? { ...c, isFavorite: newFavoriteState } : c
      )
    );
  }, [childId, familyId, queryOptions, queryClient]);

  // Record launch handler
  const recordLaunch = useCallback(async (item: KidContentItem) => {
    if (!childId) return;

    await UnifiedContentService.recordInteraction(
      childId,
      item.id,
      item.type
    );

    // Optimistically update play count
    queryClient.setQueryData<KidContentItem[]>(
      ['kids-content', childId, familyId, queryOptions],
      (old) => old?.map(c => 
        c.id === item.id 
          ? { 
              ...c, 
              playCount: (c.playCount || 0) + 1,
              lastPlayedAt: new Date().toISOString()
            } 
          : c
      )
    );
  }, [childId, familyId, queryOptions, queryClient]);

  // Real-time subscription for content updates using RealtimeManager
  // This provides connection pooling, subscriber deduplication, and reconnection handling
  useEffect(() => {
    if (!childId || !familyId) return;

    // Subscribe to preference changes via RealtimeManager (pooled connection)
    const unsubscribePreferences = realtimeManager.subscribeFamilyChannel(
      familyId,
      'child_content_preferences',
      () => refetch(),
      `child_id=eq.${childId}`
    );

    // Subscribe to chore assignment changes via RealtimeManager (pooled connection)
    const unsubscribeChores = realtimeManager.subscribeFamilyChannel(
      familyId,
      'chore_assignments',
      () => refetch(),
      `assigned_to=eq.${childId}`
    );

    return () => {
      unsubscribePreferences();
      unsubscribeChores();
    };
  }, [childId, familyId, refetch]);

  return {
    content,
    isLoading,
    error: error as Error | null,
    refetch,
    toggleFavorite,
    recordLaunch,
    contentCounts
  };
}

export default useKidsContentLoader;
