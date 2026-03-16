/**
 * LLMProvidersPanel Component
 * 
 * Displays all LLM providers (built-in and custom) with management actions
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
  Key, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Trash2,
  Edit2,
  Zap,
  Bot,
  Sparkles
} from 'lucide-react';
import { LLMProvider } from '@/types/llmProvider';
import { LLMApiKeyDialog } from './LLMApiKeyDialog';
import { EditLLMProviderDialog } from './EditLLMProviderDialog';
import { AddLLMProviderDialog } from './AddLLMProviderDialog';
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

export const LLMProvidersPanel = () => {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | null>(null);
  const { toast } = useToast();

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('llm_providers')
        .select('id, provider_key, display_name, api_endpoint, models, pricing_config, is_active, is_custom, api_key_configured, health_status, last_health_check, created_at, updated_at')
        .order('is_custom', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) throw error;
      
      // Parse the models array from JSONB
      const parsed = (data || []).map(p => ({
        ...p,
        models: Array.isArray(p.models) ? p.models : JSON.parse(p.models as string || '[]'),
        pricing_config: typeof p.pricing_config === 'string' 
          ? JSON.parse(p.pricing_config) 
          : p.pricing_config
      })) as LLMProvider[];
      
      setProviders(parsed);
    } catch (err) {
      console.error('Failed to fetch providers:', err);
      toast({
        title: 'Error',
        description: 'Failed to load LLM providers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const testConnection = async (provider: LLMProvider) => {
    if (!provider.api_key_configured) {
      toast({
        title: 'API Key Required',
        description: 'Please configure the API key first',
        variant: 'destructive'
      });
      return;
    }

    setTesting(provider.provider_key);
    try {
      const { data, error } = await supabase.functions.invoke('manage-llm-provider', {
        body: {
          action: 'health_check',
          provider: { providerKey: provider.provider_key }
        }
      });

      if (error) throw error;

      if (data?.healthy) {
        toast({ title: 'Connection Healthy', description: `${provider.display_name} is responding correctly` });
      } else {
        toast({
          title: 'Connection Failed',
          description: data?.error || 'Provider is not responding',
          variant: 'destructive'
        });
      }

      await fetchProviders();
    } catch (err) {
      toast({
        title: 'Test Failed',
        description: err instanceof Error ? err.message : 'Connection test failed',
        variant: 'destructive'
      });
    } finally {
      setTesting(null);
    }
  };

  const toggleProvider = async (provider: LLMProvider) => {
    setToggling(provider.provider_key);
    try {
      const { error } = await supabase.functions.invoke('manage-llm-provider', {
        body: {
          action: 'toggle',
          provider: { providerKey: provider.provider_key }
        }
      });

      if (error) throw error;
      
      toast({
        title: provider.is_active ? 'Provider Disabled' : 'Provider Enabled',
        description: `${provider.display_name} has been ${provider.is_active ? 'disabled' : 'enabled'}`
      });

      await fetchProviders();
    } catch (err) {
      toast({
        title: 'Toggle Failed',
        description: err instanceof Error ? err.message : 'Failed to toggle provider',
        variant: 'destructive'
      });
    } finally {
      setToggling(null);
    }
  };

  const deleteProvider = async () => {
    if (!selectedProvider) return;

    try {
      const { error } = await supabase.functions.invoke('manage-llm-provider', {
        body: {
          action: 'delete',
          provider: { providerKey: selectedProvider.provider_key }
        }
      });

      if (error) throw error;

      toast({
        title: 'Provider Deleted',
        description: `${selectedProvider.display_name} has been removed`
      });

      setShowDeleteDialog(false);
      setSelectedProvider(null);
      await fetchProviders();
    } catch (err) {
      toast({
        title: 'Delete Failed',
        description: err instanceof Error ? err.message : 'Failed to delete provider',
        variant: 'destructive'
      });
    }
  };

  const getProviderIcon = (providerKey: string) => {
    switch (providerKey) {
      case 'grok':
        return <Zap className="h-5 w-5 text-purple-500" />;
      case 'openai':
        return <Bot className="h-5 w-5 text-green-500" />;
      case 'anthropic':
        return <Sparkles className="h-5 w-5 text-orange-500" />;
      case 'google':
        return <Sparkles className="h-5 w-5 text-blue-500" />;
      case 'lovable':
        return <Zap className="h-5 w-5 text-pink-500" />;
      default:
        return <Bot className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (provider: LLMProvider) => {
    if (!provider.api_key_configured) {
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-600">
          <Key className="h-3 w-3 mr-1" />
          Needs API Key
        </Badge>
      );
    }

    switch (provider.health_status) {
      case 'healthy':
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Healthy
          </Badge>
        );
      case 'unhealthy':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Unhealthy
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            Unchecked
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              LLM Providers
            </CardTitle>
            <CardDescription>
              Manage AI model providers and API configurations
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchProviders} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No LLM providers configured</p>
            <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Provider
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  provider.is_active 
                    ? 'bg-background border-border' 
                    : 'bg-muted/30 border-muted'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {getProviderIcon(provider.provider_key)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{provider.display_name}</span>
                      {provider.is_custom && (
                        <Badge variant="secondary" className="text-xs">Custom</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {provider.api_endpoint}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {Array.isArray(provider.models) ? provider.models.slice(0, 3).join(', ') : ''}
                      {Array.isArray(provider.models) && provider.models.length > 3 && ` +${provider.models.length - 3} more`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(provider)}
                  
                  <div className="flex items-center gap-1">
                    {!provider.api_key_configured ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProvider(provider);
                          setShowApiKeyDialog(true);
                        }}
                      >
                        <Key className="h-4 w-4 mr-1" />
                        Add Key
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => testConnection(provider)}
                          disabled={testing === provider.provider_key}
                        >
                          {testing === provider.provider_key ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProvider(provider);
                            setShowApiKeyDialog(true);
                          }}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {provider.is_custom && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProvider(provider);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProvider(provider);
                            setShowDeleteDialog(true);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    <Switch
                      checked={provider.is_active ?? false}
                      onCheckedChange={() => toggleProvider(provider)}
                      disabled={toggling === provider.provider_key}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialogs */}
      <AddLLMProviderDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onProviderAdded={fetchProviders}
      />

      {selectedProvider && (
        <>
          <LLMApiKeyDialog
            open={showApiKeyDialog}
            onOpenChange={setShowApiKeyDialog}
            provider={selectedProvider}
            onKeyUpdated={fetchProviders}
          />

          <EditLLMProviderDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            provider={selectedProvider}
            onProviderUpdated={fetchProviders}
          />
        </>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedProvider?.display_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteProvider} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
