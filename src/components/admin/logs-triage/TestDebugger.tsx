import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Terminal, Eye, Bug, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const COMMANDS = [
  {
    title: 'Verbose Reporter',
    command: 'npx vitest --reporter=verbose',
    description: 'Lists every test case and its result for detailed analysis.',
    icon: Terminal,
  },
  {
    title: 'With Source Locations',
    command: 'npx vitest --reporter=verbose --includeTaskLocation',
    description: 'Adds file:line location to each test for quick navigation.',
    icon: Bug,
  },
  {
    title: 'Debug Vite HMR',
    command: 'DEBUG=vite:* npx vitest',
    description: 'Shows detailed verbose logs from the Vite dev server.',
    icon: Zap,
  },
  {
    title: 'Visual Preview',
    command: 'npx vitest --ui',
    description: 'Opens the Vitest UI dashboard in a browser for visual debugging.',
    icon: Eye,
  },
];

const SETUP_GUIDE = `// vitest.config.ts — recommended setup
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    reporters: ['verbose'],
    includeTaskLocation: true,
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});

// --- vitest-preview setup ---
// 1. Install: npm i -D vitest-preview
// 2. In your test setup file:
import { debug } from 'vitest-preview';
// 3. In a failing test, call debug() to open a browser preview:
// it('renders correctly', () => {
//   render(<MyComponent />);
//   debug(); // Opens preview in browser
// });`;

export const TestDebugger = () => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [testOutput, setTestOutput] = useState('');
  const { toast } = useToast();

  const copyCommand = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIdx(idx);
    toast({ title: 'Copied to clipboard' });
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Simple parser: highlights PASS/FAIL lines
  const parsedOutput = testOutput.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (/^✓|PASS|✔/.test(trimmed)) {
      return <div key={i} className="text-emerald-400 font-mono text-xs">{line}</div>;
    }
    if (/^✗|FAIL|✘|×/.test(trimmed)) {
      return <div key={i} className="text-red-400 font-mono text-xs">{line}</div>;
    }
    if (/^(RUNS?|Test Files|Tests|Duration|Start)/i.test(trimmed)) {
      return <div key={i} className="text-blue-400 font-mono text-xs font-bold">{line}</div>;
    }
    return <div key={i} className="text-gray-400 font-mono text-xs">{line}</div>;
  });

  return (
    <div className="space-y-6">
      {/* Command cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COMMANDS.map((cmd, idx) => (
          <Card key={idx} className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <cmd.icon className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-white text-sm">{cmd.title}</CardTitle>
              </div>
              <CardDescription className="text-gray-400 text-xs">{cmd.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 bg-gray-900 rounded-md p-2">
                <code className="flex-1 text-green-400 text-xs font-mono">{cmd.command}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-white"
                  onClick={() => copyCommand(cmd.command, idx)}
                  aria-label="Copy command"
                >
                  {copiedIdx === idx ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Test output parser */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">Test Output Parser</CardTitle>
          <CardDescription className="text-gray-400 text-xs">
            Paste Vitest output below to highlight PASS/FAIL results
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={testOutput}
            onChange={(e) => setTestOutput(e.target.value)}
            placeholder="Paste vitest output here..."
            className="w-full h-32 bg-gray-900 border border-gray-700 rounded-md p-3 text-gray-300 font-mono text-xs resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-600"
          />
          {testOutput && (
            <div className="bg-gray-900 rounded-md p-3 max-h-64 overflow-auto space-y-0.5">
              {parsedOutput}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup guide */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white text-sm">Setup Guide</CardTitle>
            <CardDescription className="text-gray-400 text-xs">
              Recommended Vitest configuration with vitest-preview
            </CardDescription>
          </div>
          <Badge className="bg-purple-600">Reference</Badge>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-900 rounded-md p-4 text-xs font-mono text-gray-300 overflow-auto max-h-80 whitespace-pre-wrap">
            {SETUP_GUIDE}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};
