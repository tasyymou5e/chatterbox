import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import type { UptimeStatsWithSLA, UptimePeriod } from '@/hooks/useUptimeStats';

interface UptimeExportButtonProps {
  stats: UptimeStatsWithSLA[];
  period: UptimePeriod;
  systemUptime: number;
  slaTarget: number;
}

export function UptimeExportButton({
  stats,
  period,
  systemUptime,
  slaTarget,
}: UptimeExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const periodLabels: Record<UptimePeriod, string> = {
    '7d': '7 Days',
    '30d': '30 Days',
    '90d': '90 Days',
  };

  const getFilename = (extension: string) => {
    const date = format(new Date(), 'yyyy-MM-dd');
    return `uptime-report-${period}-${date}.${extension}`;
  };

  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = [
        'Function Name',
        'Uptime %',
        'SLA Status',
        'SLA Target %',
        'Avg Response (ms)',
        'Max Response (ms)',
        'Min Response (ms)',
        'Total Downtime (min)',
        'Total Checks',
        'Healthy Checks',
      ];

      const rows = stats.map((s) => [
        s.function_name,
        s.uptime_percentage.toFixed(2),
        s.slaStatus,
        s.slaTarget.toString(),
        Math.round(s.avg_response_time_ms).toString(),
        s.max_response_time_ms.toString(),
        s.min_response_time_ms.toString(),
        s.total_downtime_minutes.toString(),
        s.total_checks.toString(),
        s.healthy_checks.toString(),
      ]);

      // Add summary row
      rows.push([]);
      rows.push(['Summary']);
      rows.push(['Period', periodLabels[period]]);
      rows.push(['System Uptime', `${systemUptime.toFixed(2)}%`]);
      rows.push(['SLA Target', `${slaTarget}%`]);
      rows.push(['Total Functions', stats.length.toString()]);
      rows.push([
        'Passing SLA',
        stats.filter((s) => s.slaStatus === 'passing').length.toString(),
      ]);
      rows.push([
        'Failing SLA',
        stats.filter((s) => s.slaStatus === 'failing').length.toString(),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${cell}"`).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFilename('csv');
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Title
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.text('Edge Function Uptime Report', pageWidth / 2, y, {
        align: 'center',
      });
      y += 10;

      // Period
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text(`Period: ${periodLabels[period]}`, pageWidth / 2, y, {
        align: 'center',
      });
      y += 5;
      doc.text(
        `Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`,
        pageWidth / 2,
        y,
        { align: 'center' }
      );
      y += 15;

      // Summary Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(15, y, pageWidth - 30, 35, 3, 3, 'F');
      y += 10;

      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      const summaryCol1 = 25;
      const summaryCol2 = pageWidth / 2;

      doc.text(`System Uptime: ${systemUptime.toFixed(2)}%`, summaryCol1, y);
      doc.text(`SLA Target: ${slaTarget}%`, summaryCol2, y);
      y += 8;
      doc.text(`Total Functions: ${stats.length}`, summaryCol1, y);
      doc.text(
        `Passing: ${stats.filter((s) => s.slaStatus === 'passing').length}`,
        summaryCol2,
        y
      );
      y += 8;
      doc.setTextColor(
        stats.filter((s) => s.slaStatus === 'failing').length > 0
          ? 239
          : 30,
        stats.filter((s) => s.slaStatus === 'failing').length > 0
          ? 68
          : 41,
        stats.filter((s) => s.slaStatus === 'failing').length > 0
          ? 68
          : 59
      );
      doc.text(
        `Failing: ${stats.filter((s) => s.slaStatus === 'failing').length}`,
        summaryCol1,
        y
      );
      doc.setTextColor(234, 179, 8);
      doc.text(
        `Warning: ${stats.filter((s) => s.slaStatus === 'warning').length}`,
        summaryCol2,
        y
      );
      y += 20;

      // Table Header
      doc.setFillColor(30, 41, 59);
      doc.rect(15, y, pageWidth - 30, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text('Function', 18, y + 5.5);
      doc.text('Uptime', 80, y + 5.5);
      doc.text('Status', 105, y + 5.5);
      doc.text('Avg Resp', 130, y + 5.5);
      doc.text('Downtime', 160, y + 5.5);
      y += 8;

      // Table Rows
      doc.setTextColor(30, 41, 59);
      stats.forEach((stat, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, pageWidth - 30, 7, 'F');
        }

        doc.setFontSize(8);
        doc.text(
          stat.function_name.length > 25
            ? stat.function_name.substring(0, 25) + '...'
            : stat.function_name,
          18,
          y + 5
        );
        doc.text(`${stat.uptime_percentage.toFixed(2)}%`, 80, y + 5);

        // Status color
        if (stat.slaStatus === 'passing') {
          doc.setTextColor(34, 197, 94);
        } else if (stat.slaStatus === 'warning') {
          doc.setTextColor(234, 179, 8);
        } else {
          doc.setTextColor(239, 68, 68);
        }
        doc.text(stat.slaStatus.toUpperCase(), 105, y + 5);
        doc.setTextColor(30, 41, 59);

        doc.text(`${Math.round(stat.avg_response_time_ms)}ms`, 130, y + 5);
        doc.text(`${stat.total_downtime_minutes}min`, 160, y + 5);

        y += 7;
      });

      doc.save(getFilename('pdf'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
          disabled={exporting || stats.length === 0}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-gray-800 border-gray-700">
        <DropdownMenuItem
          className="text-gray-300 hover:text-white cursor-pointer"
          onClick={exportToCSV}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-gray-300 hover:text-white cursor-pointer"
          onClick={exportToPDF}
        >
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
