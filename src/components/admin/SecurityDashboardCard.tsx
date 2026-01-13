import { useState } from 'react';
import { Shield, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SecurityMonitoringWidget from './SecurityMonitoringWidget';

export default function SecurityDashboardCard() {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security Overview
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <p className="text-sm text-muted-foreground">Enhanced RLS</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <p className="text-sm text-muted-foreground">Access Logging</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <p className="text-sm text-muted-foreground">Data Isolation</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <p className="text-sm text-muted-foreground">Monitoring</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Security Status: Protected
              </span>
            </div>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Enhanced family data isolation is active with comprehensive access logging and suspicious activity detection.
            </p>
          </div>
        </CardContent>
      </Card>

      {showDetails && <SecurityMonitoringWidget />}
    </div>
  );
}