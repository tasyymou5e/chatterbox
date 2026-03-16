/**
 * TestSuiteSummaryCards Component
 * 
 * @description Displays summary cards for each E2E test suite
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Play,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { TestSuite, TestStatus } from '@/types/testCoverage';

interface TestSuiteSummaryCardsProps {
  suites: TestSuite[];
}

const statusConfig: Record<TestStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  passed: { icon: CheckCircle, color: 'text-primary', label: 'Passed' },
  failed: { icon: XCircle, color: 'text-destructive', label: 'Failed' },
  pending: { icon: Clock, color: 'text-muted-foreground', label: 'Pending' },
  running: { icon: Play, color: 'text-accent-foreground', label: 'Running' },
  skipped: { icon: Clock, color: 'text-accent-foreground', label: 'Skipped' }
};

export function TestSuiteSummaryCards({ suites }: TestSuiteSummaryCardsProps) {
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());

  const toggleSuite = (suiteId: string) => {
    setExpandedSuites(prev => {
      const next = new Set(prev);
      if (next.has(suiteId)) {
        next.delete(suiteId);
      } else {
        next.add(suiteId);
      }
      return next;
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {suites.map((suite) => {
        const StatusIcon = statusConfig[suite.status].icon;
        const isExpanded = expandedSuites.has(suite.id);

        return (
          <Card key={suite.id} className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {suite.name}
                </CardTitle>
                <Badge 
                  variant="outline" 
                  className={statusConfig[suite.status].color}
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig[suite.status].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Tests</span>
                  <span className="font-bold text-2xl text-foreground">{suite.testCount}</span>
                </div>
                
                <div className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                  {suite.fileName}
                </div>

                <Collapsible open={isExpanded} onOpenChange={() => toggleSuite(suite.id)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span>{suite.categories.length} categories</span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-1">
                      {suite.categories.map((category, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between text-xs py-1 px-2 bg-muted/30 rounded"
                        >
                          <span className="text-muted-foreground">{category.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {category.tests}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {suite.lastRun && (
                  <div className="text-xs text-muted-foreground">
                    Last run: {new Date(suite.lastRun).toLocaleString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
