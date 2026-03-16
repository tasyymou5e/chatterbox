/**
 * RunHistorySelector Component
 * 
 * @description Dropdown to view and manage past test run imports
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  History, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  FileJson
} from 'lucide-react';
import { formatDuration } from '@/utils/playwrightResultsParser';
import type { ParsedTestRun } from '@/types/testCoverage';

interface RunHistorySelectorProps {
  history: ParsedTestRun[];
  currentRunId?: string;
  onSelectRun: (id: string) => void;
  onDeleteRun: (id: string) => void;
  onClearAll: () => void;
}

export function RunHistorySelector({
  history,
  currentRunId,
  onSelectRun,
  onDeleteRun,
  onClearAll,
}: RunHistorySelectorProps) {
  if (history.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Run History
          </CardTitle>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all run history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all {history.length} saved test runs. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onClearAll} className="bg-destructive text-destructive-foreground">
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-auto max-h-[300px]">
          <div className="space-y-2">
            {history.map((run) => {
              const passRate = run.stats.total > 0 
                ? Math.round((run.stats.passed / run.stats.total) * 100) 
                : 0;
              const isActive = run.id === currentRunId;

              return (
                <div
                  key={run.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    isActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => onSelectRun(run.id)}
                >
                  <FileJson className="h-4 w-4 text-muted-foreground shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{run.fileName}</span>
                      {isActive && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                      <span>{new Date(run.importedAt).toLocaleString()}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(run.stats.duration)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      <span>{run.stats.passed}</span>
                    </div>
                    {run.stats.failed > 0 && (
                      <div className="flex items-center gap-1 text-xs">
                        <XCircle className="h-3 w-3 text-destructive" />
                        <span>{run.stats.failed}</span>
                      </div>
                    )}
                    <Badge 
                      variant={passRate === 100 ? 'default' : passRate >= 80 ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {passRate}%
                    </Badge>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="Delete test run"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRun(run.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
