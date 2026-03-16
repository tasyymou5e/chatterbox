import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bug, Terminal, Radio, Ticket } from 'lucide-react';
import { LogViewer } from '@/components/admin/logs-triage/LogViewer';
import { TestDebugger } from '@/components/admin/logs-triage/TestDebugger';
import { ErrorCapture } from '@/components/admin/logs-triage/ErrorCapture';
import { TriageTickets } from '@/components/admin/logs-triage/TriageTickets';
import type { SystemError } from '@/hooks/useLogsTriage';
import type { TicketSeverity } from '@/stores/triageTicketStore';

export default function AdminLogsTriage() {
  const [activeTab, setActiveTab] = useState('logs');
  const [ticketPrefill, setTicketPrefill] = useState<{
    title: string;
    description: string;
    severity: TicketSeverity;
    component: string;
    linkedLogIds: string[];
  } | null>(null);

  const handleCreateTicketFromLog = (log: SystemError) => {
    setTicketPrefill({
      title: `[${log.error_type}] ${log.message.slice(0, 80)}`,
      description: `Error in ${log.component_name ?? 'unknown component'} at ${log.route_path ?? 'unknown route'}.\n\n${log.message}`,
      severity: (log.severity as TicketSeverity) || 'medium',
      component: log.component_name ?? '',
      linkedLogIds: [log.id],
    });
    setActiveTab('tickets');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Logs Triage</h1>
        <p className="text-gray-400 text-sm mt-1">
          Analyze system errors, debug tests, capture frontend errors, and manage triage tickets.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="logs" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400">
            <Bug className="h-4 w-4 mr-2" /> Log Triage
          </TabsTrigger>
          <TabsTrigger value="test" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400">
            <Terminal className="h-4 w-4 mr-2" /> Test Debugger
          </TabsTrigger>
          <TabsTrigger value="capture" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400">
            <Radio className="h-4 w-4 mr-2" /> Error Capture
          </TabsTrigger>
          <TabsTrigger value="tickets" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400">
            <Ticket className="h-4 w-4 mr-2" /> Triage Tickets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <LogViewer onCreateTicket={handleCreateTicketFromLog} />
        </TabsContent>
        <TabsContent value="test">
          <TestDebugger />
        </TabsContent>
        <TabsContent value="capture">
          <ErrorCapture />
        </TabsContent>
        <TabsContent value="tickets">
          <TriageTickets prefill={ticketPrefill} onClearPrefill={() => setTicketPrefill(null)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
