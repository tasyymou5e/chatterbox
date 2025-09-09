import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SiteHeader } from '@/components/SiteHeader';
import { Search, ExternalLink, Home, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface ContentItem {
  id: string;
  title: string;
  description: string;
  url: string;
  content_type: string;
  tags: string[];
  is_free: boolean;
}

export const GamesCatalogSafeMode: React.FC = () => {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadBasicContent();
  }, []);

  const loadBasicContent = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simple query without complex joins or filters
      const { data, error } = await supabase
        .from('content_items')
        .select('id, title, description, url, content_type, tags, is_free')
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .limit(50)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setContentItems(data || []);
      console.log('Safe Mode: Loaded', data?.length || 0, 'content items');
    } catch (error) {
      console.error('Safe Mode: Error loading content:', error);
      setError(error instanceof Error ? error.message : 'Failed to load content');
      toast({
        title: "Loading Error",
        description: "Failed to load content in safe mode. Check your connection.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = contentItems.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleContentClick = (item: ContentItem) => {
    window.open(item.url, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto px-4 py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading content in safe mode...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-20">
        {/* Safe Mode Banner */}
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-800">Safe Mode Active</h3>
            </div>
            <p className="text-yellow-700 text-sm mb-3">
              The catalog is running in simplified mode with reduced features for better stability.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={loadBasicContent}>
                Retry Loading
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/">
                  <Home className="h-3 w-3 mr-1" />
                  Go Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            🎮 Games & Activities
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Educational content for children with autism and special needs
          </p>
        </div>

        {/* Simple Search */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Error: {error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Simple Content Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="truncate">{item.title}</span>
                  <Badge variant={item.is_free ? "secondary" : "default"}>
                    {item.is_free ? 'Free' : 'Premium'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{item.content_type}</Badge>
                  <Button
                    size="sm"
                    onClick={() => handleContentClick(item)}
                    className="gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredItems.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No content found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try a different search term' : 'No content available right now'}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          Showing {filteredItems.length} of {contentItems.length} items
        </div>
      </div>
    </div>
  );
};