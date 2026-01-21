import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ContentItemDialog } from '@/components/admin/ContentItemDialog';
import { cError } from '@/utils/conditionalLogger';

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
  approval_status: 'pending' | 'approved' | 'rejected' | null;
  is_active: boolean | null;
  created_at: string;
  platform: string | null;
  is_free: boolean | null;
  content_rating: string | null;
  tags: string[] | null;
  autism_features: Record<string, boolean> | null;
  content_categories?: {
    name: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
}

export default function AdminContent() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [itemsResult, categoriesResult] = await Promise.all([
        supabase
          .from('content_items')
          .select(`
            *,
            content_categories (name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('content_categories')
          .select('id, name')
          .eq('is_active', true)
          .order('sort_order')
      ]);

      if (itemsResult.error) {
        throw itemsResult.error;
      }
      if (categoriesResult.error) {
        throw categoriesResult.error;
      }

      setContentItems((itemsResult.data || []) as ContentItem[]);
      setCategories(categoriesResult.data || []);
    } catch (error) {
      cError('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load content items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content item?')) return;

    try {
      const { error } = await supabase
        .from('content_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContentItems(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Success",
        description: "Content item deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete content item",
        variant: "destructive"
      });
    }
  };

  const handleApprovalChange = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('content_items')
        .update({ 
          approval_status: status,
          approved_by: status === 'approved' ? (await supabase.auth.getUser()).data.user?.id : null
        })
        .eq('id', id);

      if (error) throw error;

      setContentItems(prev => 
        prev.map(item => 
          item.id === id 
            ? { ...item, approval_status: status }
            : item
        )
      );

      toast({
        title: "Success",
        description: `Content ${status} successfully`
      });
    } catch (error) {
      console.error('Error updating approval status:', error);
      toast({
        title: "Error",
        description: "Failed to update approval status",
        variant: "destructive"
      });
    }
  };

  const filteredItems = contentItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category_id === filterCategory;
    const matchesStatus = filterStatus === 'all' || item.approval_status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Content Management</h1>
        <Button onClick={() => {
          setSelectedItem(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Content
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{item.content_type}</Badge>
                    <Badge className={getStatusColor(item.approval_status ?? 'pending')}>
                      {item.approval_status ?? 'pending'}
                    </Badge>
                    <Badge variant="secondary">
                      {item.content_categories?.name ?? 'Uncategorized'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {item.description}
              </p>
              <div className="text-xs text-muted-foreground mb-4">
                Ages {item.age_min}-{item.age_max}
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(item.url, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedItem(item);
                      setDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {item.approval_status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprovalChange(item.id, 'approved')}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleApprovalChange(item.id, 'rejected')}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No content items found</p>
        </div>
      )}

      <ContentItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selectedItem}
        categories={categories}
        onSuccess={fetchData}
      />
    </div>
  );
}