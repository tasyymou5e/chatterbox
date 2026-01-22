import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink,
  Key,
  Bot
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cWarn } from '@/utils/conditionalLogger';
import { secureLog } from '@/utils/secureLogging';
interface IntegrationStatus {
  provider: string;
  displayName: string;
  configured: boolean;
  lastChecked: string | null;
  healthy: boolean | null;
  models: string[];
}

export default function AdminAPIIntegrations() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrationStatus();
  }, []);

  const fetchIntegrationStatus = async () => {
    const defaultIntegrations: IntegrationStatus[] = [
      {
        provider: 'grok',
        displayName: 'Grok (xAI)',
        configured: false,
        lastChecked: null,
        healthy: null,
        models: ['grok-3', 'grok-3-mini', 'grok-2-audio'],
      },
      {
        provider: 'openai',
        displayName: 'OpenAI',
        configured: false,
        lastChecked: null,
        healthy: null,
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      },
      {
        provider: 'lovable',
        displayName: 'Lovable AI Gateway',
        configured: false,
        lastChecked: null,
        healthy: null,
        models: ['google/gemini-2.5-flash', 'openai/gpt-5'],
      },
    ];

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('api-integration-status', {
        body: { action: 'status' },
      });

      if (error) {
        cWarn('Integration status unavailable', error);
        setIntegrations(defaultIntegrations);
        return;
      }

      setIntegrations(data?.integrations || defaultIntegrations);
    } catch (error: unknown) {
      secureLog.error('Failed to fetch integration status', error, 'AdminAPIIntegrations');
      setIntegrations(defaultIntegrations);
    } finally {
      setLoading(false);
    }
  };

  const testIntegration = async (provider: string) => {
    setTesting(provider);
    try {
      const { data, error } = await supabase.functions.invoke('api-integration-status', {
        body: { action: 'test', provider }
      });

      if (error) throw error;

      if (data.healthy) {
        toast.success(`${provider} integration is working correctly`);
      } else {
        toast.error(`${provider} integration test failed: ${data.error}`);
      }

      // Refresh status after test
      await fetchIntegrationStatus();
    } catch (error: unknown) {
      secureLog.error('Integration test failed', error, 'AdminAPIIntegrations');
      toast.error(`Failed to test ${provider} integration`);
    } finally {
      setTesting(null);
    }
  };

  const getStatusBadge = (integration: IntegrationStatus) => {
    if (!integration.configured) {
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">Not Configured</Badge>;
    }
    if (integration.healthy === null) {
      return <Badge variant="outline" className="border-warning text-warning">Unchecked</Badge>;
    }
    if (integration.healthy) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Healthy</Badge>;
    }
    return <Badge variant="destructive">Unhealthy</Badge>;
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'grok':
        return <Zap className="h-5 w-5 text-purple-400" />;
      case 'openai':
        return <Bot className="h-5 w-5 text-green-400" />;
      case 'lovable':
        return <Zap className="h-5 w-5 text-pink-400" />;
      default:
        return <Key className="h-5 w-5 text-blue-400" />;
    }
  };

  return (
    <Card className="bg-gradient-card border-border shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Integrations
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage LLM provider connections and API keys
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchIntegrationStatus}
            disabled={loading}
            className="border-border"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            integrations.map((integration) => (
              <div 
                key={integration.provider}
                className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  {getProviderIcon(integration.provider)}
                  <div>
                    <div className="font-medium text-foreground">{integration.displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {integration.models.slice(0, 2).join(', ')}
                      {integration.models.length > 2 && ` +${integration.models.length - 2} more`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(integration)}
                  {integration.configured && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => testIntegration(integration.provider)}
                      disabled={testing === integration.provider}
                    >
                      {testing === integration.provider ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
          <h4 className="text-sm font-medium text-foreground mb-2">Adding API Keys</h4>
          <p className="text-xs text-muted-foreground mb-3">
            API keys are managed through Lovable's secure secrets system. Keys are encrypted and never exposed to the frontend.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs" asChild>
              <a href="https://docs.lovable.dev/features/security" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Secrets Docs
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
