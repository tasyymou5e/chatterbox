/**
 * KidsCatalogSummaryStrip
 * Hero summary strip with warm accent borders and stat blocks
 */
import { Gamepad2, BookOpen, FlaskConical } from 'lucide-react';
import { SKILL_DOMAINS } from '@/types/skillPlan';

interface Props {
  gameCount: number;
  skillCount: number;
  testCount: number;
}

export function KidsCatalogSummaryStrip({ gameCount, skillCount, testCount }: Props) {
  const stats = [
    {
      icon: Gamepad2,
      label: 'Games Catalog',
      sublabel: 'Active content at /games',
      value: gameCount,
      borderClass: 'border-l-primary',
      bgClass: 'bg-primary/5',
      iconClass: 'text-primary',
    },
    {
      icon: BookOpen,
      label: 'Skill Activities',
      sublabel: `${SKILL_DOMAINS.length} skill domains at /kids`,
      value: skillCount,
      borderClass: 'border-l-secondary',
      bgClass: 'bg-secondary/5',
      iconClass: 'text-secondary',
    },
    {
      icon: FlaskConical,
      label: 'Test Coverage',
      sublabel: 'Kids feature test files',
      value: testCount,
      borderClass: 'border-l-accent',
      bgClass: 'bg-accent/5',
      iconClass: 'text-accent',
    },
  ];

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/30">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`flex items-center gap-4 p-6 border-l-4 ${stat.borderClass} ${stat.bgClass} transition-colors hover:bg-muted/30`}
          >
            <div className={`rounded-xl p-3 bg-card border border-border/50 shadow-sm`}>
              <stat.icon className={`h-6 w-6 ${stat.iconClass}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-3xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
              <p className="text-sm font-semibold text-foreground/80">{stat.label}</p>
              <p className="text-xs text-muted-foreground truncate">{stat.sublabel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
