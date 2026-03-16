/**
 * AssignAssessmentDialog - Allows parents to assign a specific assessment to a child
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Brain, FileText, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { allInstruments } from '@/data/assessmentInstruments';

interface ChildMember {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  role: string;
}

interface AssignAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ChildMember[];
}

const instrumentIcons: Record<string, React.ReactNode> = {
  atec: <ClipboardCheck className="w-5 h-5 text-primary" />,
  dsm5_interview: <Brain className="w-5 h-5 text-secondary" />,
  dsm5tr_clinician: <FileText className="w-5 h-5 text-accent" />,
};

export function AssignAssessmentDialog({ open, onOpenChange, children }: AssignAssessmentDialogProps) {
  const navigate = useNavigate();
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedInstrument, setSelectedInstrument] = useState('');

  const handleAssign = () => {
    if (!selectedChildId || !selectedInstrument) return;
    navigate(`/assessment?childId=${selectedChildId}&type=${selectedInstrument}`);
    onOpenChange(false);
  };

  const selectedChild = children.find(c => c.user_id === selectedChildId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Assign Assessment
          </DialogTitle>
          <DialogDescription>
            Choose a child and assessment type to begin an evaluation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Child selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Select Child</label>
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a child..." />
              </SelectTrigger>
              <SelectContent>
                {children.map(child => (
                  <SelectItem key={child.user_id} value={child.user_id}>
                    {child.first_name || 'Child'} {child.last_name || ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assessment selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Assessment Type</label>
            <div className="grid gap-2">
              {allInstruments.map(inst => {
                const questionCount = inst.categories.reduce((sum, c) => sum + c.questions.length, 0);
                const isSelected = selectedInstrument === inst.id;
                return (
                  <button
                    key={inst.id}
                    type="button"
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30 hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedInstrument(inst.id)}
                  >
                    {instrumentIcons[inst.id]}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{inst.shortName}</p>
                      <p className="text-xs text-muted-foreground">{questionCount} questions</p>
                    </div>
                    {isSelected && <Badge className="bg-primary text-primary-foreground">Selected</Badge>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary & action */}
          {selectedChildId && selectedInstrument && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              Assigning <span className="font-medium text-foreground">
                {allInstruments.find(i => i.id === selectedInstrument)?.shortName}
              </span> to <span className="font-medium text-foreground">
                {selectedChild?.first_name || 'Child'} {selectedChild?.last_name || ''}
              </span>
            </div>
          )}

          <Button
            className="w-full"
            disabled={!selectedChildId || !selectedInstrument}
            onClick={handleAssign}
          >
            Start Assessment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
