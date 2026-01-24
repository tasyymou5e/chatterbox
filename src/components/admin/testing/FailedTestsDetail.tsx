/**
 * FailedTestsDetail Component
 * 
 * @description Expandable panel showing failed test error details
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  XCircle, 
  ChevronDown, 
  ChevronRight, 
  FileCode, 
  Clock,
  RotateCcw,
  Copy,
  Check
} from 'lucide-react';
import { formatDuration } from '@/utils/playwrightResultsParser';
import type { FailedTestDetail } from '@/types/testCoverage';

interface FailedTestsDetailProps {
  tests: FailedTestDetail[];
}

function FailedTestItem({ test }: { test: FailedTestDetail }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyError = async () => {
    const textToCopy = test.stack || test.error;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors">
          <div className="mt-0.5">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-destructive" />
            ) : (
              <ChevronRight className="h-4 w-4 text-destructive" />
            )}
          </div>
          <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{test.title}</div>
            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1">
                <FileCode className="h-3 w-3" />
                {test.file}:{test.line}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(test.duration)}
              </span>
              {test.retries > 0 && (
                <Badge variant="outline" className="text-xs py-0">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  {test.retries} retries
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="mt-2 ml-7 space-y-3">
          {/* Full Title */}
          <div className="text-xs">
            <span className="text-muted-foreground">Full path: </span>
            <span className="font-mono">{test.fullTitle}</span>
          </div>
          
          {/* Error Message */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-destructive-foreground">Error:</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleCopyError}
              >
                {copied ? (
                  <Check className="h-3 w-3 mr-1" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <ScrollArea className="h-auto max-h-[200px]">
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto font-mono whitespace-pre-wrap break-all">
                {test.error}
              </pre>
            </ScrollArea>
          </div>

          {/* Stack Trace */}
          {test.stack && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Stack Trace:</span>
              <ScrollArea className="h-auto max-h-[300px]">
                <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-x-auto font-mono whitespace-pre-wrap break-all text-muted-foreground">
                  {test.stack}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function FailedTestsDetail({ tests }: FailedTestsDetailProps) {
  if (tests.length === 0) return null;

  return (
    <Card className="bg-card border-border border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-destructive">
          <XCircle className="h-5 w-5" />
          Failed Tests ({tests.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tests.map((test) => (
          <FailedTestItem key={test.testId} test={test} />
        ))}
      </CardContent>
    </Card>
  );
}
