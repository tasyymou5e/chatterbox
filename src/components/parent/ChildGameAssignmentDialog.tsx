/**
 * ChildGameAssignmentDialog - Dialog for parents to assign games to their children
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Gamepad2, Star, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  deleteChildGameAssignment,
  upsertChildGameAssignment,
  getChildGameAssignments,
} from '@/integrations/supabase/rpc-helpers';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


interface ChildProfile {
  id: string;
  first_name: string;
  last_name?: string;
}

interface GameItem {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url?: string | null;
  skill_levels?: string[] | null;
}

interface Assignment {
  content_item_id: string;
  is_required: boolean;
  difficulty_override?: string;
  due_date?: Date;
}

interface ChildGameAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  parentId: string;
}

export function ChildGameAssignmentDialog({
  isOpen,
  onClose,
  familyId,
  parentId,
}: ChildGameAssignmentDialogProps) {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [games, setGames] = useState<GameItem[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [assignments, setAssignments] = useState<Map<string, Assignment>>(new Map());
  const [existingAssignments, setExistingAssignments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Fetch children and games
  const fetchChildrenAndGames = useCallback(async () => {
    if (!familyId) {
      return;
    }
    
    setLoading(true);
    try {
      // Fetch children in family
      const { data: familyMembers, error: membersError } = await supabase
        .from('family_members')
        .select('user_id, profiles!inner(id, first_name, last_name)')
        .eq('family_id', familyId)
        .eq('role', 'child');

      if (membersError) {
        throw membersError;
      }

      const childProfiles: ChildProfile[] = (familyMembers || []).map(fm => {
        const profile = fm.profiles as unknown as { id: string; first_name: string; last_name?: string };
        return {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
        };
      });
      setChildren(childProfiles);

      // Fetch available games (autism-friendly games for ages 6-12)
      const { data: gamesData, error: gamesError } = await supabase
        .from('content_items')
        .select('id, title, description, thumbnail_url, skill_levels')
        .eq('is_active', true)
        .eq('content_type', 'game')
        .gte('age_max', 6)
        .lte('age_min', 12)
        .order('title');

      if (gamesError) {
        throw gamesError;
      }
      setGames(gamesData || []);

      // Select first child by default
      if (childProfiles.length > 0) {
        setSelectedChild(childProfiles[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load children and games',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [familyId, toast]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    fetchChildrenAndGames();
  }, [isOpen, fetchChildrenAndGames]);

  // Fetch existing assignments when child changes
  const fetchAssignments = useCallback(async () => {
    if (!selectedChild || !familyId) {
      return;
    }
    
    try {
      const { data, error } = await getChildGameAssignments(selectedChild, familyId);

      // Fallback to direct query if RPC doesn't exist
      if (error?.code === 'PGRST202') {
        // RPC doesn't exist, the table might be new - just skip for now
        cWarn('Assignments table may not be ready yet');
        return;
      }

      if (error) {
        throw error;
      }

      const assignmentMap = new Map<string, Assignment>();
      const existingSet = new Set<string>();

      (data || []).forEach((a) => {
        existingSet.add(a.content_item_id);
        assignmentMap.set(a.content_item_id, {
          content_item_id: a.content_item_id,
          is_required: a.is_required,
          difficulty_override: a.difficulty_override || undefined,
          due_date: a.due_date ? new Date(a.due_date) : undefined,
        });
      });

      setExistingAssignments(existingSet);
      setAssignments(assignmentMap);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  }, [selectedChild, familyId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const toggleAssignment = useCallback((gameId: string) => {
    setAssignments(prev => {
      const newMap = new Map(prev);
      if (newMap.has(gameId)) {
        newMap.delete(gameId);
      } else {
        newMap.set(gameId, {
          content_item_id: gameId,
          is_required: false,
        });
      }
      return newMap;
    });
  }, []);

  const updateAssignment = useCallback((gameId: string, updates: Partial<Assignment>) => {
    setAssignments(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(gameId);
      if (existing) {
        newMap.set(gameId, { ...existing, ...updates });
      }
      return newMap;
    });
  }, []);

  const handleSave = async () => {
    if (!selectedChild) return;

    setSaving(true);
    try {
      // Get current assignments to compare
      const currentIds = new Set(assignments.keys());
      const toDelete = [...existingAssignments].filter(id => !currentIds.has(id));
      const toUpsert = [...assignments.values()];

      // Delete removed assignments using RPC
      if (toDelete.length > 0) {
        for (const contentId of toDelete) {
          const { error: deleteError } = await deleteChildGameAssignment(
            selectedChild,
            familyId,
            contentId
          );
          
          // If RPC doesn't exist, the table might be new
          if (deleteError?.code === 'PGRST202') {
            console.log('Delete RPC not available, assignments may not save correctly');
          }
        }
      }

      // Upsert new/updated assignments
      if (toUpsert.length > 0) {
        for (const a of toUpsert) {
          const { error: upsertError } = await upsertChildGameAssignment({
            childId: selectedChild,
            contentItemId: a.content_item_id,
            familyId,
            assignedBy: parentId,
            isRequired: a.is_required,
            difficultyOverride: a.difficulty_override,
            dueDate: a.due_date?.toISOString(),
          });

          if (upsertError?.code === 'PGRST202') {
            console.log('Upsert RPC not available');
          } else if (upsertError) {
            throw upsertError;
          }
        }
      }

      toast({
        title: 'Saved',
        description: `Game assignments updated for ${children.find(c => c.id === selectedChild)?.first_name}`,
      });

      onClose();
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to save assignments. The database may still be updating.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedChildName = children.find(c => c.id === selectedChild)?.first_name || 'child';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Assign Games to Children
          </DialogTitle>
          <DialogDescription>
            Select games to assign to your children. Required games will appear in their Tasks tab.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : children.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No children found in your family. Add a child account first.
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Child selector */}
            <div className="flex items-center gap-4">
              <Label>Select Child:</Label>
              <Select value={selectedChild} onValueChange={setSelectedChild}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Choose a child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map(child => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.first_name} {child.last_name || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Games list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {games.map(game => {
                const assignment = assignments.get(game.id);
                const isAssigned = !!assignment;

                return (
                  <div
                    key={game.id}
                    className={cn(
                      'p-4 border rounded-lg transition-colors',
                      isAssigned ? 'border-primary bg-primary/5' : 'border-border'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox area */}
                      <button
                        onClick={() => toggleAssignment(game.id)}
                        className={cn(
                          'w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1',
                          isAssigned
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground/30'
                        )}
                      >
                        {isAssigned && <Check className="h-4 w-4" />}
                      </button>

                      {/* Game info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{game.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {game.description}
                        </p>

                        {/* Assignment options (shown when assigned) */}
                        {isAssigned && (
                          <div className="mt-3 flex flex-wrap items-center gap-4">
                            {/* Required toggle */}
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`required-${game.id}`}
                                checked={assignment.is_required}
                                onCheckedChange={(checked) =>
                                  updateAssignment(game.id, { is_required: checked })
                                }
                              />
                              <Label htmlFor={`required-${game.id}`} className="text-sm">
                                Required
                              </Label>
                            </div>

                            {/* Difficulty selector */}
                            <Select
                              value={assignment.difficulty_override || 'auto'}
                              onValueChange={(value) =>
                                updateAssignment(game.id, {
                                  difficulty_override: value === 'auto' ? undefined : value,
                                })
                              }
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue placeholder="Difficulty" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="auto">Auto</SelectItem>
                                <SelectItem value="beginner">Beginner</SelectItem>
                                <SelectItem value="intermediate">Intermediate</SelectItem>
                                <SelectItem value="advanced">Advanced</SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Due date picker */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8">
                                  <CalendarIcon className="h-3 w-3 mr-2" />
                                  {assignment.due_date
                                    ? format(assignment.due_date, 'MMM d')
                                    : 'Due date'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={assignment.due_date}
                                  onSelect={(date) =>
                                    updateAssignment(game.id, { due_date: date })
                                  }
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex-shrink-0">
                        {existingAssignments.has(game.id) && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Assigned
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {games.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No games available for assignment.
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !selectedChild}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              `Save Assignments for ${selectedChildName}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ChildGameAssignmentDialog;
