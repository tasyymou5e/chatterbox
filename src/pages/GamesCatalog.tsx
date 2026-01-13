import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Shield, ShieldX, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCatalogCache } from '@/hooks/useCatalogCache';
import { realtimeManager } from '@/services/RealtimeManager';
import { ContentCard } from '@/components/games/ContentCard';
import { CategoryFilter } from '@/components/games/CategoryFilter';
import { VirtualizedContentGrid } from '@/components/games/VirtualizedContentGrid';
import { SiteHeader } from '@/components/SiteHeader';
import ErrorBoundary from '@/components/ErrorBoundary';
import { GamesCatalogDebugPanel } from '@/components/games/GamesCatalogDebugPanel';
import { GamesCatalogEmergencyNav } from '@/components/games/GamesCatalogEmergencyNav';
import { GamesCatalogSafeMode } from '@/components/games/GamesCatalogSafeMode';

// ContentItem type matching useCatalogCache (with null-able properties)
interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  category_id: string | null;
  url: string;
  thumbnail_url: string | null;
  age_min: number | null;
  age_max: number | null;
  autism_features: any;
  tags: string[] | null;
  is_free: boolean | null;
  content_categories?: {
    name: string;
    icon: string | null;
  } | null;
}

export default function GamesCatalog() {
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [userFamily, setUserFamily] = useState<string | null>(null);
  const [isParent, setIsParent] = useState(false);
  const [showCuration, setShowCuration] = useState(false);
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');
  const [safeMode, setSafeMode] = useState(false);
  const [_showDebugPanel] = useState(process.env.NODE_ENV === 'development');
  void _showDebugPanel; // Used for conditional rendering
  const [hasError, setHasError] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

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

  // Enhanced error handling for data loading
  useEffect(() => {
    if (!isLoading && contentItems.length === 0 && categories.length === 0) {
      console.warn('GamesCatalog: No data loaded after loading completed');
      setHasError(true);
    } else if (contentItems.length > 0 || categories.length > 0) {
      setHasError(false);
    }
  }, [isLoading, contentItems.length, categories.length]);
  // Phase 3: Optimized realtime state updates
  const updateCatalogState = useCallback((payload: any) => {
    console.log('GamesCatalog: Received realtime update:', payload.eventType);
    
    switch (payload.eventType) {
      case 'INSERT':
        if (payload.new.approval_status === 'approved' && payload.new.is_active) {
          invalidateContentCache();
        }
        break;
      case 'UPDATE':
        if (payload.new.approval_status === 'approved' && payload.new.is_active) {
          invalidateContentCache();
        }
        break;
      case 'DELETE':
        invalidateContentCache();
        break;
    }
  }, [invalidateContentCache]);

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
        console.error('Error fetching user family/role:', error);
      }
    };
    
    getUserFamilyAndRole();
    
    // Phase 3: Preload popular content for better performance
    if (user) {
      preloadPopularContent();
    }
  }, [user, preloadPopularContent]);

  // Phase 3: Optimized Realtime with Connection Pooling
  useEffect(() => {
    if (!user) return;

    let unsubscribeContent: (() => void) | undefined;
    let unsubscribeCategories: (() => void) | undefined;
    let unsubscribeFamilyAccess: (() => void) | undefined;

    if (userFamily) {
      // Family-specific subscriptions
      console.log(`Setting up family realtime for family: ${userFamily}`);
      
      unsubscribeContent = realtimeManager.subscribeFamilyChannel(
        userFamily,
        'content_items',
        updateCatalogState
      );

      unsubscribeCategories = realtimeManager.subscribeFamilyChannel(
        userFamily,
        'content_categories',
        () => invalidateContentCache()
      );

      unsubscribeFamilyAccess = realtimeManager.subscribeFamilyChannel(
        userFamily,
        'family_content_access',
        () => invalidateContentCache(),
        `family_id=eq.${userFamily}`
      );

      setRealtimeConnected(true);
    } else {
      // Global subscriptions for users without families
      console.log('Setting up global realtime channels');
      
      unsubscribeContent = realtimeManager.subscribeGlobalChannel(
        'content_items',
        updateCatalogState,
        'is_active=eq.true'
      );

      unsubscribeCategories = realtimeManager.subscribeGlobalChannel(
        'content_categories',
        () => invalidateContentCache()
      );

      setRealtimeConnected(true);
    }

    // Cleanup function
    return () => {
      console.log('Cleaning up realtime subscriptions');
      unsubscribeContent?.();
      unsubscribeCategories?.();
      unsubscribeFamilyAccess?.();
      setRealtimeConnected(false);
    };
  }, [user, userFamily, updateCatalogState, invalidateContentCache]);

  // Note: Data fetching is now handled by useCatalogCache hook

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
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive"
      });
    }
  }, [user, favorites, toast, invalidateFavoritesCache]);

  const handleContentClick = useCallback(async (item: ContentItem) => {
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
        console.error('Error logging interaction:', error);
      }
    }

    // Open the content
    window.open(item.url, '_blank', 'noopener,noreferrer');
  }, [user, userFamily]);

  const handleContentCuration = useCallback(async (contentId: string, accessType: 'allowed' | 'blocked' | 'featured') => {
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
      console.error('Error updating content access:', error);
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
              {process.env.NODE_ENV === 'development' && (
                <p>Cache stats: {JSON.stringify(cacheStats)}</p>
              )}
            </div>
          </div>
          
          {/* Emergency navigation during loading */}
          <div className="mt-8">
            <GamesCatalogEmergencyNav 
              onSafeMode={handleSafeMode}
              onClearCache={handleClearCache}
              showDebugOptions={process.env.NODE_ENV === 'development'}
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
            showDebugOptions={process.env.NODE_ENV === 'development'}
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
        {_showDebugPanel && (
          <GamesCatalogDebugPanel
            isLoading={isLoading}
            contentItems={contentItems as any[]}
            categories={categories as any[]}
            favorites={favorites as string[]}
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
            showDebugOptions={process.env.NODE_ENV === 'development'}
          />
        </div>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">
            🎮 Games & Activities Catalog
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover educational games, videos, and interactive content designed for children with autism and special needs
          </p>
          
          {/* Authentication Status */}
          {!user && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mt-4 max-w-md mx-auto">
              <p className="text-sm">
                <strong>Sign in</strong> to access full content details, save favorites, and unlock family-specific activities.
              </p>
            </div>
          )}
          
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {realtimeConnected && (
              <div className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">
                ✓ {userFamily ? 'Family channel' : 'Global channel'} active
              </div>
            )}
            {userFamily && (
              <div className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                👨‍👩‍👧‍👦 Family content enabled
              </div>
            )}
            {isParent && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCuration(!showCuration)}
                className="text-xs"
              >
                {showCuration ? 'Hide' : 'Show'} Content Management
              </Button>
            )}
            {process.env.NODE_ENV === 'development' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUseVirtualScrolling(!useVirtualScrolling)}
                className="text-xs"
              >
                {useVirtualScrolling ? 'Disable' : 'Enable'} Virtual Scrolling
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search games, videos, and activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-lg"
              />
            </div>
            <Select value={ageFilter} onValueChange={setAgeFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Age Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value="3-5">Ages 3-5</SelectItem>
                <SelectItem value="6-8">Ages 6-8</SelectItem>
                <SelectItem value="9-12">Ages 9-12</SelectItem>
                <SelectItem value="13+">Ages 13+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Category Filter */}
        <CategoryFilter
          categories={categories.map(c => ({ ...c, icon: c.icon || 'Circle', description: c.description || '' }))}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {/* Content Grid */}
        {showCuration && isParent && (
          <div className="mb-8">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Family Content Management Active
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Use the controls on each content card to manage what your family can access.
                </p>
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Feature: Highlight for family
                  </Badge>
                  <Badge variant="outline" className="bg-green-100 text-green-700">
                    <Shield className="h-3 w-3 mr-1" />
                    Allow: Normal access
                  </Badge>
                  <Badge variant="outline" className="bg-red-100 text-red-700">
                    <ShieldX className="h-3 w-3 mr-1" />
                    Block: Hide from family
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!useVirtualScrolling ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <ContentCard
                key={item.id}
                item={item as any}
                isFavorited={(favorites as string[]).includes(item.id)}
                onFavorite={() => handleFavorite(item.id)}
                onClick={() => handleContentClick(item)}
                showCurationControls={showCuration && isParent}
                onContentCuration={handleContentCuration}
              />
            ))}
          </div>
        ) : (
          <VirtualizedContentGrid
            items={filteredItems as any[]}
            favorites={favorites as string[]}
            onFavorite={handleFavorite}
            onContentClick={handleContentClick}
            showCurationControls={showCuration && isParent}
            onContentCuration={handleContentCuration}
          />
        )}

        {/* No Results */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No content found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
        </div>
      </div>
    </ErrorBoundary>
  );
}