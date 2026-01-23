import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Settings, AlertTriangle, Clock, Save } from 'lucide-react';
import { useEdgeFunctionHealthHistory, AlertConfig, HealthSummary } from '@/hooks/useEdgeFunctionHealthHistory';

interface EdgeFunctionAlertConfigProps {
  configs: AlertConfig[];
  summaries: HealthSummary[];
}

interface ConfigDialogState {
  isOpen: boolean;
  functionName: string;
  responseTimeThreshold: number;
  consecutiveFailuresThreshold: number;
  isEnabled: boolean;
}

export function EdgeFunctionAlertConfig({ configs, summaries }: EdgeFunctionAlertConfigProps) {
  const { updateAlertConfig } = useEdgeFunctionHealthHistory();
  
  const [dialogState, setDialogState] = useState<ConfigDialogState>({
    isOpen: false,
    functionName: '',
    responseTimeThreshold: 5000,
    consecutiveFailuresThreshold: 2,
    isEnabled: true,
  });

  // Get default config
  const defaultConfig = configs.find(c => c.function_name === '_default');

  // Get config for a function (fall back to default)
  const getConfigForFunction = (functionName: string): Partial<AlertConfig> => {
    const specific = configs.find(c => c.function_name === functionName);
    return specific || defaultConfig || {
      response_time_threshold_ms: 5000,
      consecutive_failures_threshold: 2,
      is_enabled: true,
    };
  };

  const openConfigDialog = (functionName: string) => {
    const config = getConfigForFunction(functionName);
    setDialogState({
      isOpen: true,
      functionName,
      responseTimeThreshold: config.response_time_threshold_ms || 5000,
      consecutiveFailuresThreshold: config.consecutive_failures_threshold || 2,
      isEnabled: config.is_enabled !== false,
    });
  };

  const saveConfig = async () => {
    await updateAlertConfig(dialogState.functionName, {
      response_time_threshold_ms: dialogState.responseTimeThreshold,
      consecutive_failures_threshold: dialogState.consecutiveFailuresThreshold,
      is_enabled: dialogState.isEnabled,
    });
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  // Get unique function names from summaries and configs
  const allFunctions = new Set([
    ...summaries.map(s => s.functionName),
    ...configs.filter(c => c.function_name !== '_default').map(c => c.function_name),
  ]);

  return (
    <div className="space-y-4">
      {/* Default Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Default Alert Settings
          </CardTitle>
          <CardDescription>
            These settings apply to all functions unless overridden
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Response Time Threshold</p>
              <p className="text-sm text-muted-foreground">
                {defaultConfig?.response_time_threshold_ms || 5000}ms
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Consecutive Failures</p>
              <p className="text-sm text-muted-foreground">
                {defaultConfig?.consecutive_failures_threshold || 2} failures
              </p>
            </div>
            <Button variant="outline" onClick={() => openConfigDialog('_default')}>
              Edit Default
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Function-specific Configurations */}
      <Card>
        <CardHeader>
          <CardTitle>Function Alert Configuration</CardTitle>
          <CardDescription>
            Configure alert thresholds per function. Unmodified functions use default settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from(allFunctions).sort().map((functionName) => {
              const config = getConfigForFunction(functionName);
              const hasCustomConfig = configs.some(c => c.function_name === functionName);
              const summary = summaries.find(s => s.functionName === functionName);

              return (
                <div
                  key={functionName}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{functionName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {hasCustomConfig ? (
                          <Badge variant="secondary" className="text-xs">Custom</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Default</Badge>
                        )}
                        {!config.is_enabled && (
                          <Badge variant="destructive" className="text-xs">Alerts Disabled</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {config.response_time_threshold_ms || 5000}ms
                      </div>
                      <p className="text-xs text-muted-foreground">threshold</p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <AlertTriangle className="h-3 w-3" />
                        {config.consecutive_failures_threshold || 2}
                      </div>
                      <p className="text-xs text-muted-foreground">failures</p>
                    </div>

                    {summary && (
                      <div className="text-right w-16">
                        <p className={`text-sm font-medium ${
                          summary.successRate >= 90 ? 'text-green-600' :
                          summary.successRate >= 70 ? 'text-yellow-600' :
                          'text-destructive'
                        }`}>
                          {summary.successRate}%
                        </p>
                        <p className="text-xs text-muted-foreground">success</p>
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openConfigDialog(functionName)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {allFunctions.size === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No functions to configure yet.</p>
                <p className="text-sm">Run a health check to discover functions.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={dialogState.isOpen} onOpenChange={(open) => 
        setDialogState(prev => ({ ...prev, isOpen: open }))
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.functionName === '_default' 
                ? 'Edit Default Alert Settings'
                : `Configure ${dialogState.functionName}`}
            </DialogTitle>
            <DialogDescription>
              {dialogState.functionName === '_default'
                ? 'These settings will apply to all functions without custom configuration.'
                : 'Set custom alert thresholds for this function.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive alerts for this function
                </p>
              </div>
              <Switch
                checked={dialogState.isEnabled}
                onCheckedChange={(checked) => 
                  setDialogState(prev => ({ ...prev, isEnabled: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responseTime">Response Time Threshold (ms)</Label>
              <Input
                id="responseTime"
                type="number"
                min={100}
                max={30000}
                value={dialogState.responseTimeThreshold}
                onChange={(e) => setDialogState(prev => ({ 
                  ...prev, 
                  responseTimeThreshold: parseInt(e.target.value) || 5000 
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Alert when response time exceeds this value
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="failures">Consecutive Failures Threshold</Label>
              <Input
                id="failures"
                type="number"
                min={1}
                max={10}
                value={dialogState.consecutiveFailuresThreshold}
                onChange={(e) => setDialogState(prev => ({ 
                  ...prev, 
                  consecutiveFailuresThreshold: parseInt(e.target.value) || 2 
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Alert after this many consecutive failures
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => 
              setDialogState(prev => ({ ...prev, isOpen: false }))
            }>
              Cancel
            </Button>
            <Button onClick={saveConfig} className="gap-2">
              <Save className="h-4 w-4" />
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
