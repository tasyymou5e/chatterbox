import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, MessageSquarePlus } from 'lucide-react';
import { useTriageTicketStore, type TicketSeverity, type TicketStatus, type TriageTicket } from '@/stores/triageTicketStore';
import { useToast } from '@/hooks/use-toast';

interface TriageTicketsProps {
  prefill?: { title: string; description: string; severity: TicketSeverity; component: string; linkedLogIds: string[] } | null;
  onClearPrefill: () => void;
}

export const TriageTickets = ({ prefill, onClearPrefill }: TriageTicketsProps) => {
  const { tickets, addTicket, updateTicketStatus, addNote, deleteTicket } = useTriageTicketStore();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(!!prefill);
  const [form, setForm] = useState({
    title: prefill?.title ?? '',
    description: prefill?.description ?? '',
    severity: (prefill?.severity ?? 'medium') as TicketSeverity,
    component: prefill?.component ?? '',
  });
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [selectedTicket, setSelectedTicket] = useState<TriageTicket | null>(null);

  const handleCreate = () => {
    if (!form.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    addTicket({
      ...form,
      status: 'open',
      linkedLogIds: prefill?.linkedLogIds ?? [],
      notes: [],
    });
    toast({ title: 'Ticket created' });
    setForm({ title: '', description: '', severity: 'medium', component: '' });
    setShowForm(false);
    onClearPrefill();
  };

  const handleAddNote = (id: string) => {
    const note = noteInputs[id]?.trim();
    if (!note) return;
    addNote(id, note);
    setNoteInputs((prev) => ({ ...prev, [id]: '' }));
  };

  const statusColor: Record<TicketStatus, string> = {
    open: 'bg-red-600',
    investigating: 'bg-amber-600',
    resolved: 'bg-emerald-600',
  };

  const severityColor: Record<TicketSeverity, string> = {
    critical: 'bg-red-600',
    high: 'bg-orange-600',
    medium: 'bg-amber-600',
    low: 'bg-blue-600',
  };

  return (
    <div className="space-y-4">
      {/* Create ticket form */}
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-1" /> New Ticket
        </Button>
      ) : (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Create Triage Ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-gray-400">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-400">Description</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full h-20 bg-gray-900 border border-gray-700 rounded-md p-2 text-white text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-400">Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as TicketSeverity })}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-400">Component</Label>
                <Input
                  value={form.component}
                  onChange={(e) => setForm({ ...form, component: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                  placeholder="e.g. AuthProvider"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">Create</Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); onClearPrefill(); }} className="text-gray-400">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ticket table + detail */}
      <div className="flex gap-4">
        <div className={`flex-1 ${selectedTicket ? 'max-w-[60%]' : ''}`}>
          {tickets.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8 text-center text-gray-500">No tickets yet.</CardContent>
            </Card>
          ) : (
            <div className="rounded-md border border-gray-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-transparent">
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Severity</TableHead>
                    <TableHead className="text-gray-400">Title</TableHead>
                    <TableHead className="text-gray-400">Component</TableHead>
                    <TableHead className="text-gray-400">Created</TableHead>
                    <TableHead className="text-gray-400 w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((t) => (
                    <TableRow
                      key={t.id}
                      className={`border-gray-700 cursor-pointer ${selectedTicket?.id === t.id ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
                      onClick={() => setSelectedTicket(t)}
                    >
                      <TableCell>
                        <Badge className={`${statusColor[t.status]} text-xs`}>{t.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${severityColor[t.severity]} text-xs`}>{t.severity}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">{t.title}</TableCell>
                      <TableCell className="text-gray-400 text-xs">{t.component || '—'}</TableCell>
                      <TableCell className="text-gray-400 text-xs whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-red-400" onClick={() => deleteTicket(t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Ticket detail */}
        {selectedTicket && (
          <div className="w-[40%] min-w-[300px]">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">{selectedTicket.title}</CardTitle>
                <div className="flex gap-2 mt-1">
                  <Badge className={statusColor[selectedTicket.status]}>{selectedTicket.status}</Badge>
                  <Badge className={severityColor[selectedTicket.severity]}>{selectedTicket.severity}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {selectedTicket.description && (
                  <p className="text-gray-300">{selectedTicket.description}</p>
                )}
                <div>
                  <Label className="text-gray-400">Update Status</Label>
                  <Select value={selectedTicket.status} onValueChange={(v) => updateTicketStatus(selectedTicket.id, v as TicketStatus)}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-400 mb-1 block">Notes ({selectedTicket.notes.length})</Label>
                  {selectedTicket.notes.map((n, i) => (
                    <p key={i} className="text-gray-300 bg-gray-900 p-2 rounded text-xs mb-1">{n}</p>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={noteInputs[selectedTicket.id] ?? ''}
                      onChange={(e) => setNoteInputs((prev) => ({ ...prev, [selectedTicket.id]: e.target.value }))}
                      placeholder="Add a note..."
                      className="bg-gray-900 border-gray-700 text-white text-xs"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNote(selectedTicket.id)}
                    />
                    <Button size="sm" onClick={() => handleAddNote(selectedTicket.id)} className="bg-blue-600 hover:bg-blue-700">
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
