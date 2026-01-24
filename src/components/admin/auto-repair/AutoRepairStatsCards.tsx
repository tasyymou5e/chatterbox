import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, CheckCircle, Layers, Users } from 'lucide-react';

export interface RepairStats {
  totalRepairs: number;
  successfulRepairs: number;
  failedRepairs: number;
  profileRepairs: number;
  roleRepairs: number;
  familyRepairs: number;
  uniqueUsers: number;
}

interface AutoRepairStatsCardsProps {
  statistics: RepairStats;
  loading?: boolean;
}

export function AutoRepairStatsCards({ statistics, loading }: AutoRepairStatsCardsProps) {
  const successRate = statistics.totalRepairs > 0 
    ? ((statistics.successfulRepairs / statistics.totalRepairs) * 100).toFixed(1)
    : '0.0';
  
  const totalFieldsRepaired = statistics.profileRepairs + statistics.roleRepairs + statistics.familyRepairs;

  const cards = [
    {
      title: 'Total Repairs',
      value: statistics.totalRepairs,
      icon: Wrench,
      description: 'Auto-repair events logged',
      iconColor: 'text-blue-400',
    },
    {
      title: 'Success Rate',
      value: `${successRate}%`,
      icon: CheckCircle,
      description: `${statistics.successfulRepairs} successful, ${statistics.failedRepairs} failed`,
      iconColor: 'text-green-400',
    },
    {
      title: 'Fields Repaired',
      value: totalFieldsRepaired,
      icon: Layers,
      description: `Profile: ${statistics.profileRepairs}, Role: ${statistics.roleRepairs}, Family: ${statistics.familyRepairs}`,
      iconColor: 'text-purple-400',
    },
    {
      title: 'Unique Users',
      value: statistics.uniqueUsers,
      icon: Users,
      description: 'Users with auto-repairs',
      iconColor: 'text-orange-400',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-700 rounded animate-pulse w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-700 rounded animate-pulse w-16 mb-2" />
              <div className="h-3 bg-gray-700 rounded animate-pulse w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              {card.title}
            </CardTitle>
            <card.icon className={`h-5 w-5 ${card.iconColor}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{card.value}</div>
            <p className="text-xs text-gray-400 mt-1">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default AutoRepairStatsCards;
