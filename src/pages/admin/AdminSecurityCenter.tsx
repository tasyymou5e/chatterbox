/**
 * Comprehensive admin security center
 */
import React from 'react';
import { SecurityDashboard } from '@/components/security/SecurityDashboard';
import { SecurityAuditTrail } from '@/components/security/SecurityAuditTrail';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Activity, FileText, AlertTriangle } from 'lucide-react';

export const AdminSecurityCenter: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Security Center</h1>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Audit Trail</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Configuration</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <SecurityDashboard />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <SecurityAuditTrail />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <div className="text-center py-8 text-muted-foreground">
            Real-time security alerts are integrated into the dashboard.
            Check the Dashboard tab for active monitoring.
          </div>
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <div className="text-center py-8 text-muted-foreground">
            Security configuration panel coming soon.
            Current settings can be managed through the database.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};