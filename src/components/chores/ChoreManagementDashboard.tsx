import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChoreManagement } from '@/hooks/useChoreManagement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Clock, 
  Star, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Target,
  TrendingUp
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

  const [family, setFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Fetch family details and members
  useEffect(() => {
    const fetchFamilyData = async () => {
      // Fetch family info
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('id, name, display_name')
        .eq('id', familyId)
        .single();

      if (familyError) {
        console.error('Error fetching family:', familyError);
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

      if (membersError) {
        console.error('Error fetching family members:', membersError);
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
    const result = await createChoreFromTemplate(templateId);
    if (result) {
      setSelectedTemplate(null);
    }
  };

  const handleQuickAssign = async (choreId: string, memberId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await assignChore(choreId, memberId, tomorrow.toISOString().split('T')[0]);
  };

  const handleVerifyCompletion = async (assignmentId: string) => {
    await updateAssignmentStatus(assignmentId, 'verified');
    toast({
      title: 'Completion Verified',
      description: 'Great job! The chore has been verified.',
    });
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
        <Button className="bg-secondary hover:bg-secondary-hover">
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Chore
        </Button>
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
                        >
                          Create Chore
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
                    <p className="text-muted-foreground mb-4">No active assignments</p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Assignment
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
    </div>
  );
};
