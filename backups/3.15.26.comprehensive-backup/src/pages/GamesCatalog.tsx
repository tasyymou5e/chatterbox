import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCatalogCache } from '@/hooks/useCatalogCache';
import { useCatalogRealtime } from '@/components/games/hooks/useCatalogRealtime';
import { CategoryFilter } from '@/components/games/CategoryFilter';
import { SiteHeader } from '@/components/SiteHeader';
import ErrorBoundary from '@/components/ErrorBoundary';
import { GamesCatalogDebugPanel } from '@/components/games/GamesCatalogDebugPanel';
import { GamesCatalogEmergencyNav } from '@/components/games/GamesCatalogEmergencyNav';
import { GamesCatalogSafeMode } from '@/components/games/GamesCatalogSafeMode';
import {
  CatalogHeader,
  CatalogSearchBar,
  CatalogContentGrid,
  CurationPanel
} from '@/components/games/catalog';
import type { CatalogContentItem, CurationAccessType } from '@/components/games/types/catalog';
import { cWarn, cError } from '@/utils/wideLogger';

export default function GamesCatalog() {
  const [userFamily, setUserFamily] = useState<string | null>(null);
  const [isParent, setIsParent] = useState(false);
  const [showCuration, setShowCuration] = useState(false);
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');
  const [safeMode, setSafeMode] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Phase 3: Use advanced caching strategy with error handling
  const {
    categories,
    contentItems,
    favorites,
    isLoading,
    invalidateContentCache,
    invalidateFavoritesCache,
    preloadPopularContent,
    resetAllCache,
    cacheStats
  } = useCatalogCache(userFamily || undefined);

  // Phase 3: Use extracted realtime hook
  const { realtimeConnected } = useCatalogRealtime({
    userId: user?.id,
    userFamily,
    invalidateContentCache
  });

  // Enhanced error handling for data loading
  useEffect(() => {
    if (!isLoading && contentItems.length === 0 && categories.length === 0) {
      cWarn('GamesCatalog: No data loaded after loading completed');
      setHasError(true);
    } else if (contentItems.length > 0 || categories.length > 0) {
      setHasError(false);
    }
  }, [isLoading, contentItems.length, categories.length]);

  // Get user's family and role on mount
  useEffect(() => {
    const getUserFamilyAndRole = async () => {
      if (!user) return;
      
      try {
        const [familyResult, roleResult] = await Promise.all([
          supabase
            .from('family_members')
            .select('family_id')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'parent')
            .single()
        ]);
        
        setUserFamily(familyResult.data?.family_id || null);
        setIsParent(!!roleResult.data);
      } catch (error) {
        cError('Error fetching user family/role:', error);
      }
    };
    
    getUserFamilyAndRole();
    
    // Phase 3: Preload popular content for better performance
    if (user) {
      preloadPopularContent();
    }
  }, [user, preloadPopularContent]);

  const handleFavorite = useCallback(async (contentId: string) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to save favorites",
        variant: "destructive"
      });
      return;
    }

    try {
      const isFavorited = favorites.includes(contentId);
      
      if (isFavorited) {
        const { error } = await supabase
          .from('content_favorites')
          .delete()
          .eq('content_item_id', contentId)
          .eq('user_id', user.id);

        if (error) throw error;
        invalidateFavoritesCache();
      } else {
        const { error } = await supabase
          .from('content_favorites')
          .insert([{
            content_item_id: contentId,
            user_id: user.id
          }]);

        if (error) throw error;
        invalidateFavoritesCache();
      }
    } catch (error) {
      cError('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive"
      });
    }
  }, [user, favorites, toast, invalidateFavoritesCache]);

  const handleContentClick = useCallback(async (item: CatalogContentItem) => {
    // Log the interaction
    if (user) {
      try {
        await supabase
          .from('content_interactions')
          .insert([{
            content_item_id: item.id,
            user_id: user.id,
            interaction_type: 'click',
            device_info: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language
            },
            metadata: {
              title: item.title,
              content_type: item.content_type,
              category: item.content_categories?.name
            }
          }]);
      } catch (error) {
        cError('Error logging interaction:', error);
      }
    }

    // Open the content
    window.open(item.url, '_blank', 'noopener,noreferrer');
  }, [user]);

  const handleContentCuration = useCallback(async (contentId: string, accessType: CurationAccessType) => {
    if (!user || !userFamily || !isParent) {
      toast({
        title: "Access denied",
        description: "Only parents can manage family content settings",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('family_content_access')
        .upsert({
          family_id: userFamily,
          content_item_id: contentId,
          access_type: accessType,
          added_by: user.id
        }, {
          onConflict: 'family_id,content_item_id'
        });

      if (error) throw error;

      toast({
        title: "Content updated",
        description: `Content ${accessType === 'blocked' ? 'blocked' : accessType === 'featured' ? 'featured' : 'allowed'} for your family`,
      });

      // Refresh data to reflect changes
      invalidateContentCache();
    } catch (error) {
      cError('Error updating content access:', error);
      toast({
        title: "Error",
        description: "Failed to update content access",
        variant: "destructive"
      });
    }
  }, [user, userFamily, isParent, toast, invalidateContentCache]);

  // Phase 3: Optimized filtering with memoization for large datasets
  const filteredItems = useMemo(() => {
    return contentItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
      
      // Handle null age values with defaults
      const ageMin = item.age_min ?? 0;
      const ageMax = item.age_max ?? 100;
      
      const matchesAge = ageFilter === 'all' || (
        ageFilter === '3-5' && ageMin <= 5 && ageMax >= 3
      ) || (
        ageFilter === '6-8' && ageMin <= 8 && ageMax >= 6
      ) || (
        ageFilter === '9-12' && ageMin <= 12 && ageMax >= 9
      ) || (
        ageFilter === '13+' && ageMax >= 13
      );
      
      return matchesSearch && matchesCategory && matchesAge;
    });
  }, [contentItems, searchTerm, selectedCategory, ageFilter]);

  // Phase 3: Automatically enable virtual scrolling for large datasets
  useEffect(() => {
    setUseVirtualScrolling(filteredItems.length > 100);
  }, [filteredItems.length]);

  // Emergency navigation handlers
  const handleRetry = useCallback(() => {
    setHasError(false);
    setSafeMode(false);
    invalidateContentCache();
    invalidateFavoritesCache();
    toast({
      title: "Retrying...",
      description: "Attempting to reload the catalog"
    });
  }, [invalidateContentCache, invalidateFavoritesCache, toast]);

  const handleSafeMode = useCallback(() => {
    setSafeMode(true);
    setHasError(false);
    toast({
      title: "Safe Mode Activated",
      description: "Loading simplified version of the catalog"
    });
  }, [toast]);

  const handleClearCache = useCallback(() => {
    resetAllCache();
    toast({
      title: "Cache Cleared",
      description: "All cached data has been cleared"
    });
  }, [resetAllCache, toast]);

  // Toggle handlers for header
  const handleToggleCuration = useCallback(() => {
    setShowCuration(prev => !prev);
  }, []);

  const handleToggleVirtualScrolling = useCallback(() => {
    setUseVirtualScrolling(prev => !prev);
  }, []);

  // If safe mode is enabled, render the safe mode component
  if (safeMode) {
    return <GamesCatalogSafeMode />;
  }

  // Enhanced loading state with emergency navigation
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <SiteHeader />
        <div className="container mx-auto px-4 py-20">
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Loading content catalog...</p>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              {realtimeConnected && (
                <p className="text-green-600">✓ {userFamily ? 'Family channel' : 'Global channel'} active</p>
              )}
              {isDevelopment && (
                <p>Cache stats: {JSON.stringify(cacheStats)}</p>
              )}
            </div>
          </div>
          
          {/* Emergency navigation during loading */}
          <div className="mt-8">
            <GamesCatalogEmergencyNav 
              onSafeMode={handleSafeMode}
              onClearCache={handleClearCache}
              showDebugOptions={isDevelopment}
            />
          </div>
        </div>
      </div>
    );
  }

  // Enhanced error state with multiple recovery options
  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <SiteHeader />
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2">Unable to Load Games Catalog</h2>
            <p className="text-muted-foreground">
              There seems to be an issue loading the full catalog. Try the options below.
            </p>
          </div>
          
          <GamesCatalogEmergencyNav 
            onRetry={handleRetry}
            onSafeMode={handleSafeMode}
            onClearCache={handleClearCache}
            showDebugOptions={isDevelopment}
          />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary componentName="GamesCatalog">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <SiteHeader />
        <div className="container mx-auto px-4 py-6 pt-20">

          {/* Debug Panel */}
          {isDevelopment && (
            <GamesCatalogDebugPanel
              isLoading={isLoading}
              contentItems={contentItems}
              categories={categories}
              favorites={favorites}
              userFamily={userFamily}
              isParent={isParent}
              realtimeConnected={realtimeConnected}
              cacheStats={cacheStats}
              onCacheReset={resetAllCache}
              onForceRefresh={handleRetry}
            />
          )}

          {/* Emergency Navigation (always available) */}
          <div className="mb-4">
            <GamesCatalogEmergencyNav 
              onRetry={handleRetry}
              onSafeMode={handleSafeMode}
              onClearCache={handleClearCache}
              showDebugOptions={isDevelopment}
            />
          </div>

          {/* Header */}
          <CatalogHeader
            isAuthenticated={!!user}
            realtimeConnected={realtimeConnected}
            userFamily={userFamily}
            isParent={isParent}
            showCuration={showCuration}
            onToggleCuration={handleToggleCuration}
            useVirtualScrolling={useVirtualScrolling}
            onToggleVirtualScrolling={handleToggleVirtualScrolling}
            isDevelopment={isDevelopment}
          />

          {/* Search and Filters */}
          <CatalogSearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            ageFilter={ageFilter}
            onAgeFilterChange={setAgeFilter}
          />

          {/* Category Filter */}
          <CategoryFilter
            categories={categories.map(c => ({ ...c, icon: c.icon || 'Circle', description: c.description || '' }))}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          {/* Content Curation Panel */}
          <CurationPanel isVisible={showCuration && isParent} />

          {/* Content Grid */}
          <CatalogContentGrid
            items={filteredItems}
            favorites={favorites}
            onFavorite={handleFavorite}
            onContentClick={handleContentClick}
            showCurationControls={showCuration && isParent}
            onContentCuration={handleContentCuration}
            useVirtualScrolling={useVirtualScrolling}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
