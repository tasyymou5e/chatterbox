import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bug, User, Activity } from 'lucide-react';
import { ApplicationLogs } from '@/components/admin/ApplicationLogs';
import { UserActivityLogs } from '@/components/admin/UserActivityLogs';
import { SystemHealthLogs } from '@/components/admin/SystemHealthLogs';
import { EdgeFunctionLogs } from '@/components/admin/EdgeFunctionLogs';
import { DatabaseLogs } from './DatabaseLogs';

export const LogsTabContent = () => {
  return (
    <Tabs defaultValue="application" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="application">Application</TabsTrigger>
        <TabsTrigger value="activity">User Activity</TabsTrigger>
        <TabsTrigger value="database">Database</TabsTrigger>
        <TabsTrigger value="edge-functions">Edge Functions</TabsTrigger>
        <TabsTrigger value="health">System Health</TabsTrigger>
      </TabsList>

      <TabsContent value="application">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Application Logs
            </CardTitle>
            <CardDescription>
              System errors and performance metrics - Live data from system_errors table
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApplicationLogs />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="activity">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Activity Logs
            </CardTitle>
            <CardDescription>
              Authentication events and user interactions - Live data available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserActivityLogs />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="database">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Database Logs
            </CardTitle>
            <CardDescription>
              PostgreSQL logs via Supabase analytics integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DatabaseLogs />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="edge-functions">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Edge Function Logs
            </CardTitle>
            <CardDescription>
              Serverless function execution logs and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EdgeFunctionLogs />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="health">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health Logs
            </CardTitle>
            <CardDescription>
              Performance metrics and health monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SystemHealthLogs />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
