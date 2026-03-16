import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { useLogsTriage, type SystemError } from '@/hooks/useLogsTriage';
import { LogStatsBar } from './LogStatsBar';
import { LogDetailPanel } from './LogDetailPanel';
import { useToast } from '@/hooks/use-toast';

interface LogViewerProps {
  onCreateTicket: (log: SystemError) => void;
}

export const LogViewer = ({ onCreateTicket }: LogViewerProps) => {
  const { logs, loading, filters, setFilters, stats, resolveErrors, exportLogs, refetch } = useLogsTriage();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedLog, setSelectedLog] = useState<SystemError | null>(null);
  const { toast } = useToast();

  const components = useMemo(() => {
    const set = new Set(logs.map((l) => l.component_name).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [logs]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkResolve = async () => {
    if (selected.size === 0) return;
    const { error } = await resolveErrors(Array.from(selected));
    if (error) {
      toast({ title: 'Failed to resolve', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Resolved ${selected.size} error(s)` });
      setSelected(new Set());
    }
  };

  const severityColor: Record<string, string> = {
    critical: 'bg-red-600',
    high: 'bg-orange-600',
    medium: 'bg-amber-600',
    low: 'bg-blue-600',
  };

  return (
    <div className="space-y-4">
      <LogStatsBar {...stats} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search messages..."
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>
        <Select value={filters.severity} onValueChange={(v) => setFilters({ ...filters, severity: v })}>
          <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.component} onValueChange={(v) => setFilters({ ...filters, component: v })}>
          <SelectTrigger className="w-[160px] bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Component" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Components</SelectItem>
            {components.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.dateRange} onValueChange={(v) => setFilters({ ...filters, dateRange: v as typeof filters.dateRange })}>
          <SelectTrigger className="w-[130px] bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Last 24h</SelectItem>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.resolved} onValueChange={(v) => setFilters({ ...filters, resolved: v as typeof filters.resolved })}>
          <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="unresolved">Unresolved</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={refetch} className="border-gray-600 text-gray-300 hover:bg-gray-700">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-md p-3">
          <span className="text-gray-300 text-sm">{selected.size} selected</span>
          <Button size="sm" onClick={handleBulkResolve} className="bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="h-4 w-4 mr-1" /> Resolve
          </Button>
          <Button size="sm" variant="outline" onClick={exportLogs} className="border-gray-600 text-gray-300 hover:bg-gray-700">
            <Download className="h-4 w-4 mr-1" /> Export JSON
          </Button>
        </div>
      )}

      <div className="flex gap-4">
        {/* Table */}
        <div className={`flex-1 overflow-auto ${selectedLog ? 'max-w-[60%]' : ''}`}>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No errors found matching filters.</div>
          ) : (
            <div className="rounded-md border border-gray-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-transparent">
                    <TableHead className="w-10 text-gray-400" />
                    <TableHead className="text-gray-400">Severity</TableHead>
                    <TableHead className="text-gray-400">Type</TableHead>
                    <TableHead className="text-gray-400 max-w-[300px]">Message</TableHead>
                    <TableHead className="text-gray-400">Component</TableHead>
                    <TableHead className="text-gray-400">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow
                      key={log.id}
                      className={`border-gray-700 cursor-pointer transition-colors ${
                        selectedLog?.id === log.id ? 'bg-gray-700' : 'hover:bg-gray-800'
                      }`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(log.id)}
                          onCheckedChange={() => toggleSelect(log.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge className={`${severityColor[log.severity] ?? 'bg-gray-600'} text-xs`}>
                          {log.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs font-mono">{log.error_type}</TableCell>
                      <TableCell className="text-gray-300 text-xs max-w-[300px] truncate">{log.message}</TableCell>
                      <TableCell className="text-gray-400 text-xs">{log.component_name ?? '—'}</TableCell>
                      <TableCell className="text-gray-400 text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedLog && (
          <div className="w-[40%] min-w-[340px]">
            <LogDetailPanel
              log={selectedLog}
              onClose={() => setSelectedLog(null)}
              onCreateTicket={onCreateTicket}
            />
          </div>
        )}
      </div>
    </div>
  );
};
