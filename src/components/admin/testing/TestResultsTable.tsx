/**
 * TestResultsTable Component
 * 
 * @description Detailed table showing per-suite test results
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, XCircle, SkipForward, FileCode, ArrowUpDown } from 'lucide-react';
import { formatDuration } from '@/utils/playwrightResultsParser';
import type { SuiteRunResult, TestStatus } from '@/types/testCoverage';

interface TestResultsTableProps {
  results: SuiteRunResult[];
  onSelectSuite?: (suiteId: string) => void;
}

type SortKey = 'suiteName' | 'total' | 'passed' | 'failed' | 'duration';
type SortOrder = 'asc' | 'desc';
type FilterStatus = 'all' | 'passed' | 'failed' | 'skipped';

function getStatusIcon(status: TestStatus) {
  switch (status) {
    case 'passed':
      return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'skipped':
      return <SkipForward className="h-4 w-4 text-muted-foreground" />;
    default:
      return null;
  }
}

export function TestResultsTable({ results, onSelectSuite }: TestResultsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('suiteName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const filteredResults = results.filter((result) => {
    if (filterStatus === 'all') return true;
    return result.status === filterStatus;
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    let comparison = 0;
    switch (sortKey) {
      case 'suiteName':
        comparison = a.suiteName.localeCompare(b.suiteName);
        break;
      case 'total':
        comparison = a.total - b.total;
        break;
      case 'passed':
        comparison = a.passed - b.passed;
        break;
      case 'failed':
        comparison = a.failed - b.failed;
        break;
      case 'duration':
        comparison = a.duration - b.duration;
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Suite Results
          </CardTitle>
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as FilterStatus)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suites</SelectItem>
              <SelectItem value="passed">Passed Only</SelectItem>
              <SelectItem value="failed">Failed Only</SelectItem>
              <SelectItem value="skipped">Skipped Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Status</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => handleSort('suiteName')}
                  >
                    Suite Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => handleSort('total')}
                  >
                    Total
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => handleSort('passed')}
                  >
                    Passed
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => handleSort('failed')}
                  >
                    Failed
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">Skipped</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => handleSort('duration')}
                  >
                    Duration
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No results match the current filter
                  </TableCell>
                </TableRow>
              ) : (
                sortedResults.map((result) => (
                  <TableRow
                    key={result.suiteId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onSelectSuite?.(result.suiteId)}
                  >
                    <TableCell>{getStatusIcon(result.status)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{result.suiteName}</div>
                        <div className="text-xs text-muted-foreground">{result.fileName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{result.total}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-primary border-primary/30">
                        {result.passed}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {result.failed > 0 ? (
                        <Badge variant="destructive">{result.failed}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">0</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-muted-foreground">
                        {result.skipped}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDuration(result.duration)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
