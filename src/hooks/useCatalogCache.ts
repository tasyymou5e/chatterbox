import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { CatalogContentItem, CatalogCategory } from '@/components/games/types/catalog';

/**
 * useCatalogCache - Unified caching for catalog content using React Query
 * 
 * This hook relies solely on React Query's built-in caching mechanism.
 * No manual cache layer is needed - React Query handles:
 * - Stale time management
 * - Garbage collection
 * - Background refetching
 * - Cache invalidation
 */
export const useCatalogCache = (userFamily?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch family content with optimized error handling
  const fetchFamilyContent = async (_familyId?: string): Promise<CatalogContentItem[]> => {
    try {
      const { data, error } = await supabase
        .from('content_items')
        .select(`
          id, title, description, url, content_type, category_id, skill_levels, age_min, age_max, thumbnail_url, is_active, is_free, platform, tags, autism_features, approval_status, sort_order, content_rating,
          content_categories (name, icon)
        `)
        .eq('approval_status', 'approved')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.warn('Error fetching content items:', error);
        if (error.code === 'PGRST116' || error.message.includes('auth')) {
          console.warn('Authentication may be required for full content access');
        }
        return [];
      }

      return (data || []) as unknown as CatalogContentItem[];
    } catch (error) {
      console.error('Fetch family content error:', error);
      return [];
    }
  };

  // Cache categories with longer TTL (they rarely change)
  const { data: categories } = useQuery<CatalogCategory[]>({
    queryKey: ['content_categories'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('content_categories')
          .select('id, name, description, icon, is_active, sort_order')
          .eq('is_active', true)
          .order('sort_order');

        if (error) {
          console.warn('Error fetching categories:', error);
          return [];
        }

        return (data || []) as unknown as CatalogCategory[];
      } catch (error) {
        console.error('Fetch categories error:', error);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes
    refetchOnWindowFocus: false
  });

  // Cache content items with shorter TTL and family awareness
  const { data: contentItems, isLoading: contentLoading, refetch: refetchContent } = useQuery<CatalogContentItem[]>({
    queryKey: ['content_items', userFamily || 'global'],
    queryFn: () => fetchFamilyContent(userFamily),
    staleTime: 2 * 60 * 1000,   // 2 minutes
    gcTime: 10 * 60 * 1000,     // 10 minutes
    refetchOnWindowFocus: false,
    enabled: true
  });

  // Cache user favorites with error handling
  const { data: favorites, isLoading: favoritesLoading } = useQuery<string[]>({
    queryKey: ['user_favorites', user?.id || 'guest'],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const { data, error } = await supabase
          .from('content_favorites')
          .select('content_item_id')
          .eq('user_id', user.id);

        if (error) {
          console.warn('Error fetching favorites:', error);
          return [];
        }

        return (data?.map((fav) => fav.content_item_id) || [])
          .filter((id): id is string => id !== null);
      } catch (error) {
        console.error('Fetch favorites error:', error);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user
  });

  // Invalidate cache functions - now just React Query invalidation
  const invalidateContentCache = () => {
    queryClient.invalidateQueries({ queryKey: ['content_items'] });
  };

  const invalidateCategoriesCache = () => {
    queryClient.invalidateQueries({ queryKey: ['content_categories'] });
  };

  const invalidateFavoritesCache = () => {
    if (user) {
      queryClient.invalidateQueries({ queryKey: ['user_favorites', user.id] });
    }
  };

  // Performance optimization: preload popular content using React Query's prefetch
  const preloadPopularContent = async () => {
    try {
      await queryClient.prefetchQuery({
        queryKey: ['popular_content'],
        queryFn: async () => {
          const { data } = await supabase.rpc('get_popular_content');
          return data;
        },
        staleTime: 15 * 60 * 1000 // 15 minutes
      });
    } catch (error) {
      // Silent fail - this is just a performance optimization
      console.warn('Failed to preload popular content:', error);
    }
  };

  // Cache reset strategy using React Query
  const resetAllCache = () => {
    queryClient.invalidateQueries();
  };

  return {
    categories: categories || [],
    contentItems: contentItems || [],
    favorites: favorites || [],
    isLoading: contentLoading || favoritesLoading,
    refetchContent,
    invalidateContentCache,
    invalidateCategoriesCache,
    invalidateFavoritesCache,
    preloadPopularContent,
    resetAllCache,
    cacheStats: {
      // React Query cache stats mapped to CatalogCacheStats interface
      memoryItems: queryClient.getQueryCache().getAll().length,
      totalSize: queryClient.getQueryCache().getAll().length,
      size: queryClient.getQueryCache().getAll().length,
      hits: 0, // React Query doesn't expose hit/miss stats directly
      misses: 0
    }
  };
};
