/**
 * AdminSystemMonitoring Page
 * 
 * @description Refactored system monitoring dashboard using modular components
 * and a custom hook for state management. Displays error statistics, recent
 * errors, system alerts, and logs with real-time updates.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  RefreshCw, 
  Wifi,
  WifiOff,
  User,
  FileText,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSystemMonitoring } from '@/hooks/useSystemMonitoring';
import { 
  ErrorStatisticsCards,
  SystemErrorsPanel,
  SystemAlertsPanel,
  ErrorDetailModal,
  CircuitBreakerAlert,
  LogsTabContent
} from '@/components/admin/monitoring';
import type { SystemError } from '@/types/systemHealth';
import { cLog, cError } from '@/utils/conditionalLogger';

const AdminSystemMonitoring = () => {
  const [selectedError, setSelectedError] = useState<SystemError | null>(null);
  const { toast } = useToast();
  
  const {
    errors,
    statistics,
    alerts,
    loading,
    authDebugInfo,
    isAuthenticated,
    isAuthenticating,
    isCircuitBreakerOpen,
    refreshData,
    resolveError,
    acknowledgeAlert,
    resetCircuitBreaker,
    circuitBreakerState
  } = useSystemMonitoring();

  const connected = isAuthenticated;

  if (loading || isAuthenticating) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">
            {isAuthenticating ? 'Authenticating...' : 'Loading system data...'}
          </p>
        </div>
      </div>
    );
  }

  const handleCreateTestError = async () => {
    try {
      await supabase.functions.invoke('error-collector', {
        body: {
          errorType: 'test_error',
          severity: 'low',
          message: 'Test error for monitoring dashboard',
          componentName: 'AdminSystemMonitoring',
          metadata: {
            source: 'manual_test',
            timestamp: new Date().toISOString()
          }
        }
      });
      toast({
        title: 'Test Error Created',
        description: 'A test error has been logged to the system',
      });
    } catch (error) {
      cError('Failed to create test error:', error);
    }
  };

  const handleForceReset = () => {
    resetCircuitBreaker();
    refreshData();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Monitoring</h1>
          <div className="flex items-center space-x-4 mt-1">
            <p className="text-muted-foreground">Error tracking and system health monitoring</p>
            <div className="flex items-center space-x-2">
              {connected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-500">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-destructive">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={refreshData} variant="outline" disabled={isCircuitBreakerOpen()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {authDebugInfo && (
            <Button 
              onClick={() => {
                cLog('Auth Debug Info:', authDebugInfo);
                toast({
                  title: 'Auth Debug Info',
                  description: `User: ${authDebugInfo.userEmail || 'None'}, Admin: ${authDebugInfo.isAdmin}, Status: ${authDebugInfo.status || authDebugInfo.error}`,
                });
              }} 
              variant="ghost" 
              size="sm"
            >
              <User className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Connection Error Alert */}
      {!connected && (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>Database connection failed. This is usually an authentication issue.</p>
              {authDebugInfo && (
                <div className="text-xs font-mono bg-destructive/10 p-2 rounded">
                  <p>User: {authDebugInfo.userEmail || 'None'}</p>
                  <p>Admin: {String(authDebugInfo.isAdmin)}</p>
                  <p>Error: {authDebugInfo.error}</p>
                </div>
              )}
              <Button onClick={refreshData} size="sm" variant="outline">
                Retry Connection
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Circuit Breaker Alert */}
      {isCircuitBreakerOpen() && (
        <CircuitBreakerAlert 
          nextRetryTime={circuitBreakerState.nextRetryTime} 
          onForceReset={handleForceReset}
        />
      )}

      {/* System Alerts */}
      {alerts.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {alerts.length} active system alert{alerts.length > 1 ? 's' : ''} require attention
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Overview */}
      {statistics && <ErrorStatisticsCards statistics={statistics} />}

      {/* Main Content Tabs */}
      <Tabs defaultValue="errors" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="errors">Recent Errors</TabsTrigger>
          <TabsTrigger value="alerts">System Alerts</TabsTrigger>
          <TabsTrigger value="patterns">Error Patterns</TabsTrigger>
          <TabsTrigger value="logs">
            <FileText className="h-4 w-4 mr-2" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="errors">
          <SystemErrorsPanel 
            errors={errors}
            onViewError={setSelectedError}
            onResolveError={resolveError}
          />
        </TabsContent>

        <TabsContent value="alerts">
          <SystemAlertsPanel 
            alerts={alerts}
            onAcknowledgeAlert={acknowledgeAlert}
          />
        </TabsContent>

        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle>Error Patterns Analysis</CardTitle>
              <CardDescription>
                Identify trends and patterns in system errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Error pattern analysis coming soon...</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={handleCreateTestError}
                >
                  Create Test Error
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <LogsTabContent />
        </TabsContent>
      </Tabs>

      {/* Error Detail Modal */}
      {selectedError && (
        <ErrorDetailModal 
          error={selectedError} 
          onClose={() => setSelectedError(null)} 
        />
      )}
    </div>
  );
};

export default AdminSystemMonitoring;
