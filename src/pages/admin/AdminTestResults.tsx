import { TestResultsDashboard } from '@/components/admin/testing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const commands = [
  { label: 'Run all tests', cmd: 'npx playwright test' },
  { label: 'Accessibility only', cmd: 'npx playwright test accessibility' },
  { label: 'Generate JSON report', cmd: 'npx playwright test --reporter=json > results.json' },
];

function copyCmd(cmd: string) {
  navigator.clipboard.writeText(cmd);
  toast.success('Copied to clipboard');
}

export default function AdminTestResults() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Test Results</h1>
        <p className="text-muted-foreground text-sm">
          Run Playwright tests locally, then import the JSON report to view results here.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="h-4 w-4" /> How to Run Tests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {commands.map((c) => (
            <div key={c.cmd} className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-1.5 text-xs font-mono">
                {c.cmd}
              </code>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyCmd(c.cmd)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground w-40 hidden sm:inline">{c.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <TestResultsDashboard />
    </div>
  );
}
