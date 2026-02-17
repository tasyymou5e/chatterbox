import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cError } from '@/utils/conditionalLogger';
import { getErrorMessage } from '@/types/interfaces';
import { 
  AlertTriangle,
  Trash2,
  X
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  roles: string[];
  families: { family_code: string; display_name: string }[];
}

interface UserDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}

export function UserDeleteDialog({ open, onOpenChange, user, onSuccess }: UserDeleteDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!user) return null;

  const expectedConfirmation = `DELETE ${user.email}`;
  const canDelete = confirmationText === expectedConfirmation && confirmDeletion;

  const handleDelete = async () => {
    if (!canDelete) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: user.id, userEmail: user.email }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'User Deleted',
        description: `User has been permanently deleted. Auth account ${data?.deletedRecords?.authUser ? 'removed' : 'could not be removed'}.`
      });
      
      onSuccess();
      onOpenChange(false);
      
      // Reset form state
      setConfirmationText('');
      setConfirmDeletion(false);
    } catch (error: unknown) {
      cError('Error deleting user', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(error)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setConfirmationText('');
    setConfirmDeletion(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Delete User Account
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            This action cannot be undone. This will permanently delete the user account and all associated data.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Warning Alert */}
            <Alert className="border-red-800 bg-red-900/20">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                <strong>Warning:</strong> This will permanently delete:
                <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                  <li>User profile and personal information</li>
                  <li>All assigned roles ({user.roles.join(', ') || 'none'})</li>
                  <li>Family memberships ({user.families.length} families)</li>
                  <li>All activity logs and related data</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* User Information */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">User to be deleted:</h4>
              <div className="text-sm text-gray-300 space-y-1">
                <p><span className="font-medium">Name:</span> {user.first_name} {user.last_name}</p>
                <p><span className="font-medium">Email:</span> {user.email}</p>
                <p><span className="font-medium">Roles:</span> {user.roles.join(', ') || 'None'}</p>
                <p><span className="font-medium">Families:</span> {user.families.length}</p>
              </div>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-2">
              <Label htmlFor="confirmation" className="text-gray-300">
                Type <code className="bg-gray-700 px-1 rounded">{expectedConfirmation}</code> to confirm:
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white font-mono"
                placeholder={expectedConfirmation}
                disabled={loading}
              />
            </div>

            {/* Final Confirmation Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm-deletion"
                checked={confirmDeletion}
                onCheckedChange={(checked) => setConfirmDeletion(checked === true)}
                disabled={loading}
                className="border-red-600"
              />
              <Label 
                htmlFor="confirm-deletion" 
                className="text-sm text-gray-300 cursor-pointer"
              >
                I understand that this action is permanent and cannot be undone
              </Label>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {loading ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}