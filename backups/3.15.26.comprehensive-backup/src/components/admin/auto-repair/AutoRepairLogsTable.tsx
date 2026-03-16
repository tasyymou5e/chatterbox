import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Search, Download, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export interface AutoRepairLog {
  id: string;
  user_id: string;
  timestamp: string;
  success: boolean;
  failure_reason: string | null;
  trigger_source: string;
  repaired_fields: string[] | null;
  total_fields_repaired: string | null;
  profile_repair_details: Record<string, unknown> | null;
  role_repair_details: Record<string, unknown> | null;
  family_repair_details: Record<string, unknown> | null;
  device_info: Record<string, unknown> | null;
}

interface AutoRepairLogsTableProps {
  logs: AutoRepairLog[];
  loading?: boolean;
  onExport?: () => void;
}

export function AutoRepairLogsTable({ logs, loading, onExport }: AutoRepairLogsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'successful' | 'failed'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'successful' && log.success) ||
      (statusFilter === 'failed' && !log.success);
    return matchesSearch && matchesStatus;
  });

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatDeviceInfo = (deviceInfo: Record<string, unknown> | null) => {
    if (!deviceInfo) return 'Unknown';
    const browser = deviceInfo.browser_name || 'Unknown';
    const os = deviceInfo.os_name || '';
    return `${browser}${os ? ` / ${os}` : ''}`;
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Repair Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-10 bg-gray-700 rounded animate-pulse" />
            <div className="h-64 bg-gray-700 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-white">Repair Logs</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 w-64"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <TabsList className="bg-gray-700 mb-4">
            <TabsTrigger value="all" className="data-[state=active]:bg-gray-600">
              All ({logs.length})
            </TabsTrigger>
            <TabsTrigger value="successful" className="data-[state=active]:bg-gray-600">
              Successful ({logs.filter(l => l.success).length})
            </TabsTrigger>
            <TabsTrigger value="failed" className="data-[state=active]:bg-gray-600">
              Failed ({logs.filter(l => !l.success).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="mt-0">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                {logs.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-lg">No auto-repair events recorded yet</p>
                    <p className="text-sm">
                      Auto-repair events are logged when users access the parent dashboard with missing profile, role, or family data.
                    </p>
                  </div>
                ) : (
                  <p>No logs match your search criteria</p>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-gray-700 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-gray-700/50">
                      <TableHead className="text-gray-300 w-8"></TableHead>
                      <TableHead className="text-gray-300">Timestamp</TableHead>
                      <TableHead className="text-gray-300">User ID</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Fields</TableHead>
                      <TableHead className="text-gray-300">Trigger</TableHead>
                      <TableHead className="text-gray-300">Device</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <Collapsible key={log.id} asChild>
                        <>
                          <TableRow className="border-gray-700 hover:bg-gray-700/50">
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleRow(log.id)}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                                >
                                  {expandedRows.has(log.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell className="text-gray-300 font-mono text-sm">
                              {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                            </TableCell>
                            <TableCell className="text-gray-300 font-mono text-sm">
                              {log.user_id.substring(0, 8)}...
                            </TableCell>
                            <TableCell>
                              {log.success ? (
                                <Badge className="bg-green-900/50 text-green-400 border-green-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Success
                                </Badge>
                              ) : (
                                <Badge className="bg-red-900/50 text-red-400 border-red-700">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Failed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {log.total_fields_repaired || '0'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-gray-600 text-gray-300">
                                {log.trigger_source}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-400 text-sm">
                              {formatDeviceInfo(log.device_info)}
                            </TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <TableRow className="border-gray-700 bg-gray-900/50">
                              <TableCell colSpan={7} className="p-4">
                                <div className="space-y-3 text-sm">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {log.profile_repair_details && (
                                      <div className="bg-gray-800 p-3 rounded-lg">
                                        <h4 className="text-blue-400 font-medium mb-2">Profile Repair</h4>
                                        <pre className="text-gray-300 text-xs overflow-auto">
                                          {JSON.stringify(log.profile_repair_details, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                    {log.role_repair_details && (
                                      <div className="bg-gray-800 p-3 rounded-lg">
                                        <h4 className="text-purple-400 font-medium mb-2">Role Repair</h4>
                                        <pre className="text-gray-300 text-xs overflow-auto">
                                          {JSON.stringify(log.role_repair_details, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                    {log.family_repair_details && (
                                      <div className="bg-gray-800 p-3 rounded-lg">
                                        <h4 className="text-green-400 font-medium mb-2">Family Repair</h4>
                                        <pre className="text-gray-300 text-xs overflow-auto">
                                          {JSON.stringify(log.family_repair_details, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                  {log.failure_reason && (
                                    <div className="bg-red-900/20 p-3 rounded-lg border border-red-800">
                                      <h4 className="text-red-400 font-medium mb-1">Failure Reason</h4>
                                      <p className="text-gray-300">{log.failure_reason}</p>
                                    </div>
                                  )}
                                  <div className="text-gray-500">
                                    <span className="font-medium">Full User ID:</span> {log.user_id}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default AutoRepairLogsTable;
