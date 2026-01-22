/**
 * Fallback components for admin dashboards when data is unavailable
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Shield, 
  BarChart3, 
  Database,
  Users,
  Home,
  Activity
} from 'lucide-react';

// Default fallback data for KPI cards
export const DEFAULT_KPI_DATA = {
  totalFamilies: 0,
  totalUsers: 0,
  totalParents: 0,
  totalChildren: 0,
  recentSignups: 0,
  activeUsers: 0,
  totalLogins: 0
};

// Default system health data
export const DEFAULT_SYSTEM_HEALTH = [
  { service_name: 'Database', status: 'healthy' as const, response_time: 0, uptime_percentage: 99.9 },
  { service_name: 'Auth', status: 'healthy' as const, response_time: 0, uptime_percentage: 99.9 },
  { service_name: 'Storage', status: 'healthy' as const, response_time: 0, uptime_percentage: 99.9 },
  { service_name: 'API', status: 'healthy' as const, response_time: 0, uptime_percentage: 99.9 }
];

// Default security metrics
export const DEFAULT_SECURITY_METRICS = {
  total_alerts: 0,
  rls_violations: 0,
  failed_activities: 0,
  system_errors: 0,
  severity_breakdown: { critical: 0, high: 0, medium: 0, low: 0 },
  top_threat_indicators: []
};

interface FallbackCardProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  onRetry?: () => void;
  loading?: boolean;
  error?: string | null;
}

/**
 * Generic fallback card for when individual widgets fail
 */
export const FallbackCard: React.FC<FallbackCardProps> = ({
  title,
  description = 'Data temporarily unavailable',
  icon: Icon = AlertTriangle,
  onRetry,
  loading = false,
  error
}) => {
  return (
    <Card className="bg-muted/30 border-border">
      <CardHeader>
        <CardTitle className="flex items-center text-foreground">
          <Icon className="h-5 w-5 mr-2 text-muted-foreground" />
          {title}
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-center py-6 text-muted-foreground">
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : (
            <>
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{error || 'Unable to load data'}</p>
              {onRetry && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={onRetry}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Full dashboard fallback when the entire dashboard fails to load
 */
export const DashboardFallback: React.FC<{
  title?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
}> = ({ 
  title = 'Dashboard', 
  onRetry,
  onGoHome 
}) => {
  return (
    <div className="p-6 space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{title} Temporarily Unavailable</AlertTitle>
        <AlertDescription>
          We're having trouble loading the dashboard data. You can try refreshing or come back later.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FallbackCard title="Total Families" icon={Home} />
        <FallbackCard title="Total Users" icon={Users} />
        <FallbackCard title="Active Users" icon={Activity} />
        <FallbackCard title="System Health" icon={Database} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FallbackCard title="Analytics" icon={BarChart3} description="Charts temporarily unavailable" />
        <FallbackCard title="Security Status" icon={Shield} description="Security metrics unavailable" />
      </div>

      <div className="flex justify-center gap-3 pt-4">
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Loading
          </Button>
        )}
        {onGoHome && (
          <Button onClick={onGoHome} variant="ghost">
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Security dashboard specific fallback
 */
export const SecurityDashboardFallback: React.FC<{
  onRetry?: () => void;
}> = ({ onRetry }) => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Security Operations Center</h1>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Limited Security Data</AlertTitle>
        <AlertDescription>
          Security metrics are temporarily unavailable. The system is still actively monitoring.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Total Alerts', 'RLS Violations', 'Failed Activities', 'System Errors'].map((title) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">--</div>
              <p className="text-xs text-muted-foreground">Data unavailable</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardFallback;
