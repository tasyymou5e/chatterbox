import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Bug, CheckCircle2, BarChart3 } from 'lucide-react';

interface LogStatsBarProps {
  total: number;
  critical: number;
  unresolved: number;
}

export const LogStatsBar = ({ total, critical, unresolved }: LogStatsBarProps) => {
  const resolved = total - unresolved;
  const cards = [
    { label: 'Total Errors', value: total, icon: BarChart3, color: 'text-blue-400' },
    { label: 'Critical', value: critical, icon: AlertTriangle, color: 'text-red-400' },
    { label: 'Unresolved', value: unresolved, icon: Bug, color: 'text-amber-400' },
    { label: 'Resolved', value: resolved, icon: CheckCircle2, color: 'text-emerald-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="bg-gray-800 border-gray-700">
          <CardContent className="p-4 flex items-center gap-3">
            <c.icon className={`h-8 w-8 ${c.color}`} />
            <div>
              <p className="text-2xl font-bold text-white">{c.value}</p>
              <p className="text-xs text-gray-400">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
