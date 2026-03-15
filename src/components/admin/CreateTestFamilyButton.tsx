import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import CreateTestFamilyDialog from './CreateTestFamilyDialog';
import { cLog } from '@/utils/wideLogger';

interface CreateTestFamilyButtonProps {
  onSuccess?: () => void;
}

export default function CreateTestFamilyButton({ onSuccess }: CreateTestFamilyButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    cLog('[CreateTestFamilyButton] Dialog state change:', { open });
    setDialogOpen(open);
  };

  const handleButtonClick = () => {
    cLog('[CreateTestFamilyButton] Button clicked, opening dialog');
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    cLog('[CreateTestFamilyButton] Creation successful, calling onSuccess');
    onSuccess?.();
  };

  return (
    <>
      <Button
        onClick={handleButtonClick}
        className="w-full justify-start text-sm text-primary hover:text-primary-hover bg-primary/5 hover:bg-primary/10 border-0"
        variant="outline"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Test Family
      </Button>
      
      <CreateTestFamilyDialog
        open={dialogOpen}
        onOpenChange={handleOpenChange}
        {...(onSuccess !== undefined ? { onSuccess: handleSuccess } : {})}
      />
    </>
  );
}