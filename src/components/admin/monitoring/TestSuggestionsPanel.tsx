import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle2, TestTube2, Shield, Eye, Zap, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestSuggestion {
  category: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  command: string;
  priority: 'high' | 'medium' | 'low';
}

const STATIC_SUGGESTIONS: TestSuggestion[] = [
  {
    category: 'Security',
    icon: <Shield className="h-4 w-4" />,
    title: 'RLS Policy Enforcement',
    description: 'Verify row-level security prevents unauthorized data access across all tables',
    command: 'npx vitest run --reporter=verbose tests/security/',
    priority: 'high',
  },
  {
    category: 'Auth',
    icon: <Shield className="h-4 w-4" />,
    title: 'Authentication Flow E2E',
    description: 'Test signup, login, password reset, and role-based redirects',
    command: 'npx playwright test tests-e2e/auth/',
    priority: 'high',
  },
  {
    category: 'Accessibility',
    icon: <Eye className="h-4 w-4" />,
    title: 'WCAG Compliance Scan',
    description: 'Run axe-core accessibility audit on all major routes',
    command: 'npx playwright test tests-e2e/accessibility/',
    priority: 'medium',
  },
  {
    category: 'Performance',
    icon: <Zap className="h-4 w-4" />,
    title: 'Core Web Vitals',
    description: 'Measure LCP, FID, CLS on landing, dashboard, and kids portal',
    command: 'npx vitest run src/__tests__/performance/',
    priority: 'medium',
  },
  {
    category: 'Data Integrity',
    icon: <Database className="h-4 w-4" />,
    title: 'Database Consistency Checks',
    description: 'Verify FK constraints, orphaned records, and data health scores',
    command: 'npx vitest run src/__tests__/data-integrity/',
    priority: 'medium',
  },
  {
    category: 'Components',
    icon: <TestTube2 className="h-4 w-4" />,
    title: 'Component Unit Tests',
    description: 'Run all React component unit tests with coverage',
    command: 'npx vitest run --coverage --reporter=verbose',
    priority: 'low',
  },
];

interface TestSuggestionsPanelProps {
  errorComponents?: string[];
}

export const TestSuggestionsPanel = ({ errorComponents = [] }: TestSuggestionsPanelProps) => {
  const { toast } = useToast();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const dynamicSuggestions: TestSuggestion[] = errorComponents.slice(0, 5).map(comp => ({
    category: 'Dynamic',
    icon: <TestTube2 className="h-4 w-4" />,
    title: `Test ${comp}`,
    description: `This component has frequent errors — add targeted unit tests`,
    command: `npx vitest run --reporter=verbose src/**/${comp}*`,
    priority: 'high' as const,
  }));

  const allSuggestions = [...dynamicSuggestions, ...STATIC_SUGGESTIONS];

  const copyCommand = (cmd: string, index: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    toast({ title: 'Copied!', description: 'Test command copied to clipboard' });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const priorityColor = (p: string) => {
    if (p === 'high') return 'destructive';
    if (p === 'medium') return 'default';
    return 'secondary';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Suggested Tests</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {allSuggestions.map((s, i) => (
          <Card key={i} className="border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  {s.icon}
                  {s.title}
                </CardTitle>
                <Badge variant={priorityColor(s.priority)}>{s.priority}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">{s.description}</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {s.command}
                </code>
                <Button variant="ghost" size="sm" onClick={() => copyCommand(s.command, i)}>
                  {copiedIndex === i ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
