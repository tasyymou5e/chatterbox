import { useState } from 'react';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction 
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { cError } from '@/utils/wideLogger';

interface Family {
  id: string;
  family_code: string;
  display_name: string;
  name: string;
  member_count: number;
  metadata?: { is_test_family?: boolean; [key: string]: unknown } | null;
}

interface FamilyDeleteDialogProps {
  family: Family | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function FamilyDeleteDialog({ family, open, onOpenChange, onSuccess }: FamilyDeleteDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setConfirmationText('');
    }
    onOpenChange(isOpen);
  };

  const handleDelete = async () => {
    if (!family) return;

    if (confirmationText !== family.family_code) {
      toast({
        variant: 'destructive',
        title: 'Confirmation Failed',
        description: 'Please type the family code exactly to confirm deletion.'
      });
      return;
    }

    setLoading(true);
    try {
      const isTestFamily = family.metadata?.is_test_family === true;
      
      const { data, error } = await supabase.functions.invoke('delete-family-comprehensive', {
        body: { familyId: family.id, preserveUserAccounts: !isTestFamily }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (isTestFamily) {
        toast({
          title: 'Test Family Deleted',
          description: `Test family ${family.family_code} and all ${data.usersDeleted} user accounts have been completely removed.`
        });
      } else {
        toast({
          title: 'Family Deleted',
          description: `Family ${family.family_code} and all related data deleted. ${data.usersDeleted} user accounts preserved.`
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      cError('Error deleting family:', getErrorMessage(error));
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: getErrorMessage(error)
      });
    } finally {
      setLoading(false);
    }
  };

  if (!family) return null;

  const isTestFamily = family.metadata?.is_test_family === true;
  const isConfirmationValid = confirmationText === family.family_code;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="bg-card border-border text-card-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center text-xl text-destructive">
            <Trash2 className="h-5 w-5 mr-2" />
            Delete Family
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            <div className="space-y-3">
              <div className="flex items-start space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-destructive mb-1">This action cannot be undone!</p>
                  <p className="text-sm">
                    You are about to permanently delete {isTestFamily ? 'the test family' : 'the family'} <strong>{family.display_name}</strong> 
                    ({family.family_code}) and all of its {family.member_count} member(s).
                  </p>
                  {isTestFamily && (
                    <p className="text-sm mt-2 font-medium text-warning">
                      ⚠️ This is a test family - all user accounts will be permanently deleted.
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <p>The following will be permanently deleted:</p>
                <ul className="list-disc list-inside text-sm space-y-1 pl-4">
                  <li>Family record and all family data</li>
                  <li>All {family.member_count} family member relationships</li>
                  <li>All family activity logs and history</li>
                  <li>Any family-specific content interactions</li>
                  {isTestFamily ? (
                    <li className="text-warning font-medium">All {family.member_count} user accounts and profiles</li>
                  ) : (
                    <li className="text-secondary">User accounts will be preserved</li>
                  )}
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmation" className="text-muted-foreground">
                  Type <code className="bg-muted px-1 rounded">{family.family_code}</code> to confirm deletion:
                </Label>
                <Input
                  id="confirmation"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Enter family code"
                  className="bg-muted border-border text-foreground focus:border-destructive"
                  disabled={loading}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel 
            className="border-border text-muted-foreground hover:bg-muted"
            disabled={loading}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmationValid || loading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Family
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}