/**
 * LLMApiKeyDialog Component
 * 
 * Dialog for adding or updating API keys for LLM providers
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, Key, Shield, AlertTriangle } from 'lucide-react';
import { LLMProvider } from '@/types/llmProvider';

interface LLMApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: LLMProvider;
  onKeyUpdated: () => void;
}

export const LLMApiKeyDialog = ({ open, onOpenChange, provider, onKeyUpdated }: LLMApiKeyDialogProps) => {
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const { toast } = useToast();

  const secretName = `LLM_${provider.provider_key.toUpperCase()}_API_KEY`;

  const testConnection = async () => {
    if (!apiKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter an API key to test',
        variant: 'destructive'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('manage-llm-provider', {
        body: {
          action: 'test',
          provider: {
            providerKey: provider.provider_key,
            apiEndpoint: provider.api_endpoint,
            apiKey: apiKey.trim()
          }
        }
      });

      if (error) throw error;

      if (data?.healthy) {
        setTestResult('success');
        toast({ title: 'Connection Successful', description: 'API key is valid' });
      } else {
        setTestResult('error');
        toast({
          title: 'Connection Failed',
          description: data?.error || 'Invalid API key or endpoint',
          variant: 'destructive'
        });
      }
    } catch (err) {
      setTestResult('error');
      toast({
        title: 'Test Failed',
        description: err instanceof Error ? err.message : 'Connection test failed',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter an API key',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke('manage-llm-provider', {
        body: {
          action: 'update_api_key',
          provider: {
            providerKey: provider.provider_key,
            apiKey: apiKey.trim()
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'API Key Saved',
          description: `API key for ${provider.display_name} has been configured`
        });
        setApiKey('');
        setTestResult(null);
        onKeyUpdated();
        onOpenChange(false);
      } else {
        throw new Error(data?.error || 'Failed to save API key');
      }
    } catch (err) {
      toast({
        title: 'Save Failed',
        description: err instanceof Error ? err.message : 'Failed to save API key',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setApiKey('');
    setTestResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {provider.api_key_configured ? 'Update' : 'Configure'} API Key
          </DialogTitle>
          <DialogDescription>
            {provider.api_key_configured 
              ? `Update the API key for ${provider.display_name}`
              : `Add an API key to enable ${provider.display_name}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm">
                <p className="font-medium">Secret Name: <code className="bg-muted px-1 rounded">{secretName}</code></p>
                <p className="text-muted-foreground mt-1">
                  Your API key will be encrypted and stored securely.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="apiKey"
                type="password"
                placeholder={provider.api_key_configured ? '••••••••••••' : 'Enter API key...'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                className="font-mono"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={testConnection}
                disabled={testing || !apiKey.trim()}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : testResult === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : testResult === 'error' ? (
                  <XCircle className="h-4 w-4 text-destructive" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>
          </div>

          {provider.api_key_configured && (
            <Alert variant="default" className="border-amber-500/50">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                An API key is already configured. Entering a new key will replace it.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Endpoint:</strong> {provider.api_endpoint}</p>
            <p><strong>Models:</strong> {Array.isArray(provider.models) ? provider.models.join(', ') : ''}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !apiKey.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save API Key'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
