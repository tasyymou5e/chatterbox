import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Shield, 
  HardDrive, 
  Zap, 
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';

interface SystemHealthData {
  service_name: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time?: number;
  uptime_percentage?: number;
  error_rate?: number;
}

interface SystemHealthWidgetProps {
  data: SystemHealthData[];
  loading?: boolean;
}

const getServiceIcon = (serviceName: string) => {
  switch (serviceName.toLowerCase()) {
    case 'database':
      return Database;
    case 'auth':
      return Shield;
    case 'storage':
      return HardDrive;
    case 'api':
      return Zap;
    default:
      return Clock;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-4 w-4 text-secondary" />;
    case 'degraded':
      return <AlertTriangle className="h-4 w-4 text-accent" />;
    case 'down':
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'healthy':
      return <Badge variant="secondary" className="bg-secondary/10 text-secondary border-secondary/20">Healthy</Badge>;
    case 'degraded':
      return <Badge variant="destructive" className="bg-accent/10 text-accent border-accent/20">Degraded</Badge>;
    case 'down':
      return <Badge variant="destructive">Down</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

export const SystemHealthWidget = ({ data, loading = false }: SystemHealthWidgetProps) => {
  if (loading) {
    return (
      <Card className="bg-gradient-card border-border shadow-soft">
        <CardHeader>
          <CardTitle className="text-foreground">System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="bg-muted-foreground/20 rounded h-4 w-20"></div>
                <div className="bg-muted-foreground/20 rounded h-6 w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default system services if no data provided
  const defaultServices = [
    { service_name: 'Database', status: 'healthy', response_time: 12, uptime_percentage: 99.9 },
    { service_name: 'Auth', status: 'healthy', response_time: 8, uptime_percentage: 99.8 },
    { service_name: 'Storage', status: 'healthy', response_time: 15, uptime_percentage: 99.7 },
    { service_name: 'API', status: 'healthy', response_time: 25, uptime_percentage: 99.9 }
  ];

  const services = data.length > 0 ? data : defaultServices;

  return (
    <Card className="bg-gradient-card border-border shadow-soft">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center">
          <Database className="h-5 w-5 mr-2 text-primary" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {services.map((service, index) => {
            const ServiceIcon = getServiceIcon(service.service_name);
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center space-x-3">
                  <ServiceIcon className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground capitalize">
                    {service.service_name}
                  </span>
                  {getStatusIcon(service.status)}
                </div>
                <div className="flex items-center space-x-3">
                  {service.response_time && (
                    <span className="text-sm text-muted-foreground">
                      {service.response_time}ms
                    </span>
                  )}
                  {service.uptime_percentage && (
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={service.uptime_percentage} 
                        className="w-16 h-2"
                      />
                      <span className="text-xs text-muted-foreground min-w-[35px]">
                        {service.uptime_percentage}%
                      </span>
                    </div>
                  )}
                  {getStatusBadge(service.status)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};