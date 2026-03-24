import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { invokeEdgeFunction } from '@/utils/secureEdgeFunctionInvoke';
import { cLog, cError } from '@/utils/wideLogger';

interface QuickCreateTestFamilyButtonProps {
  onSuccess?: () => void;
}

const PRESET_FAMILY = {
  displayName: 'Test Family',
  parent1: {
    firstName: 'Test',
    lastName: 'Parent',
    email: 'testparent-850682@testfamily.com',
  },
  parent2: null,
  children: [
    { firstName: 'Test Kid', lastName: 'One', email: 'testkid1-850682@testfamily.com' },
    { firstName: 'Test Kid', lastName: 'Two', email: 'testkid2-850682@testfamily.com' },
  ],
  cleanupFirst: false,
  forceUniqueEmails: false,
  customPassword: 'notmypassword22',
};

export default function QuickCreateTestFamilyButton({ onSuccess }: QuickCreateTestFamilyButtonProps) {
  const [loading, setLoading] = useState(false);
  const { user, session } = useAdminAuth();
  const { toast } = useToast();

  const handleClick = async () => {
    if (!user?.id || !session) {
      toast({ variant: 'destructive', title: 'Session expired', description: 'Please log in again.' });
      return;
    }

    setLoading(true);
    cLog('[QuickCreateTestFamily] Creating preset TEST-850682 family...');

    try {
      const { data, error } = await invokeEdgeFunction('create-test-family', {
        ...PRESET_FAMILY,
        createdBy: user.id,
      });

      if (error) throw error;

      if (data?.success) {
        cLog('[QuickCreateTestFamily] Success', { familyCode: data.familyCode, members: data.membersCreated });
        toast({
          title: 'Test family created',
          description: `Family TEST-850682 created with ${data.membersCreated} members. Password: notmypassword22`,
        });
        onSuccess?.();
      } else {
        throw new Error(data?.error || 'Creation failed');
      }
    } catch (err) {
      cError('[QuickCreateTestFamily] Failed:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to create test family',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className="w-full justify-start text-sm text-amber-600 hover:text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 border-0"
      variant="outline"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Zap className="h-4 w-4 mr-2" />
      )}
      Quick Create TEST-850682 Family
    </Button>
  );
}
