/**
 * RunTestsPanel Component
 * 
 * @description Panel with CLI commands to run E2E tests locally
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Copy, 
  Check, 
  Terminal,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getTestCommand } from '@/hooks/useAuthE2ECoverage';
import type { TestSuite } from '@/types/testCoverage';

interface RunTestsPanelProps {
  suites: TestSuite[];
}

export function RunTestsPanel({ suites }: RunTestsPanelProps) {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [selectedSuites, setSelectedSuites] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const copyToClipboard = async (command: string, label: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommand(label);
      toast({
        title: 'Copied to clipboard',
        description: `${label} command copied successfully`,
      });
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please copy the command manually',
        variant: 'destructive',
      });
    }
  };

  const toggleSuite = (suiteId: string) => {
    setSelectedSuites(prev => {
      const next = new Set(prev);
      if (next.has(suiteId)) {
        next.delete(suiteId);
      } else {
        next.add(suiteId);
      }
      return next;
    });
  };

  const allTestsCommand = getTestCommand();
  const selectedCommand = getTestCommand(Array.from(selectedSuites));

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Run E2E Tests
        </CardTitle>
        <CardDescription>
          Copy commands to run authentication E2E tests locally with Playwright
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Run All Tests */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Run All Auth Tests</h4>
            <Badge variant="secondary">162 tests</Badge>
          </div>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {allTestsCommand}
            </pre>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(allTestsCommand, 'All tests')}
            >
              {copiedCommand === 'All tests' ? (
        <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Select Specific Suites */}
        <div className="space-y-3">
          <h4 className="font-medium">Or Select Specific Suites</h4>
          <div className="flex flex-wrap gap-2">
            {suites.map((suite) => (
              <Button
                key={suite.id}
                variant={selectedSuites.has(suite.id) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSuite(suite.id)}
              >
                {suite.name}
                <Badge variant="secondary" className="ml-2">
                  {suite.testCount}
                </Badge>
              </Button>
            ))}
          </div>

          {selectedSuites.size > 0 && (
            <div className="relative mt-3">
              <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto">
                {selectedCommand}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(selectedCommand, 'Selected tests')}
              >
                {copiedCommand === 'Selected tests' ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Quick Commands */}
        <div className="space-y-3">
          <h4 className="font-medium">Quick Commands</h4>
          <div className="grid gap-2 md:grid-cols-2">
            <QuickCommand
              label="Run with UI"
              command="npx playwright test --ui"
              copiedCommand={copiedCommand}
              onCopy={copyToClipboard}
            />
            <QuickCommand
              label="Run headed"
              command="npx playwright test --headed"
              copiedCommand={copiedCommand}
              onCopy={copyToClipboard}
            />
            <QuickCommand
              label="Debug mode"
              command="npx playwright test --debug"
              copiedCommand={copiedCommand}
              onCopy={copyToClipboard}
            />
            <QuickCommand
              label="Generate report"
              command="npx playwright show-report"
              copiedCommand={copiedCommand}
              onCopy={copyToClipboard}
            />
          </div>
        </div>

        {/* Documentation Link */}
        <div className="pt-4 border-t border-border">
          <Button variant="outline" size="sm" asChild>
            <a 
              href="https://playwright.dev/docs/running-tests" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Playwright Documentation
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickCommandProps {
  label: string;
  command: string;
  copiedCommand: string | null;
  onCopy: (command: string, label: string) => void;
}

function QuickCommand({ label, command, copiedCommand, onCopy }: QuickCommandProps) {
  return (
    <div className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-lg">
      <div className="flex items-center gap-2">
        <Play className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-7"
        onClick={() => onCopy(command, label)}
      >
        {copiedCommand === label ? (
          <Check className="h-3 w-3 text-primary" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
