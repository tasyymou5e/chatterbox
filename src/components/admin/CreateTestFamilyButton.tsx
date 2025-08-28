import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Plus } from 'lucide-react';
import CreateTestFamilyDialog from './CreateTestFamilyDialog';

interface CreateTestFamilyButtonProps {
  onSuccess?: () => void;
}

export default function CreateTestFamilyButton({ onSuccess }: CreateTestFamilyButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        className="w-full justify-start text-sm text-primary hover:text-primary-hover bg-primary/5 hover:bg-primary/10 border-0"
        variant="outline"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Test Family
      </Button>
      
      <CreateTestFamilyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={onSuccess}
      />
    </>
  );
}