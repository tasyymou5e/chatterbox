import { Activity, CheckCircle2, AlertTriangle, XCircle, Clock, Server } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface UptimeOverviewCardsProps {
  systemUptime: number;
  slaTarget: number;
  metrics: {
    totalFunctions: number;
    passingCount: number;
    warningCount: number;
    failingCount: number;
    avgResponseTime: number;
    totalDowntime: number;
  };
}

export function UptimeOverviewCards({
  systemUptime,
  slaTarget,
  metrics,
}: UptimeOverviewCardsProps) {
  const isSystemPassing = systemUptime >= slaTarget;

  const formatDowntime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      {/* System Uptime - Large Card */}
      <Card className="lg:col-span-2 bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">System Uptime</span>
            <Activity
              className={`h-5 w-5 ${
                isSystemPassing ? 'text-green-400' : 'text-red-400'
              }`}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-4xl font-bold ${
                isSystemPassing ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {systemUptime.toFixed(2)}%
            </span>
            <span className="text-sm text-gray-500">
              / {slaTarget}% target
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isSystemPassing ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(systemUptime, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Functions Monitored */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Monitored</span>
            <Server className="h-5 w-5 text-blue-400" />
          </div>
          <span className="text-3xl font-bold text-white">
            {metrics.totalFunctions}
          </span>
          <p className="text-xs text-gray-500 mt-1">Edge Functions</p>
        </CardContent>
      </Card>

      {/* Passing SLA */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Passing SLA</span>
            <CheckCircle2 className="h-5 w-5 text-green-400" />
          </div>
          <span className="text-3xl font-bold text-green-400">
            {metrics.passingCount}
          </span>
          <p className="text-xs text-gray-500 mt-1">
            {metrics.totalFunctions > 0
              ? `${Math.round((metrics.passingCount / metrics.totalFunctions) * 100)}% of total`
              : 'No functions'}
          </p>
        </CardContent>
      </Card>

      {/* Warning/Failing */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Below SLA</span>
            {metrics.failingCount > 0 ? (
              <XCircle className="h-5 w-5 text-red-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            {metrics.failingCount > 0 && (
              <span className="text-3xl font-bold text-red-400">
                {metrics.failingCount}
              </span>
            )}
            {metrics.warningCount > 0 && (
              <span
                className={`${
                  metrics.failingCount > 0 ? 'text-xl' : 'text-3xl'
                } font-bold text-yellow-400`}
              >
                {metrics.failingCount > 0 && '+'}
                {metrics.warningCount}
              </span>
            )}
            {metrics.failingCount === 0 && metrics.warningCount === 0 && (
              <span className="text-3xl font-bold text-gray-400">0</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {metrics.failingCount > 0 ? 'Failing' : 'At risk'}
          </p>
        </CardContent>
      </Card>

      {/* Total Downtime */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Downtime</span>
            <Clock className="h-5 w-5 text-orange-400" />
          </div>
          <span
            className={`text-3xl font-bold ${
              metrics.totalDowntime > 0 ? 'text-orange-400' : 'text-green-400'
            }`}
          >
            {formatDowntime(metrics.totalDowntime)}
          </span>
          <p className="text-xs text-gray-500 mt-1">Estimated</p>
        </CardContent>
      </Card>
    </div>
  );
}
