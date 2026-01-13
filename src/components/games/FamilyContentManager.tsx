import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, ShieldX, Sparkles, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContentAccess {
  id: string;
  family_id: string;
  content_item_id: string;
  access_type: 'allowed' | 'blocked' | 'featured';
  added_by: string;
  created_at: string;
  content_items: {
    title: string;
    description: string;
    content_type: string;
    thumbnail_url: string;
  };
}

interface FamilyContentManagerProps {
  familyId: string;
  onClose: () => void;
}

export function FamilyContentManager({ familyId, onClose }: FamilyContentManagerProps) {
  const [contentAccess, setContentAccess] = useState<ContentAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchContentAccess();
  }, [familyId]);

  const fetchContentAccess = async () => {
    try {
      const { data, error } = await supabase
        .from('family_content_access')
        .select(`
          *,
          content_items (
            title,
            description,
            content_type,
            thumbnail_url,
            url,
            is_free
          )
        `)
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContentAccess((data as ContentAccess[]) || []);
    } catch (error) {
      console.error('Error fetching content access:', error);
      toast({
        title: "Error",
        description: "Failed to load content management settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateContentAccess = async (contentId: string, newAccessType: 'allowed' | 'blocked' | 'featured') => {
    try {
      const { error } = await supabase
        .from('family_content_access')
        .update({ access_type: newAccessType })
        .eq('family_id', familyId)
        .eq('content_item_id', contentId);

      if (error) throw error;

      setContentAccess(prev => 
        prev.map(item => 
          item.content_item_id === contentId 
            ? { ...item, access_type: newAccessType }
            : item
        )
      );

      toast({
        title: "Updated",
        description: `Content access changed to ${newAccessType}`,
      });
    } catch (error) {
      console.error('Error updating content access:', error);
      toast({
        title: "Error",
        description: "Failed to update content access",
        variant: "destructive"
      });
    }
  };

  const removeContentAccess = async (contentId: string) => {
    try {
      const { error } = await supabase
        .from('family_content_access')
        .delete()
        .eq('family_id', familyId)
        .eq('content_item_id', contentId);

      if (error) throw error;

      setContentAccess(prev => 
        prev.filter(item => item.content_item_id !== contentId)
      );

      toast({
        title: "Removed",
        description: "Content removed from family management",
      });
    } catch (error) {
      console.error('Error removing content access:', error);
      toast({
        title: "Error",
        description: "Failed to remove content access",
        variant: "destructive"
      });
    }
  };

  const getAccessIcon = (accessType: string) => {
    switch (accessType) {
      case 'featured': return <Sparkles className="h-4 w-4 text-yellow-500" />;
      case 'blocked': return <ShieldX className="h-4 w-4 text-red-500" />;
      case 'allowed': return <Shield className="h-4 w-4 text-green-500" />;
      default: return <Eye className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAccessColor = (accessType: string) => {
    switch (accessType) {
      case 'featured': return 'bg-yellow-100 text-yellow-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      case 'allowed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredContent = (type: string) => 
    contentAccess.filter(item => item.access_type === type);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading content management...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Family Content Management
          </CardTitle>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="featured" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="featured" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Featured ({filteredContent('featured').length})
            </TabsTrigger>
            <TabsTrigger value="allowed" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Allowed ({filteredContent('allowed').length})
            </TabsTrigger>
            <TabsTrigger value="blocked" className="flex items-center gap-2">
              <ShieldX className="h-4 w-4" />
              Blocked ({filteredContent('blocked').length})
            </TabsTrigger>
          </TabsList>

          {['featured', 'allowed', 'blocked'].map(type => (
            <TabsContent key={type} value={type} className="mt-6">
              <div className="grid gap-4">
                {filteredContent(type).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No {type} content found
                  </div>
                ) : (
                  filteredContent(type).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                          {item.content_items.thumbnail_url ? (
                            <img
                              src={item.content_items.thumbnail_url}
                              alt={item.content_items.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              📄
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{item.content_items.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {item.content_items.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {item.content_items.content_type}
                            </Badge>
                            <Badge className={`text-xs ${getAccessColor(item.access_type)}`}>
                              {getAccessIcon(item.access_type)}
                              <span className="ml-1 capitalize">{item.access_type}</span>
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        {item.access_type !== 'featured' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateContentAccess(item.content_item_id, 'featured')}
                          >
                            <Sparkles className="h-3 w-3" />
                          </Button>
                        )}
                        {item.access_type !== 'allowed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateContentAccess(item.content_item_id, 'allowed')}
                          >
                            <Shield className="h-3 w-3" />
                          </Button>
                        )}
                        {item.access_type !== 'blocked' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateContentAccess(item.content_item_id, 'blocked')}
                          >
                            <ShieldX className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeContentAccess(item.content_item_id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}