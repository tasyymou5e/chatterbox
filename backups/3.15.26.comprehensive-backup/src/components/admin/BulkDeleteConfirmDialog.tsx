import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Trash2, X, CheckCircle, XCircle } from 'lucide-react';

export interface BulkDeleteItem {
  id: string;
  label: string;
  metadata?: Record<string, unknown>;
}

interface BulkDeleteResult {
  id: string;
  label: string;
  success: boolean;
  error?: string;
}

interface BulkDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: BulkDeleteItem[];
  itemType: 'users' | 'families';
  onExecuteDelete: (item: BulkDeleteItem) => Promise<void>;
  onComplete: () => void;
  warningLines?: string[];
}

type Phase = 'confirm' | 'deleting' | 'results';

export function BulkDeleteConfirmDialog({
  open,
  onOpenChange,
  items,
  itemType,
  onExecuteDelete,
  onComplete,
  warningLines,
}: BulkDeleteConfirmDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [phase, setPhase] = useState<Phase>('confirm');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BulkDeleteResult[]>([]);

  const count = items.length;
  const expectedText = `DELETE ${count} ${itemType.toUpperCase()}`;
  const canProceed = confirmationText === expectedText && confirmed;

  const reset = useCallback(() => {
    setConfirmationText('');
    setConfirmed(false);
    setPhase('confirm');
    setProgress(0);
    setResults([]);
  }, []);

  const handleClose = () => {
    if (phase === 'deleting') return;
    reset();
    onOpenChange(false);
  };

  const handleExecute = async () => {
    if (!canProceed) return;
    setPhase('deleting');
    const deleteResults: BulkDeleteResult[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        await onExecuteDelete(item);
        deleteResults.push({ id: item.id, label: item.label, success: true });
      } catch (err: unknown) {
        deleteResults.push({
          id: item.id,
          label: item.label,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
      setProgress(i + 1);
      setResults([...deleteResults]);
    }

    setPhase('results');
  };

  const handleDone = () => {
    reset();
    onOpenChange(false);
    onComplete();
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Bulk Delete {count} {itemType === 'users' ? 'User' : 'Familie'}{count !== 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {phase === 'confirm' && 'This action cannot be undone.'}
            {phase === 'deleting' && `Deleting ${progress} of ${count}...`}
            {phase === 'results' && `Completed: ${successCount} succeeded, ${failCount} failed.`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {/* Confirm phase */}
          {phase === 'confirm' && (
            <div className="space-y-4">
              <Alert className="border-red-800 bg-red-900/20">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  <strong>Warning:</strong> You are about to permanently delete {count} {itemType}.
                  {warningLines && warningLines.length > 0 && (
                    <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                      {warningLines.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>

              <div className="bg-gray-700 rounded-lg p-3 max-h-32 overflow-y-auto">
                <p className="text-xs text-gray-400 mb-2">Selected {itemType}:</p>
                {items.map((item) => (
                  <div key={item.id} className="text-sm text-gray-300 py-0.5 truncate">
                    • {item.label}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">
                  Type <code className="bg-gray-700 px-1 rounded">{expectedText}</code> to confirm:
                </Label>
                <Input
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white font-mono"
                  placeholder={expectedText}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bulk-confirm"
                  checked={confirmed}
                  onCheckedChange={(c) => setConfirmed(c === true)}
                  className="border-red-600"
                />
                <Label htmlFor="bulk-confirm" className="text-sm text-gray-300 cursor-pointer">
                  I understand this action is permanent and cannot be undone
                </Label>
              </div>
            </div>
          )}

          {/* Deleting phase */}
          {phase === 'deleting' && (
            <div className="space-y-4 py-4">
              <Progress value={(progress / count) * 100} className="h-3" />
              <p className="text-center text-gray-300">
                Deleting {progress} of {count} {itemType}...
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {results.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    {r.success ? (
                      <CheckCircle className="h-3 w-3 text-green-400 shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-400 shrink-0" />
                    )}
                    <span className="text-gray-300 truncate">{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results phase */}
          {phase === 'results' && (
            <div className="space-y-4 py-4">
              <div className="flex gap-4 justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{successCount}</div>
                  <div className="text-xs text-gray-400">Deleted</div>
                </div>
                {failCount > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{failCount}</div>
                    <div className="text-xs text-gray-400">Failed</div>
                  </div>
                )}
              </div>
              {failCount > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-sm text-red-400 font-medium">Failed items:</p>
                  {results
                    .filter((r) => !r.success)
                    .map((r) => (
                      <div key={r.id} className="text-sm text-gray-300">
                        <XCircle className="h-3 w-3 text-red-400 inline mr-1" />
                        {r.label}: {r.error}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          {phase === 'confirm' && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleExecute}
                disabled={!canProceed}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {count} {itemType}
              </Button>
            </>
          )}
          {phase === 'results' && (
            <Button onClick={handleDone} className="bg-blue-600 hover:bg-blue-700 text-white">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
