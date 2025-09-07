// Phase 3: Multi-level Caching Strategy
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

  // Fetch family content with optimized caching
  const fetchFamilyContent = async (familyId?: string): Promise<ContentItem[]> => {
    const cacheKey = `content_items_family_${familyId || 'global'}`;
    
    // Try cache first
    const cached = cacheManager.get<ContentItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('content_items')
      .select(`
        *,
        content_categories (name, icon)
      `)
      .eq('approval_status', 'approved')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;

    const contentItems = data || [];
    
    // Cache the results with 5 minute TTL
    cacheManager.set(cacheKey, contentItems, { ttl: 5 * 60 * 1000 });
    
    return contentItems;
  };

  // Cache categories with longer TTL (they rarely change)
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['content_categories'],
    queryFn: async () => {
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

      if (error) throw error;

      const categoryData = data || [];
      
      // Cache categories for 30 minutes (they change rarely)
      cacheManager.set(cacheKey, categoryData, { ttl: 30 * 60 * 1000 });
      
      return categoryData;
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
    enabled: !!user // Only fetch when user is authenticated
  });

  // Cache user favorites
  const { data: favorites, isLoading: favoritesLoading } = useQuery<string[]>({
    queryKey: ['user_favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
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

      if (error) throw error;

      const favoriteIds = data?.map((fav) => fav.content_item_id) || [];
      
      // Cache favorites for 5 minutes
      cacheManager.set(cacheKey, favoriteIds, { ttl: 5 * 60 * 1000 });
      
      return favoriteIds;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user
  });

  // Invalidate cache functions
  const invalidateContentCache = () => {
    const cacheKey = `content_items_family_${userFamily || 'global'}`;
    cacheManager.delete(cacheKey);
    queryClient.invalidateQueries({ queryKey: ['content_items'] });
  };

  const invalidateCategoriesCache = () => {
    cacheManager.delete('content_categories');
    queryClient.invalidateQueries({ queryKey: ['content_categories'] });
  };

  const invalidateFavoritesCache = () => {
    if (user) {
      const cacheKey = `favorites_${user.id}`;
      cacheManager.delete(cacheKey);
      queryClient.invalidateQueries({ queryKey: ['user_favorites', user.id] });
    }
  };

  // Performance optimization: preload popular content
  const preloadPopularContent = async () => {
    try {
      const { data } = await supabase.rpc('get_popular_content');
      if (data) {
        cacheManager.set('popular_content', data, { ttl: 15 * 60 * 1000 }); // 15 minutes
      }
    } catch (error) {
      // Silent fail in production
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
    cacheStats: cacheManager.getStats()
  };
};