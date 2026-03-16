/**
 * ResultsImportPanel Component
 * 
 * @description Drag-and-drop file import for Playwright JSON results
 */

import { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileJson, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResultsImportPanelProps {
  onImport: (file: File) => Promise<void>;
  isLoading: boolean;
  lastImport?: { fileName: string; timestamp: string };
  error?: string | null;
}

export function ResultsImportPanel({
  onImport,
  isLoading,
  lastImport,
  error,
}: ResultsImportPanelProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.json')) {
        await onImport(file);
      }
    },
    [onImport]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await onImport(file);
      }
      // Reset input
      e.target.value = '';
    },
    [onImport]
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          Import Playwright Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            isLoading && 'opacity-50 pointer-events-none'
          )}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Parsing results...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Drag and drop your Playwright JSON report
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Or click to browse files
                </p>
              </div>
              <label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isLoading}
                />
                <Button variant="outline" size="sm" asChild>
                  <span>Select File</span>
                </Button>
              </label>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Last Import Info */}
        {lastImport && !error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>
              Last imported: <span className="font-medium">{lastImport.fileName}</span>
            </span>
            <span className="text-xs">
              ({new Date(lastImport.timestamp).toLocaleString()})
            </span>
          </div>
        )}

        {/* Help Text */}
        <p className="text-xs text-muted-foreground">
          Generate with: <code className="bg-muted px-1 py-0.5 rounded">npx playwright test --reporter=json</code>
        </p>
      </CardContent>
    </Card>
  );
}
