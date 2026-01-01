import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useChoreManagement } from '@/hooks/useChoreManagement';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logSupabaseQuery, logDataAccessIssue, createQueryTimer } from '@/utils/parentPortalLogger';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Clock, 
  Star, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Calendar as CalendarIcon,
  Target,
  TrendingUp,
  UserPlus,
  Loader2
} from 'lucide-react';

interface Family {
  id: string;
  name: string;
  display_name: string;
}

interface FamilyMember {
  user_id: string;
  role: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface ChoreManagementDashboardProps {
  familyId: string;
}

export const ChoreManagementDashboard = ({ familyId }: ChoreManagementDashboardProps) => {
  const {
    categories,
    templates,
    chores,
    assignments,
    loading,
    createChoreFromTemplate,
    assignChore,
    updateAssignmentStatus,
  } = useChoreManagement(familyId);

  // Auth state for button validation
  const { user, sessionReady } = useAuthStore();
  const isAuthenticated = sessionReady && user?.id;

  const [family, setFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  // Assign chore dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedChoreId, setSelectedChoreId] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Loading state for creating chores
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);

  // Filter to get only child members for assignment
  const childMembers = familyMembers.filter(m => m.role === 'child');

  // Fetch family details and members
  useEffect(() => {
    const fetchFamilyData = async () => {
      const timer = createQueryTimer();
      
      // Fetch family info
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('id, name, display_name')
        .eq('id', familyId)
        .single();

      logSupabaseQuery(
        { component: 'ChoresDashboard', operation: 'fetchFamily', familyId, table: 'families' },
        { success: !familyError, error: familyError || undefined, rowCount: familyData ? 1 : 0 }
      );

      if (familyError) {
        logDataAccessIssue('ChoresDashboard', 'Failed to fetch family', {
          familyId,
          expectedData: 'family record',
          actualResult: familyError.message,
          possibleCause: 'Family may not exist or user lacks access'
        });
        return;
      }

      setFamily(familyData);

      // Fetch family members with proper join
      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select(`
          user_id,
          role,
          profiles (
            first_name,
            last_name
          )
        `)
        .eq('family_id', familyId);

      logSupabaseQuery(
        { component: 'ChoresDashboard', operation: 'fetchFamilyMembers', familyId, table: 'family_members' },
        { success: !membersError, error: membersError || undefined, rowCount: membersData?.length || 0, duration: timer.elapsed() }
      );

      if (membersError) {
        logDataAccessIssue('ChoresDashboard', 'Failed to fetch family members', {
          familyId,
          expectedData: 'family members',
          actualResult: membersError.message,
          possibleCause: 'RLS policy may be blocking access'
        });
        return;
      }

      // Type assertion to handle the Supabase response
      setFamilyMembers(membersData as any || []);
    };

    fetchFamilyData();
  }, [familyId]);

  // Quick stats
  const stats = {
    totalChores: chores.length,
    activeAssignments: assignments.filter(a => a.status === 'assigned').length,
    completedToday: assignments.filter(a => 
      a.status === 'completed' && 
      new Date(a.completed_at || '').toDateString() === new Date().toDateString()
    ).length,
    pendingVerification: assignments.filter(a => a.status === 'completed' && !a.is_verified).length,
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to create chores.',
        variant: 'destructive',
      });
      return;
    }
    
    setCreatingTemplateId(templateId);
    try {
      // createChoreFromTemplate returns the created chore data directly (via useStoreResult)
      // It returns null on failure, or the chore object on success
      const newChore = await createChoreFromTemplate(templateId);
      if (newChore?.id) {
        // Open assign dialog with the newly created chore pre-selected
        setSelectedChoreId(newChore.id);
        setAssignDialogOpen(true);
        // Success toast is already shown by useStoreResult hook
      }
      // Error toast is already shown by useStoreResult hook
    } finally {
      setCreatingTemplateId(null);
    }
  };

  const handleQuickAssign = async (choreId: string, memberId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await assignChore(choreId, memberId, tomorrow.toISOString().split('T')[0]);
  };

  const handleAssignSubmit = async () => {
    if (!selectedChoreId || !selectedMemberId) {
      toast({ 
        title: 'Error', 
        description: 'Please select a chore and family member', 
        variant: 'destructive' 
      });
      return;
    }
    
    setIsAssigning(true);
    try {
      // assignChore returns the assignment data directly on success, null on failure
      // Success/error toasts are already handled by useStoreResult hook
      const assignmentData = await assignChore(
        selectedChoreId, 
        selectedMemberId, 
        dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined
      );
      
      // Check if assignment data was returned (has id = success)
      if (assignmentData?.id) {
        // Close dialog and reset state - toast already shown by useStoreResult
        setAssignDialogOpen(false);
        setSelectedChoreId('');
        setSelectedMemberId('');
        setDueDate(undefined);
      }
      // Error toast is already shown by useStoreResult hook, no need for duplicate
    } finally {
      setIsAssigning(false);
    }
  };

  const handleVerifyCompletion = async (assignmentId: string) => {
    await updateAssignmentStatus(assignmentId, 'verified');
    toast({
      title: 'Completion Verified',
      description: 'Great job! The chore has been verified.',
    });
  };

  const openAssignDialog = () => {
    setSelectedChoreId('');
    setSelectedMemberId('');
    setDueDate(undefined);
    setAssignDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading chore management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Chore Management</h1>
          <p className="text-muted-foreground">
            Manage daily tasks for {family?.display_name || 'your family'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openAssignDialog} className="bg-primary hover:bg-primary/90">
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Chore
          </Button>
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Chore
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Chores</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalChores}</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Assignments</p>
                <p className="text-2xl font-bold text-foreground">{stats.activeAssignments}</p>
              </div>
              <Clock className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-bold text-foreground">{stats.completedToday}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Verification</p>
                <p className="text-2xl font-bold text-foreground">{stats.pendingVerification}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card className="bg-gradient-card shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Chore Templates
              </CardTitle>
              <CardDescription>
                Create chores from pre-built autism-friendly templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-medium transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold text-foreground">{template.title}</h3>
                          <Badge variant="secondary">
                            {template.difficulty}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {template.estimated_duration}min
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {template.base_points} points
                          </span>
                        </div>
                        
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleCreateFromTemplate(template.id)}
                          disabled={!isAuthenticated || creatingTemplateId === template.id}
                        >
                          {creatingTemplateId === template.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : !isAuthenticated ? (
                            'Please log in'
                          ) : (
                            'Create Chore'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card className="bg-gradient-card shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Current Assignments
              </CardTitle>
              <CardDescription>
                Manage active chore assignments for family members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-foreground">
                          {assignment.chores?.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Assigned to: {assignment.profiles?.first_name} {assignment.profiles?.last_name}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
                          </span>
                          <Badge 
                            variant={
                              assignment.status === 'completed' ? 'default' :
                              assignment.status === 'verified' ? 'secondary' :
                              assignment.status === 'overdue' ? 'destructive' : 'outline'
                            }
                          >
                            {assignment.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {assignment.status === 'completed' && !assignment.is_verified && (
                          <Button
                            size="sm"
                            onClick={() => handleVerifyCompletion(assignment.id)}
                            className="bg-secondary hover:bg-secondary-hover"
                          >
                            Verify
                          </Button>
                        )}
                        
                        {assignment.status === 'assigned' && (
                          <div className="text-sm text-muted-foreground">
                            {assignment.chores?.base_points} points
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {assignments.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No active assignments</p>
                    <Button onClick={openAssignDialog}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign First Chore
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card className="bg-gradient-card shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Family Progress
              </CardTitle>
              <CardDescription>
                Track completion rates and engagement across family members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {familyMembers.map((member) => {
                  const memberAssignments = assignments.filter(a => a.assigned_to === member.user_id);
                  const completed = memberAssignments.filter(a => a.status === 'verified').length;
                  const completionRate = memberAssignments.length > 0 ? 
                    Math.round((completed / memberAssignments.length) * 100) : 0;

                  return (
                    <div key={member.user_id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-foreground">
                          {member.profiles?.first_name} {member.profiles?.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {completed} completed • {memberAssignments.length} total
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground">{completionRate}%</div>
                        <div className="text-sm text-muted-foreground">Completion Rate</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card className="bg-gradient-card shadow-soft">
            <CardHeader>
              <CardTitle>Detailed Analytics</CardTitle>
              <CardDescription>
                Coming soon: Comprehensive analytics and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Advanced analytics features will be available soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Chore Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Assign Chore
            </DialogTitle>
            <DialogDescription>
              Select a chore and family member to create an assignment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Chore Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select Chore</label>
              <Select value={selectedChoreId} onValueChange={setSelectedChoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a chore..." />
                </SelectTrigger>
                <SelectContent>
                  {chores.map((chore) => (
                    <SelectItem key={chore.id} value={chore.id}>
                      <div className="flex items-center gap-2">
                        <span>{chore.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {chore.base_points} pts
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {chores.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No chores available. Create one from a template first.
                </p>
              )}
            </div>

            {/* Family Member Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Assign To</label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a family member..." />
                </SelectTrigger>
                <SelectContent>
                  {childMembers.length > 0 ? (
                    childMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.profiles?.first_name} {member.profiles?.last_name}
                      </SelectItem>
                    ))
                  ) : (
                    familyMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.profiles?.first_name} {member.profiles?.last_name}
                        <Badge variant="outline" className="ml-2 text-xs">{member.role}</Badge>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {familyMembers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No family members found.
                </p>
              )}
            </div>

            {/* Due Date Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Due Date (Optional)</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignSubmit}
              disabled={!selectedChoreId || !selectedMemberId || isAssigning}
            >
              {isAssigning ? 'Assigning...' : 'Assign Chore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
