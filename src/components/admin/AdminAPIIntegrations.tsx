import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink,
  Key,
  Bot,
  Sparkles,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { secureLog } from '@/utils/secureLogging';
import { useNavigate } from 'react-router-dom';

interface LLMProviderStatus {
  id: string;
  provider_key: string;
  display_name: string;
  api_endpoint: string;
  models: string[];
  is_active: boolean | null;
  api_key_configured: boolean;
  health_status: string | null;
  last_health_check: string | null;
}

export default function AdminAPIIntegrations() {
  const [providers, setProviders] = useState<LLMProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('llm_providers')
        .select('id, provider_key, display_name, api_endpoint, models, is_active, api_key_configured, health_status, last_health_check')
        .order('display_name');

      if (error) throw error;

      // Parse models from JSONB
      const parsed = (data || []).map(p => ({
        ...p,
        models: Array.isArray(p.models) ? p.models : JSON.parse(p.models as string || '[]')
      })) as LLMProviderStatus[];

      setProviders(parsed);
    } catch (error: unknown) {
      secureLog.error('Failed to fetch providers', error, 'AdminAPIIntegrations');
      // Fallback to empty list
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const testIntegration = async (providerKey: string) => {
    setTesting(providerKey);
    try {
      const { data, error } = await supabase.functions.invoke('manage-llm-provider', {
        body: { action: 'health_check', provider: { providerKey } }
      });

      if (error) throw error;

      if (data.healthy) {
        toast.success(`${providerKey} integration is working correctly`);
      } else {
        toast.error(`${providerKey} integration test failed: ${data.error}`);
      }

      await fetchProviders();
    } catch (error: unknown) {
      secureLog.error('Integration test failed', error, 'AdminAPIIntegrations');
      toast.error(`Failed to test ${providerKey} integration`);
    } finally {
      setTesting(null);
    }
  };

  const getStatusBadge = (provider: LLMProviderStatus) => {
    if (!provider.is_active) {
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">Disabled</Badge>;
    }
    if (!provider.api_key_configured) {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Not Configured</Badge>;
    }
    switch (provider.health_status) {
      case 'healthy':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Healthy</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="outline">Unchecked</Badge>;
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
      case 'kimi':
        return <Bot className="h-5 w-5 text-cyan-500" />;
      case 'huggingface':
        return <Sparkles className="h-5 w-5 text-yellow-500" />;
      case 'local':
        return <Settings className="h-5 w-5 text-emerald-500" />;
      case 'lovable':
        return <Zap className="h-5 w-5 text-pink-500" />;
      default:
        return <Key className="h-5 w-5 text-muted-foreground" />;
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
              LLM provider connections and status
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/admin/llm-monitoring')}
              className="border-border"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchProviders}
              disabled={loading}
              className="border-border"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
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
          ) : providers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Bot className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No LLM providers configured</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => navigate('/admin/llm-monitoring')}
              >
                Configure Providers
              </Button>
            </div>
          ) : (
            providers.slice(0, 5).map((provider) => (
              <div 
                key={provider.id}
                className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  {getProviderIcon(provider.provider_key)}
                  <div>
                    <div className="font-medium text-foreground">{provider.display_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {provider.models.slice(0, 2).join(', ')}
                      {provider.models.length > 2 && ` +${provider.models.length - 2} more`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(provider)}
                  {provider.api_key_configured && provider.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => testIntegration(provider.provider_key)}
                      disabled={testing === provider.provider_key}
                    >
                      {testing === provider.provider_key ? (
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
          
          {providers.length > 5 && (
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={() => navigate('/admin/llm-monitoring')}
            >
              View all {providers.length} providers
            </Button>
          )}
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
          <h4 className="text-sm font-medium text-foreground mb-2">Managing API Keys</h4>
          <p className="text-xs text-muted-foreground mb-3">
            API keys are managed through the LLM Monitoring page. Keys are encrypted and stored securely.
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
