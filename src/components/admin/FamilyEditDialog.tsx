import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Edit, Save, X } from 'lucide-react';

interface Family {
  id: string;
  family_code: string;
  display_name: string;
  name: string;
  created_at: string;
  created_by: string;
  member_count: number;
}

interface FamilyEditDialogProps {
  family: Family | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function FamilyEditDialog({ family, open, onOpenChange, onSuccess }: FamilyEditDialogProps) {
  const [displayName, setDisplayName] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Update local state when family changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && family) {
      setDisplayName(family.display_name);
      setName(family.name);
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!family) return;

    if (!displayName.trim() || !name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Both display name and family name are required.'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('families')
        .update({
          display_name: displayName.trim(),
          name: name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', family.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Family details updated successfully.'
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating family:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update family details.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!family) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Edit className="h-5 w-5 mr-2 text-green-400" />
            Edit Family Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="display-name" className="text-gray-300">Display Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Enter family display name"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="family-name" className="text-gray-300">Family Name</Label>
              <Input
                id="family-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Enter family name"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="family-code" className="text-gray-300">Family Code</Label>
              <Input
                id="family-code"
                value={family?.family_code || ''}
                className="bg-gray-600 border-gray-500 text-gray-400"
                placeholder="Family code"
                disabled
                readOnly
              />
              <p className="text-xs text-gray-400 mt-1">
                Family code cannot be changed
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !displayName.trim() || !name.trim()}
            className="bg-green-600 hover:bg-green-500 text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}