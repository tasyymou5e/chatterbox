/**
 * CoverageGapAnalysis Component
 * 
 * @description Displays identified testing gaps with priority and recommendations
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  ArrowRight,
  Clock,
  Zap
} from 'lucide-react';
import type { CoverageGap, CoveragePriority } from '@/types/testCoverage';

interface CoverageGapAnalysisProps {
  gaps: CoverageGap[];
}

const priorityConfig: Record<CoveragePriority, { color: string; icon: typeof Zap }> = {
  high: { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: Zap },
  medium: { color: 'bg-accent/50 text-accent-foreground border-accent', icon: AlertTriangle },
  low: { color: 'bg-muted text-muted-foreground border-border', icon: Clock }
};

const effortBadgeColor: Record<string, string> = {
  low: 'bg-primary/10 text-primary',
  medium: 'bg-accent/50 text-accent-foreground',
  high: 'bg-destructive/10 text-destructive'
};

export function CoverageGapAnalysis({ gaps }: CoverageGapAnalysisProps) {
  const sortedGaps = [...gaps].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-accent-foreground" />
          Coverage Gap Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedGaps.map((gap) => {
            const PriorityIcon = priorityConfig[gap.priority].icon;
            
            return (
              <div
                key={gap.id}
                className={`p-4 rounded-lg border ${priorityConfig[gap.priority].color}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <PriorityIcon className="h-4 w-4" />
                      <h4 className="font-medium">{gap.title}</h4>
                      <Badge variant="outline" className="text-xs capitalize">
                        {gap.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {gap.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <ArrowRight className="h-3 w-3" />
                      <span className="text-foreground">{gap.recommendation}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge 
                      variant="outline" 
                      className={`capitalize ${priorityConfig[gap.priority].color}`}
                    >
                      {gap.priority} priority
                    </Badge>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${effortBadgeColor[gap.effort]}`}
                    >
                      {gap.effort} effort
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="font-medium mb-3">Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-destructive/10 rounded-lg">
              <div className="text-2xl font-bold text-destructive">
                {gaps.filter(g => g.priority === 'high').length}
              </div>
              <div className="text-xs text-muted-foreground">High Priority</div>
            </div>
            <div className="p-3 bg-accent/50 rounded-lg">
              <div className="text-2xl font-bold text-accent-foreground">
                {gaps.filter(g => g.priority === 'medium').length}
              </div>
              <div className="text-xs text-muted-foreground">Medium Priority</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-muted-foreground">
                {gaps.filter(g => g.priority === 'low').length}
              </div>
              <div className="text-xs text-muted-foreground">Low Priority</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
