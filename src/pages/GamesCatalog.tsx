import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Search, Play, Star, Shield, ShieldX, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ContentCard } from '@/components/games/ContentCard';
import { CategoryFilter } from '@/components/games/CategoryFilter';

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

interface Favorite {
  content_item_id: string;
}

export default function GamesCatalog() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [userFamily, setUserFamily] = useState<string | null>(null);
  const [isParent, setIsParent] = useState(false);
  const [showCuration, setShowCuration] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');
  const { user } = useAuth();
  const { toast } = useToast();

  // Function to handle realtime state updates
  const updateCatalogState = useCallback((prev: ContentItem[], payload: any) => {
    switch (payload.eventType) {
      case 'INSERT':
        if (payload.new.approval_status === 'approved' && payload.new.is_active) {
          return [...prev, payload.new];
        }
        return prev;
      case 'UPDATE':
        return prev.map(item => 
          item.id === payload.new.id ? payload.new : item
        ).filter(item => item.approval_status === 'approved' && item.is_active);
      case 'DELETE':
        return prev.filter(item => item.id !== payload.old.id);
      default:
        return prev;
    }
  }, []);

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
    fetchData();
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  // Phase 2: Family-Specific Realtime Channel Setup
  useEffect(() => {
    if (!userFamily) {
      // Fallback to global channel if no family
      const channel = supabase
        .channel('global-catalog-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'content_items',
          filter: 'is_active=eq.true'
        }, (payload) => {
          setContentItems(prev => updateCatalogState(prev, payload));
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'content_categories'
        }, () => {
          fetchData();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeConnected(true);
          } else if (status === 'CHANNEL_ERROR') {
            setRealtimeConnected(false);
            console.error('Realtime channel error');
          }
        });

      return () => {
        supabase.removeChannel(channel);
        setRealtimeConnected(false);
      };
    }

    // Family-specific channel subscription
    const channel = supabase
      .channel(`family-catalog-${userFamily}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_items'
      }, (payload) => {
        // RLS will filter content automatically
        setContentItems(prev => updateCatalogState(prev, payload));
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_categories'
      }, () => {
        fetchData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'family_content_access',
        filter: `family_id=eq.${userFamily}`
      }, () => {
        // Refresh when family content access changes
        fetchData();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          setRealtimeConnected(false);
          console.error('Family realtime channel error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setRealtimeConnected(false);
    };
  }, [updateCatalogState, userFamily]);

  const fetchData = useCallback(async () => {
    try {
      const [itemsResult, categoriesResult] = await Promise.all([
        supabase
          .from('content_items')
          .select(`
            *,
            content_categories (name, icon)
          `)
          .eq('approval_status', 'approved')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('content_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order')
      ]);

      if (itemsResult.error) throw itemsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      setContentItems(itemsResult.data || []);
      setCategories(categoriesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load content",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('content_favorites')
        .select('content_item_id')
        .eq('user_id', user.id);

      if (error) throw error;

      setFavorites(data?.map((fav: Favorite) => fav.content_item_id) || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  }, [user]);

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

        setFavorites(prev => prev.filter(id => id !== contentId));
      } else {
        const { error } = await supabase
          .from('content_favorites')
          .insert([{
            content_item_id: contentId,
            user_id: user.id
          }]);

        if (error) throw error;

        setFavorites(prev => [...prev, contentId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive"
      });
    }
  }, [user, favorites, toast]);

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
      fetchData();
    } catch (error) {
      console.error('Error updating content access:', error);
      toast({
        title: "Error",
        description: "Failed to update content access",
        variant: "destructive"
      });
    }
  }, [user, userFamily, isParent, toast, fetchData]);

  const filteredItems = contentItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    
    const matchesAge = ageFilter === 'all' || (
      ageFilter === '3-5' && item.age_min <= 5 && item.age_max >= 3
    ) || (
      ageFilter === '6-8' && item.age_min <= 8 && item.age_max >= 6
    ) || (
      ageFilter === '9-12' && item.age_min <= 12 && item.age_max >= 9
    ) || (
      ageFilter === '13+' && item.age_max >= 13
    );
    
    return matchesSearch && matchesCategory && matchesAge;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading content catalog...</p>
          {realtimeConnected && (
            <p className="text-xs text-green-600 mt-2">✓ Real-time updates enabled</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">
            🎮 Games & Activities Catalog
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover educational games, videos, and interactive content designed for children with autism and special needs
          </p>
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
          categories={categories}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              isFavorited={favorites.includes(item.id)}
              onFavorite={() => handleFavorite(item.id)}
              onClick={() => handleContentClick(item)}
              showCurationControls={showCuration && isParent}
              onContentCuration={handleContentCuration}
            />
          ))}
        </div>

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
  );
}