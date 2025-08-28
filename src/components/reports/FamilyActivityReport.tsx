import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Activity, Clock, TrendingUp, Download } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface FamilyActivitySummary {
  family_id: string;
  family_name: string;
  total_activities: number;
  unique_users: number;
  login_count: number;
  failed_login_count: number;
  last_activity: string;
  members: {
    user_id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    role: string;
    activity_count: number;
    last_login?: string;
  }[];
}

const FamilyActivityReport = () => {
  const { user } = useAuth();
  const [familyReports, setFamilyReports] = useState<FamilyActivitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>('7');
  const [selectedFamily, setSelectedFamily] = useState<string>('all');

  const fetchFamilyReports = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, parseInt(dateRange));

      // First, get families that the user has access to
      const { data: families, error: familiesError } = await supabase
        .from('families')
        .select('id, name, display_name')
        .eq('created_by', user.id);

      if (familiesError) {
        console.error('Error fetching families:', familiesError);
        return;
      }

      const reports: FamilyActivitySummary[] = [];

      for (const family of families || []) {
        // Get family members
        const { data: members, error: membersError } = await supabase
          .from('family_members')
          .select(`
            user_id,
            role,
            profiles!family_members_user_id_fkey (
              first_name,
              last_name,
              email
            )
          `)
          .eq('family_id', family.id);

        if (membersError) {
          console.error('Error fetching family members:', membersError);
          continue;
        }

        // Get activity logs for family members
        const memberIds = members?.map(m => m.user_id) || [];
        if (memberIds.length === 0) continue;

        const { data: activities, error: activitiesError } = await supabase
          .from('user_activity_logs')
          .select('*')
          .in('user_id', memberIds)
          .gte('timestamp', startDate.toISOString())
          .lte('timestamp', endDate.toISOString());

        if (activitiesError) {
          console.error('Error fetching activities:', activitiesError);
          continue;
        }

        // Process activity data
        const memberActivity = members?.map(member => {
          const memberActivities = activities?.filter(a => a.user_id === member.user_id) || [];
          const lastLogin = memberActivities
            .filter(a => a.activity_type === 'login' && a.success)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

          const profile = member.profiles as any;
          return {
            user_id: member.user_id,
            first_name: profile?.first_name,
            last_name: profile?.last_name,
            email: profile?.email,
            role: member.role,
            activity_count: memberActivities.length,
            last_login: lastLogin?.timestamp
          };
        }) || [];

        const totalActivities = activities?.length || 0;
        const uniqueUsers = new Set(activities?.map(a => a.user_id)).size;
        const loginCount = activities?.filter(a => a.activity_type === 'login' && a.success).length || 0;
        const failedLoginCount = activities?.filter(a => a.activity_type === 'failed_login').length || 0;
        const lastActivity = activities?.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp;

        reports.push({
          family_id: family.id,
          family_name: family.display_name || family.name,
          total_activities: totalActivities,
          unique_users: uniqueUsers,
          login_count: loginCount,
          failed_login_count: failedLoginCount,
          last_activity: lastActivity || '',
          members: memberActivity
        });
      }

      setFamilyReports(reports);
    } catch (error) {
      console.error('Error fetching family reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyReports();
  }, [user, dateRange]);

  const exportReport = () => {
    const csvContent = [
      ['Family', 'Total Activities', 'Unique Users', 'Successful Logins', 'Failed Logins', 'Last Activity'].join(','),
      ...familyReports.map(report => [
        report.family_name,
        report.total_activities,
        report.unique_users,
        report.login_count,
        report.failed_login_count,
        report.last_activity ? format(new Date(report.last_activity), 'yyyy-MM-dd HH:mm:ss') : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family-activity-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Family Activity Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Family Activity Reports
          </CardTitle>
          <div className="flex gap-4 mt-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <Clock className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={exportReport} variant="outline" className="ml-auto">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {familyReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No family activity data found for the selected period.
            </div>
          ) : (
            <div className="grid gap-6">
              {familyReports.map((report) => (
                <Card key={report.family_id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{report.family_name}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {report.total_activities} activities
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {report.unique_users} active users
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-success/10 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-success">{report.login_count}</div>
                        <div className="text-sm text-muted-foreground">Successful Logins</div>
                      </div>
                      <div className="bg-destructive/10 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-destructive">{report.failed_login_count}</div>
                        <div className="text-sm text-muted-foreground">Failed Login Attempts</div>
                      </div>
                      <div className="bg-primary/10 p-4 rounded-lg">
                        <div className="text-sm font-medium">Last Activity</div>
                        <div className="text-sm text-muted-foreground">
                          {report.last_activity ? format(new Date(report.last_activity), 'MMM dd, HH:mm') : 'No activity'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold">Family Members Activity</h4>
                      {report.members.map((member) => (
                        <div key={member.user_id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                          <div>
                            <div className="font-medium">
                              {member.first_name || member.last_name ? 
                                `${member.first_name || ''} ${member.last_name || ''}`.trim() : 
                                member.email
                              }
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Badge variant="outline">{member.role}</Badge>
                              {member.email && (
                                <span>{member.email}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{member.activity_count} activities</div>
                            <div className="text-sm text-muted-foreground">
                              Last login: {member.last_login ? format(new Date(member.last_login), 'MMM dd, HH:mm') : 'Never'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FamilyActivityReport;