import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cacheManager } from '@/utils/CacheManager';
import { useAuth } from './useAuth';

interface ContentItem {
  id: string;
  title: string;
  description: string;
  content_type: string;
  category_id: string;
  url: string;
  thumbnail_url: string;
  age_min: number;
  age_max: number;
  autism_features: any;
  tags: string[];
  is_free: boolean;
  content_categories?: {
    name: string;
    icon: string;
  };
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const useCatalogCache = (userFamily?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch family content with optimized caching and error handling
  const fetchFamilyContent = async (familyId?: string): Promise<ContentItem[]> => {
    try {
      const cacheKey = `content_items_family_${familyId || 'global'}`;
      
      // Try cache first
      const cached = cacheManager.get<ContentItem[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch from database
      // Check authentication status for appropriate field selection
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('content_items')
        .select(`
          *,
          content_categories (name, icon)
        `)
        .eq('approval_status', 'approved')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.warn('Error fetching content items:', error);
        // If authentication error, provide helpful context
        if (error.code === 'PGRST116' || error.message.includes('auth')) {
          console.warn('Authentication may be required for full content access');
        }
        return []; // Return empty array instead of throwing
      }

      const contentItems = data || [];
      
      // Cache the results with 5 minute TTL
      cacheManager.set(cacheKey, contentItems, { ttl: 5 * 60 * 1000 });
      
      return contentItems;
    } catch (error) {
      console.error('Fetch family content error:', error);
      return []; // Graceful fallback
    }
  };

  // Cache categories with longer TTL (they rarely change)
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['content_categories'],
    queryFn: async () => {
      try {
        const cacheKey = 'content_categories';
        
        // Try cache first
        const cached = cacheManager.get<Category[]>(cacheKey);
        if (cached) {
          return cached;
        }

        const { data, error } = await supabase
          .from('content_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');

        if (error) {
          console.warn('Error fetching categories:', error);
          return []; // Return empty array instead of throwing
        }

        const categoryData = data || [];
        
        // Cache categories for 30 minutes (they change rarely)
        cacheManager.set(cacheKey, categoryData, { ttl: 30 * 60 * 1000 });
        
        return categoryData;
      } catch (error) {
        console.error('Fetch categories error:', error);
        return []; // Graceful fallback
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes (renamed from cacheTime)
    refetchOnWindowFocus: false
  });

  // Cache content items with shorter TTL and family awareness
  const { data: contentItems, isLoading: contentLoading, refetch: refetchContent } = useQuery<ContentItem[]>({
    queryKey: ['content_items', userFamily || 'global'],
    queryFn: () => fetchFamilyContent(userFamily),
    staleTime: 2 * 60 * 1000,   // 2 minutes
    gcTime: 10 * 60 * 1000,     // 10 minutes (renamed from cacheTime)
    refetchOnWindowFocus: false,
    enabled: true // Always enable, don't depend on user auth
  });

  // Cache user favorites with error handling
  const { data: favorites, isLoading: favoritesLoading } = useQuery<string[]>({
    queryKey: ['user_favorites', user?.id || 'guest'],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const cacheKey = `favorites_${user.id}`;
        
        // Try cache first
        const cached = cacheManager.get<string[]>(cacheKey);
        if (cached) {
          return cached;
        }

        const { data, error } = await supabase
          .from('content_favorites')
          .select('content_item_id')
          .eq('user_id', user.id);

        if (error) {
          console.warn('Error fetching favorites:', error);
          return []; // Return empty array instead of throwing
        }

        const favoriteIds = data?.map((fav) => fav.content_item_id) || [];
        
        // Cache favorites for 5 minutes
        cacheManager.set(cacheKey, favoriteIds, { ttl: 5 * 60 * 1000 });
        
        return favoriteIds;
      } catch (error) {
        console.error('Fetch favorites error:', error);
        return []; // Graceful fallback
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user
  });

  // Invalidate cache functions with better error handling
  const invalidateContentCache = () => {
    try {
      const cacheKey = `content_items_family_${userFamily || 'global'}`;
      cacheManager.delete(cacheKey);
      queryClient.invalidateQueries({ queryKey: ['content_items'] });
    } catch (error) {
      console.error('Error invalidating content cache:', error);
    }
  };

  const invalidateCategoriesCache = () => {
    try {
      cacheManager.delete('content_categories');
      queryClient.invalidateQueries({ queryKey: ['content_categories'] });
    } catch (error) {
      console.error('Error invalidating categories cache:', error);
    }
  };

  const invalidateFavoritesCache = () => {
    try {
      if (user) {
        const cacheKey = `favorites_${user.id}`;
        cacheManager.delete(cacheKey);
        queryClient.invalidateQueries({ queryKey: ['user_favorites', user.id] });
      }
    } catch (error) {
      console.error('Error invalidating favorites cache:', error);
    }
  };

  // Performance optimization: preload popular content with error handling
  const preloadPopularContent = async () => {
    try {
      const { data } = await supabase.rpc('get_popular_content');
      if (data) {
        cacheManager.set('popular_content', data, { ttl: 15 * 60 * 1000 }); // 15 minutes
      }
    } catch (error) {
      // Silent fail - this is just a performance optimization
      console.warn('Failed to preload popular content:', error);
    }
  };

  // Cache reset strategy for when things go wrong
  const resetAllCache = () => {
    try {
      cacheManager.clear();
      queryClient.invalidateQueries();
    } catch (error) {
      console.error('Error resetting cache:', error);
    }
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
    resetAllCache, // New function for emergency cache reset
    cacheStats: (() => {
      try {
        return cacheManager.getStats();
      } catch (error) {
        console.error('Error getting cache stats:', error);
        return { size: 0, hits: 0, misses: 0 };
      }
    })()
  };
};