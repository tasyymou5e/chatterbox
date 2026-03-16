/**
 * AddLLMProviderDialog Component
 * 
 * @description Dialog for adding new LLM providers with API key configuration,
 * connection testing, and model management.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Loader2, CheckCircle, XCircle, Trash2 } from 'lucide-react';

interface AddLLMProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProviderAdded: () => void;
}

interface ProviderFormData {
  displayName: string;
  providerKey: string;
  apiEndpoint: string;
  apiKey: string;
  models: string[];
  inputPricePer1k: string;
  outputPricePer1k: string;
}

const initialFormData: ProviderFormData = {
  displayName: '',
  providerKey: '',
  apiEndpoint: '',
  apiKey: '',
  models: [],
  inputPricePer1k: '0.001',
  outputPricePer1k: '0.002'
};

export const AddLLMProviderDialog = ({ open, onOpenChange, onProviderAdded }: AddLLMProviderDialogProps) => {
  const [formData, setFormData] = useState<ProviderFormData>(initialFormData);
  const [newModel, setNewModel] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: keyof ProviderFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTestResult(null);
    
    // Auto-generate provider key from display name
    if (field === 'displayName') {
      const key = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      setFormData(prev => ({ ...prev, displayName: value, providerKey: key }));
    }
  };

  const addModel = () => {
    if (newModel.trim() && !formData.models.includes(newModel.trim())) {
      setFormData(prev => ({ ...prev, models: [...prev.models, newModel.trim()] }));
      setNewModel('');
    }
  };

  const removeModel = (model: string) => {
    setFormData(prev => ({ ...prev, models: prev.models.filter(m => m !== model) }));
  };

  const testConnection = async () => {
    if (!formData.apiKey || !formData.apiEndpoint) {
      toast({
        title: 'Missing Information',
        description: 'Please provide API endpoint and key',
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
            providerKey: formData.providerKey,
            apiEndpoint: formData.apiEndpoint,
            apiKey: formData.apiKey
          }
        }
      });

      if (error) throw error;
      
      if (data?.healthy) {
        setTestResult('success');
        toast({
          title: 'Connection Successful',
          description: 'API key is valid and provider is accessible'
        });
      } else {
        setTestResult('error');
        toast({
          title: 'Connection Failed',
          description: data?.error || 'Could not connect to provider',
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

  const handleSubmit = async () => {
    if (!formData.displayName || !formData.providerKey || !formData.apiEndpoint || !formData.apiKey) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (formData.models.length === 0) {
      toast({
        title: 'No Models',
        description: 'Please add at least one model',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.functions.invoke('manage-llm-provider', {
        body: {
          action: 'create',
          provider: {
            displayName: formData.displayName,
            providerKey: formData.providerKey,
            apiEndpoint: formData.apiEndpoint,
            apiKey: formData.apiKey,
            models: formData.models,
            pricingConfig: {
              inputPricePer1k: parseFloat(formData.inputPricePer1k),
              outputPricePer1k: parseFloat(formData.outputPricePer1k)
            }
          }
        }
      });

      if (error) throw error;

      toast({
        title: 'Provider Added',
        description: `${formData.displayName} has been added successfully`
      });

      setFormData(initialFormData);
      onProviderAdded();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Failed to Add Provider',
        description: err instanceof Error ? err.message : 'Could not add provider',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setTestResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add LLM Provider</DialogTitle>
          <DialogDescription>
            Configure a new LLM provider with API credentials and model information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Provider Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Provider Name *</Label>
            <Input
              id="displayName"
              placeholder="e.g., Anthropic Claude"
              value={formData.displayName}
              onChange={(e) => handleInputChange('displayName', e.target.value)}
            />
          </div>

          {/* Provider Key */}
          <div className="space-y-2">
            <Label htmlFor="providerKey">Provider Key</Label>
            <Input
              id="providerKey"
              placeholder="e.g., anthropic"
              value={formData.providerKey}
              onChange={(e) => handleInputChange('providerKey', e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Auto-generated from name. Used for internal identification.
            </p>
          </div>

          {/* API Endpoint */}
          <div className="space-y-2">
            <Label htmlFor="apiEndpoint">API Endpoint *</Label>
            <Input
              id="apiEndpoint"
              placeholder="e.g., https://api.anthropic.com/v1"
              value={formData.apiEndpoint}
              onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
            />
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key *</Label>
            <div className="flex gap-2">
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={formData.apiKey}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                className="font-mono"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={testConnection}
                disabled={testing || !formData.apiKey}
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
            <p className="text-xs text-muted-foreground">
              Your API key will be stored securely as an encrypted secret.
            </p>
          </div>

          {/* Models */}
          <div className="space-y-2">
            <Label>Supported Models *</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., claude-3-opus"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addModel())}
              />
              <Button type="button" variant="outline" onClick={addModel}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.models.map((model) => (
                <Badge key={model} variant="secondary" className="pr-1">
                  {model}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
                    onClick={() => removeModel(model)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inputPrice">Input Price (per 1K tokens)</Label>
              <Input
                id="inputPrice"
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.001"
                value={formData.inputPricePer1k}
                onChange={(e) => handleInputChange('inputPricePer1k', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outputPrice">Output Price (per 1K tokens)</Label>
              <Input
                id="outputPrice"
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.002"
                value={formData.outputPricePer1k}
                onChange={(e) => handleInputChange('outputPricePer1k', e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Add Provider'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
