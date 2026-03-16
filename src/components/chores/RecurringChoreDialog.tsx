import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarIcon, 
  RefreshCw,
  Check
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { RecurrencePattern } from '@/types/chore';

interface RecurringChoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (pattern: RecurrencePattern) => void;
  initialPattern?: RecurrencePattern;
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'weekly', label: 'Weekly', description: 'Same day each week' },
  { value: 'custom', label: 'Custom', description: 'Every X days' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export const RecurringChoreDialog: React.FC<RecurringChoreDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  initialPattern,
}) => {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom'>(
    initialPattern?.frequency || 'weekly'
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    initialPattern?.daysOfWeek || [1] // Default Monday
  );
  const [interval, setInterval] = useState(initialPattern?.interval || 2);
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialPattern?.endDate ? new Date(initialPattern.endDate) : undefined
  );
  const [maxOccurrences] = useState<number | undefined>(
    initialPattern?.maxOccurrences
  );

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day) 
        : [...prev, day].sort()
    );
  };

  const previewDates = useMemo(() => {
    const dates: Date[] = [];
    let current = new Date();
    
    for (let i = 0; i < 5 && dates.length < 3; i++) {
      if (frequency === 'daily') {
        dates.push(addDays(current, dates.length + 1));
      } else if (frequency === 'weekly') {
        if (daysOfWeek.length > 0) {
          let nextDate = addDays(current, 1);
          for (let j = 0; j < 14 && dates.length < 3; j++) {
            if (daysOfWeek.includes(nextDate.getDay())) {
              dates.push(new Date(nextDate));
            }
            nextDate = addDays(nextDate, 1);
          }
        }
      } else if (frequency === 'custom') {
        for (let k = 0; k < 3; k++) {
          dates.push(addDays(current, (k + 1) * interval));
        }
      }
    }
    
    return dates.slice(0, 3);
  }, [frequency, daysOfWeek, interval]);

  const handleSave = () => {
    const pattern: RecurrencePattern = {
      frequency,
      interval: frequency === 'custom' ? interval : 1,
      ...(frequency === 'weekly' && daysOfWeek.length > 0 ? { daysOfWeek } : {}),
      ...(endDate ? { endDate: endDate.toISOString().split('T')[0] } : {}),
      ...(maxOccurrences !== undefined ? { maxOccurrences } : {}),
    };
    onSave(pattern);
    onOpenChange(false);
  };

  const isValid = frequency === 'weekly' ? daysOfWeek.length > 0 : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Recurring Schedule
          </DialogTitle>
          <DialogDescription>
            Set up automatic task repetition
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Frequency Selection */}
          <div className="space-y-2">
            <Label>Repeat</Label>
            <div className="grid grid-cols-3 gap-2">
              {FREQUENCY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFrequency(option.value as 'daily' | 'weekly' | 'custom')}
                  className={cn(
                    "p-3 rounded-lg border text-center transition-[background-color,border-color,box-shadow]",
                    frequency === option.value 
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20" 
                      : "hover:bg-muted"
                  )}
                >
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Weekly: Day Selection */}
          {frequency === 'weekly' && (
            <div className="space-y-2">
              <Label>On these days</Label>
              <div className="flex gap-1 justify-between">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "w-10 h-10 rounded-full text-sm font-medium transition-colors",
                      daysOfWeek.includes(day.value)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {daysOfWeek.length === 0 && (
                <p className="text-xs text-destructive">Select at least one day</p>
              )}
            </div>
          )}

          {/* Custom: Interval */}
          {frequency === 'custom' && (
            <div className="space-y-2">
              <Label>Every</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20"
                />
                <span className="text-muted-foreground">days</span>
              </div>
            </div>
          )}

          {/* End Date */}
          <div className="space-y-2">
            <Label>End Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "No end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
                {endDate && (
                  <div className="p-2 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setEndDate(undefined)}
                      className="w-full"
                    >
                      Clear end date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Next occurrences</Label>
            <div className="flex flex-wrap gap-2">
              {previewDates.map((date, index) => (
                <Badge key={index} variant="secondary">
                  {format(date, 'EEE, MMM d')}
                </Badge>
              ))}
              {previewDates.length > 0 && (
                <Badge variant="outline">...</Badge>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            <Check className="mr-2 h-4 w-4" />
            Save Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
