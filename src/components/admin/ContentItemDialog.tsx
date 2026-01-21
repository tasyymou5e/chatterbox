import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/getErrorMessage';
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
  approval_status: string | null;
  is_active: boolean | null;
  platform: string | null;
  is_free: boolean | null;
  content_rating: string | null;
  tags: string[] | null;
  autism_features: Record<string, boolean> | null;
}

interface Category {
  id: string;
  name: string;
}

interface ContentItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ContentItem | null;
  categories: Category[];
  onSuccess: () => void;
}

export function ContentItemDialog({ open, onOpenChange, item, categories, onSuccess }: ContentItemDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'game',
    category_id: '',
    url: '',
    thumbnail_url: '',
    age_min: 3,
    age_max: 18,
    platform: 'web',
    is_free: true,
    content_rating: 'E',
    tags: '',
    sensory_friendly: false,
    non_verbal_friendly: false,
    executive_function: false,
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title,
        description: item.description || '',
        content_type: item.content_type,
        category_id: item.category_id || '',
        url: item.url,
        thumbnail_url: item.thumbnail_url || '',
        age_min: item.age_min ?? 3,
        age_max: item.age_max ?? 18,
        platform: item.platform || '',
        is_free: item.is_free ?? true,
        content_rating: item.content_rating || 'E',
        tags: item.tags?.join(', ') || '',
        sensory_friendly: item.autism_features?.sensory_friendly || false,
        non_verbal_friendly: item.autism_features?.non_verbal_friendly || false,
        executive_function: item.autism_features?.executive_function || false,
        is_active: item.is_active ?? true
      });
    } else {
      // Reset form for new item
      setFormData({
        title: '',
        description: '',
        content_type: 'game',
        category_id: '',
        url: '',
        thumbnail_url: '',
        age_min: 3,
        age_max: 18,
        platform: 'web',
        is_free: true,
        content_rating: 'E',
        tags: '',
        sensory_friendly: false,
        non_verbal_friendly: false,
        executive_function: false,
        is_active: true
      });
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const autismFeatures = {
        sensory_friendly: formData.sensory_friendly,
        non_verbal_friendly: formData.non_verbal_friendly,
        executive_function: formData.executive_function
      };

      const contentData = {
        title: formData.title,
        description: formData.description,
        content_type: formData.content_type as 'game' | 'video' | 'website' | 'app',
        category_id: formData.category_id,
        url: formData.url,
        thumbnail_url: formData.thumbnail_url || null,
        age_min: formData.age_min,
        age_max: formData.age_max,
        platform: formData.platform,
        is_free: formData.is_free,
        content_rating: formData.content_rating,
        tags: tagsArray,
        autism_features: autismFeatures,
        is_active: formData.is_active,
        created_by: user.data.user.id,
        approval_status: (item ? item.approval_status : 'pending') as 'pending' | 'approved' | 'rejected'
      };

      let result;
      if (item) {
        result = await supabase
          .from('content_items')
          .update(contentData)
          .eq('id', item.id);
      } else {
        result = await supabase
          .from('content_items')
          .insert([contentData]);
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Content item ${item ? 'updated' : 'created'} successfully`
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error saving content item:', getErrorMessage(error));
      toast({
        title: "Error",
        description: `Failed to ${item ? 'update' : 'create'} content item: ${getErrorMessage(error)}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Edit Content Item' : 'Add New Content Item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="content_type">Content Type *</Label>
              <Select
                value={formData.content_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, content_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="game">Game</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="app">App</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={formData.platform}
                onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="iOS">iOS</SelectItem>
                  <SelectItem value="Android">Android</SelectItem>
                  <SelectItem value="all">All Platforms</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
            <Input
              id="thumbnail_url"
              type="url"
              value={formData.thumbnail_url}
              onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="age_min">Min Age</Label>
              <Input
                id="age_min"
                type="number"
                min="0"
                max="18"
                value={formData.age_min}
                onChange={(e) => setFormData(prev => ({ ...prev, age_min: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="age_max">Max Age</Label>
              <Input
                id="age_max"
                type="number"
                min="0"
                max="18"
                value={formData.age_max}
                onChange={(e) => setFormData(prev => ({ ...prev, age_max: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="content_rating">Rating</Label>
              <Select
                value={formData.content_rating}
                onValueChange={(value) => setFormData(prev => ({ ...prev, content_rating: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="E">Everyone</SelectItem>
                  <SelectItem value="E10+">Everyone 10+</SelectItem>
                  <SelectItem value="T">Teen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="is_free"
                checked={formData.is_free}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_free: checked }))}
              />
              <Label htmlFor="is_free">Free</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="educational, puzzle, memory"
            />
          </div>

          <div className="space-y-3">
            <Label>Autism-Specific Features</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="sensory_friendly"
                  checked={formData.sensory_friendly}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sensory_friendly: checked }))}
                />
                <Label htmlFor="sensory_friendly">Sensory Friendly</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="non_verbal_friendly"
                  checked={formData.non_verbal_friendly}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, non_verbal_friendly: checked }))}
                />
                <Label htmlFor="non_verbal_friendly">Non-Verbal Friendly</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="executive_function"
                  checked={formData.executive_function}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, executive_function: checked }))}
                />
                <Label htmlFor="executive_function">Executive Function</Label>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (item ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}