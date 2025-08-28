import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Users, 
  Shield, 
  Activity, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Eye,
  Download
} from 'lucide-react';
import ActivityLogsTable from '@/components/reports/ActivityLogsTable';
import FamilyActivityReport from '@/components/reports/FamilyActivityReport';
import { useAuth } from '@/hooks/useAuth';

const Reports = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    variant = 'default' 
  }: {
    title: string;
    value: string | number;
    description: string;
    icon: any;
    variant?: 'default' | 'success' | 'warning' | 'destructive';
  }) => {
    const variants = {
      default: 'bg-primary/10 text-primary',
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
      destructive: 'bg-destructive/10 text-destructive'
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
            <div className={`p-3 rounded-full ${variants[variant]}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground">Please log in to access activity reports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Reports</h1>
          <p className="text-muted-foreground mt-2">
            Monitor parent and child login activities, security events, and family usage patterns.
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Live Monitoring
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity-logs" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Activity Logs
          </TabsTrigger>
          <TabsTrigger value="family-reports" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Family Reports
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Sessions Today"
              value="0"
              description="Active user sessions"
              icon={Activity}
              variant="default"
            />
            <StatCard
              title="Successful Logins"
              value="0"
              description="Last 24 hours"
              icon={CheckCircle}
              variant="success"
            />
            <StatCard
              title="Failed Attempts"
              value="0"
              description="Security incidents"
              icon={AlertTriangle}
              variant="warning"
            />
            <StatCard
              title="Active Families"
              value="0"
              description="With recent activity"
              icon={Users}
              variant="default"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity data available.</p>
                    <p className="text-sm">Start logging in to see activity summaries here.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No security alerts.</p>
                    <p className="text-sm">Your account security looks good.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity-logs">
          <ActivityLogsTable />
        </TabsContent>

        <TabsContent value="family-reports">
          <FamilyActivityReport />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-success/5 rounded-lg border border-success/20">
                  <CheckCircle className="w-8 h-8 mx-auto mb-3 text-success" />
                  <h3 className="font-semibold text-success">Account Secure</h3>
                  <p className="text-sm text-muted-foreground mt-1">No suspicious activity detected</p>
                </div>
                
                <div className="text-center p-6 bg-primary/5 rounded-lg border border-primary/20">
                  <Eye className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold">Active Monitoring</h3>
                  <p className="text-sm text-muted-foreground mt-1">Real-time security tracking enabled</p>
                </div>

                <div className="text-center p-6 bg-muted/50 rounded-lg border">
                  <Activity className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-semibold">Session Management</h3>
                  <p className="text-sm text-muted-foreground mt-1">Automatic session security</p>
                </div>
              </div>

              <div className="mt-8">
                <h4 className="font-semibold mb-4">Security Features</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <div>
                      <div className="font-medium">Failed Login Tracking</div>
                      <div className="text-sm text-muted-foreground">Monitor and alert on suspicious login attempts</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <div>
                      <div className="font-medium">Session Management</div>
                      <div className="text-sm text-muted-foreground">Automatically end inactive sessions</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <div>
                      <div className="font-medium">Device Tracking</div>
                      <div className="text-sm text-muted-foreground">Log device information for security audits</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <div>
                      <div className="font-medium">Parental Oversight</div>
                      <div className="text-sm text-muted-foreground">Parents can monitor child account activities</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;