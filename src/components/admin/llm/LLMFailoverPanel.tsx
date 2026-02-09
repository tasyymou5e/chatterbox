/**
 * LLMFailoverPanel Component
 * 
 * Admin panel for configuring LLM provider failover rules
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  RefreshCw, 
  Trash2,
  ArrowRight,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap
} from 'lucide-react';
import { LLMFailoverConfig, LLMFailoverEvent, LLMProviderStatus } from '@/types/llmFailover';
import { LLMProvider } from '@/types/llmProvider';
import { AddFailoverConfigDialog } from './AddFailoverConfigDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const LLMFailoverPanel = () => {
  const [configs, setConfigs] = useState<LLMFailoverConfig[]>([]);
  const [events, setEvents] = useState<LLMFailoverEvent[]>([]);
  const [providerStatus, setProviderStatus] = useState<LLMProviderStatus[]>([]);
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<LLMFailoverConfig | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [configsRes, eventsRes, statusRes, providersRes] = await Promise.all([
        supabase
          .from('llm_failover_config')
          .select('id, primary_provider_key, backup_provider_key, priority, trigger_on_rate_limit, trigger_on_timeout, trigger_on_error, timeout_threshold_ms, max_retries_before_failover, cooldown_seconds, is_active, created_at, updated_at')
          .order('priority', { ascending: true }),
        supabase
          .from('llm_failover_events')
          .select('id, config_id, primary_provider, backup_provider, trigger_reason, original_error, backup_success, response_time_ms, created_at')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('llm_provider_status')
          .select('provider_key, is_healthy, last_failure_at, failure_count, cooldown_until, updated_at'),
        supabase
          .from('llm_providers')
          .select('provider_key, display_name, is_active, models, pricing_config')
          .eq('is_active', true)
      ]);

      if (configsRes.data) setConfigs(configsRes.data as LLMFailoverConfig[]);
      if (eventsRes.data) setEvents(eventsRes.data as LLMFailoverEvent[]);
      if (statusRes.data) setProviderStatus(statusRes.data as LLMProviderStatus[]);
      if (providersRes.data) {
        const parsed = providersRes.data.map(p => ({
          ...p,
          models: Array.isArray(p.models) ? p.models : JSON.parse(p.models as string || '[]'),
          pricing_config: typeof p.pricing_config === 'string' 
            ? JSON.parse(p.pricing_config) 
            : p.pricing_config
        })) as LLMProvider[];
        setProviders(parsed);
      }
    } catch (err) {
      console.error('Failed to fetch failover data:', err);
      toast({
        title: 'Error',
        description: 'Failed to load failover configuration',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleConfig = async (config: LLMFailoverConfig) => {
    setToggling(config.id);
    try {
      const { error } = await supabase
        .from('llm_failover_config')
        .update({ is_active: !config.is_active })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: config.is_active ? 'Rule Disabled' : 'Rule Enabled',
        description: `Failover rule has been ${config.is_active ? 'disabled' : 'enabled'}`
      });

      await fetchData();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to toggle failover rule',
        variant: 'destructive'
      });
    } finally {
      setToggling(null);
    }
  };

  const deleteConfig = async () => {
    if (!selectedConfig) return;

    try {
      const { error } = await supabase
        .from('llm_failover_config')
        .delete()
        .eq('id', selectedConfig.id);

      if (error) throw error;

      toast({
        title: 'Rule Deleted',
        description: 'Failover rule has been removed'
      });

      setShowDeleteDialog(false);
      setSelectedConfig(null);
      await fetchData();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete failover rule',
        variant: 'destructive'
      });
    }
  };

  const getProviderName = (key: string) => {
    return providers.find(p => p.provider_key === key)?.display_name || key;
  };

  const getProviderStatus = (key: string) => {
    return providerStatus.find(s => s.provider_key === key);
  };

  const getTriggerBadges = (config: LLMFailoverConfig) => {
    const badges = [];
    if (config.trigger_on_rate_limit) badges.push('Rate Limit');
    if (config.trigger_on_timeout) badges.push('Timeout');
    if (config.trigger_on_error) badges.push('Error');
    return badges;
  };

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Failover Configuration
            </CardTitle>
            <CardDescription>
              Configure automatic failover between LLM providers
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rules" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rules">Failover Rules</TabsTrigger>
            <TabsTrigger value="status">Provider Status</TabsTrigger>
            <TabsTrigger value="events">Recent Events</TabsTrigger>
          </TabsList>

          {/* Failover Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : configs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No failover rules configured</p>
                <p className="text-sm mt-2">Add a rule to enable automatic provider failover</p>
                <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Failover Rule
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {configs.map((config) => (
                  <div
                    key={config.id}
                    className={`p-4 rounded-lg border ${
                      config.is_active 
                        ? 'bg-background border-border' 
                        : 'bg-muted/30 border-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">#{config.priority}</Badge>
                          <span className="font-medium">{getProviderName(config.primary_provider_key)}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{getProviderName(config.backup_provider_key)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {getTriggerBadges(config).map(trigger => (
                            <Badge key={trigger} variant="secondary" className="text-xs">
                              {trigger}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedConfig(config);
                            setShowDeleteDialog(true);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={config.is_active}
                          onCheckedChange={() => toggleConfig(config)}
                          disabled={toggling === config.id}
                        />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground flex gap-4">
                      <span>Timeout: {config.timeout_threshold_ms}ms</span>
                      <span>Max Retries: {config.max_retries_before_failover}</span>
                      <span>Cooldown: {config.cooldown_seconds}s</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Provider Status Tab */}
          <TabsContent value="status" className="space-y-4">
            {providers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No active providers</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providers.map((provider) => {
                  const status = getProviderStatus(provider.provider_key);
                  const isInCooldown = status?.cooldown_until && new Date(status.cooldown_until) > new Date();
                  
                  return (
                    <Card key={provider.provider_key} className="border-l-4" style={{
                      borderLeftColor: status?.is_healthy !== false 
                        ? 'hsl(var(--chart-2))' 
                        : 'hsl(var(--destructive))'
                    }}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{provider.display_name}</span>
                          {status?.is_healthy !== false ? (
                            <Badge className="bg-green-500/20 text-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Healthy
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Unhealthy
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Failures: {status?.failure_count || 0}</p>
                          {status?.last_failure_at && (
                            <p>Last failure: {formatTimeAgo(status.last_failure_at)}</p>
                          )}
                          {isInCooldown && (
                            <p className="text-amber-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              In cooldown until {new Date(status!.cooldown_until!).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No failover events recorded</p>
                <p className="text-sm mt-2">Events will appear here when failovers occur</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Primary → Backup</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Response Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-sm">
                          {formatTimeAgo(event.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{getProviderName(event.primary_provider)}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{getProviderName(event.backup_provider)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {event.trigger_reason.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {event.backup_success ? (
                            <Badge className="bg-green-500/20 text-green-600 text-xs">
                              Success
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {event.response_time_ms ? `${event.response_time_ms}ms` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialogs */}
      <AddFailoverConfigDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        providers={providers}
        onConfigAdded={fetchData}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Failover Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this failover rule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteConfig} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
