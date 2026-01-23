import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import { SLAComplianceBadge } from './SLAComplianceBadge';
import type { UptimeStatsWithSLA, SLAStatus } from '@/hooks/useUptimeStats';

interface UptimeTableProps {
  stats: UptimeStatsWithSLA[];
  onSelectFunction?: (functionName: string) => void;
}

type SortField =
  | 'function_name'
  | 'uptime_percentage'
  | 'avg_response_time_ms'
  | 'total_downtime_minutes';
type SortDirection = 'asc' | 'desc';

export function UptimeTable({ stats, onSelectFunction }: UptimeTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SLAStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('uptime_percentage');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedStats = useMemo(() => {
    let result = [...stats];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((s) =>
        s.function_name.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.slaStatus === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const modifier = sortDirection === 'asc' ? 1 : -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * modifier;
      }
      return ((aVal as number) - (bVal as number)) * modifier;
    });

    return result;
  }, [stats, search, statusFilter, sortField, sortDirection]);

  const formatDowntime = (minutes: number): string => {
    if (minutes === 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 text-gray-400 hover:text-white -ml-3"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown
        className={`ml-1 h-3 w-3 ${sortField === field ? 'text-blue-400' : ''}`}
      />
    </Button>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search functions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as SLAStatus | 'all')}
        >
          <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="passing">Passing</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="failing">Failing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700 hover:bg-gray-800/50">
              <TableHead className="w-8"></TableHead>
              <TableHead className="text-gray-400">
                <SortableHeader field="function_name">Function</SortableHeader>
              </TableHead>
              <TableHead className="text-gray-400">
                <SortableHeader field="uptime_percentage">
                  Uptime
                </SortableHeader>
              </TableHead>
              <TableHead className="text-gray-400">SLA Status</TableHead>
              <TableHead className="text-gray-400">
                <SortableHeader field="avg_response_time_ms">
                  Avg Response
                </SortableHeader>
              </TableHead>
              <TableHead className="text-gray-400">Max Response</TableHead>
              <TableHead className="text-gray-400">
                <SortableHeader field="total_downtime_minutes">
                  Downtime
                </SortableHeader>
              </TableHead>
              <TableHead className="text-gray-400">Checks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedStats.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-gray-500 py-8"
                >
                  No functions match your criteria
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedStats.map((stat) => (
                <>
                  <TableRow
                    key={stat.function_name}
                    className="border-gray-700 hover:bg-gray-800/50 cursor-pointer"
                    onClick={() =>
                      setExpandedRow(
                        expandedRow === stat.function_name
                          ? null
                          : stat.function_name
                      )
                    }
                  >
                    <TableCell className="py-2">
                      {expandedRow === stat.function_name ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      {stat.function_name}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-mono ${
                          stat.uptime_percentage >= stat.slaTarget
                            ? 'text-green-400'
                            : stat.uptime_percentage >= stat.slaTarget - 0.5
                              ? 'text-yellow-400'
                              : 'text-red-400'
                        }`}
                      >
                        {stat.uptime_percentage.toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <SLAComplianceBadge status={stat.slaStatus} size="sm" />
                    </TableCell>
                    <TableCell className="text-gray-300 font-mono">
                      {Math.round(stat.avg_response_time_ms)}ms
                    </TableCell>
                    <TableCell className="text-gray-300 font-mono">
                      {stat.max_response_time_ms}ms
                    </TableCell>
                    <TableCell
                      className={`font-mono ${
                        stat.total_downtime_minutes > 0
                          ? 'text-orange-400'
                          : 'text-gray-500'
                      }`}
                    >
                      {formatDowntime(stat.total_downtime_minutes)}
                    </TableCell>
                    <TableCell className="text-gray-400">
                      {stat.total_checks}
                    </TableCell>
                  </TableRow>
                  {expandedRow === stat.function_name && (
                    <TableRow className="border-gray-700 bg-gray-800/30">
                      <TableCell colSpan={8} className="py-4 px-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                          <div>
                            <span className="text-gray-500 block mb-1">
                              SLA Target
                            </span>
                            <span className="text-white font-mono">
                              {stat.slaTarget}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 block mb-1">
                              Healthy Checks
                            </span>
                            <span className="text-green-400 font-mono">
                              {stat.healthy_checks} / {stat.total_checks}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 block mb-1">
                              Min Response
                            </span>
                            <span className="text-gray-300 font-mono">
                              {stat.min_response_time_ms}ms
                            </span>
                          </div>
                          <div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectFunction?.(stat.function_name);
                              }}
                            >
                              View Trend
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-500 flex justify-between">
        <span>
          Showing {filteredAndSortedStats.length} of {stats.length} functions
        </span>
        {statusFilter !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-400 h-auto p-0"
            onClick={() => setStatusFilter('all')}
          >
            Clear filter
          </Button>
        )}
      </div>
    </div>
  );
}
