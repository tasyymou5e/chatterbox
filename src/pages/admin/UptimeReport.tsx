import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, BarChart3 } from 'lucide-react';
import { useUptimeStats, useUptimeTrend, UptimePeriod } from '@/hooks/useUptimeStats';
import { UptimeOverviewCards } from '@/components/admin/uptime/UptimeOverviewCards';
import { UptimeTable } from '@/components/admin/uptime/UptimeTable';
import { UptimeTrendChart } from '@/components/admin/uptime/UptimeTrendChart';
import { UptimeExportButton } from '@/components/admin/uptime/UptimeExportButton';
import { Skeleton } from '@/components/ui/skeleton';

export default function UptimeReport() {
  const [period, setPeriod] = useState<UptimePeriod>('7d');
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);

  const {
    stats,
    systemUptime,
    slaTarget,
    metrics,
    loading,
    error,
    refetch,
  } = useUptimeStats(period);

  const {
    data: trendData,
    isLoading: trendLoading,
  } = useUptimeTrend(period, selectedFunction);

  const periodLabels: Record<UptimePeriod, string> = {
    '7d': '7 Days',
    '30d': '30 Days',
    '90d': '90 Days',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Uptime Report</h1>
            <p className="text-gray-400">
              Historical availability and SLA compliance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <UptimeExportButton
            stats={stats}
            period={period}
            systemUptime={systemUptime}
            slaTarget={slaTarget}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Period Tabs */}
      <Tabs
        value={period}
        onValueChange={(v) => {
          setPeriod(v as UptimePeriod);
          setSelectedFunction(null);
        }}
      >
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger
            value="7d"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            7 Days
          </TabsTrigger>
          <TabsTrigger
            value="30d"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            30 Days
          </TabsTrigger>
          <TabsTrigger
            value="90d"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            90 Days
          </TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="mt-6 space-y-6">
          {/* Overview Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className={`h-[120px] bg-gray-800 ${
                    i === 0 ? 'lg:col-span-2' : ''
                  }`}
                />
              ))}
            </div>
          ) : (
            <UptimeOverviewCards
              systemUptime={systemUptime}
              slaTarget={slaTarget}
              metrics={metrics}
            />
          )}

          {/* Trend Chart */}
          <UptimeTrendChart
            data={trendData || []}
            slaTarget={slaTarget}
            loading={trendLoading}
            selectedFunction={selectedFunction}
            title={`System Uptime - ${periodLabels[period]}`}
          />

          {/* Clear Function Selection */}
          {selectedFunction && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">
                Showing trend for:{' '}
                <span className="text-white font-medium">
                  {selectedFunction}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-400 h-auto p-0"
                onClick={() => setSelectedFunction(null)}
              >
                Show all functions
              </Button>
            </div>
          )}

          {/* Function Table */}
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full bg-gray-800" />
              <Skeleton className="h-[400px] w-full bg-gray-800" />
            </div>
          ) : (
            <UptimeTable
              stats={stats}
              onSelectFunction={setSelectedFunction}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
