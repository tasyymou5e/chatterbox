/**
 * EditLLMProviderDialog Component
 * 
 * Dialog for editing custom LLM provider settings
 */
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Loader2, Trash2, Edit2 } from 'lucide-react';
import { LLMProvider } from '@/types/llmProvider';

interface EditLLMProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: LLMProvider;
  onProviderUpdated: () => void;
}

interface EditFormData {
  displayName: string;
  apiEndpoint: string;
  models: string[];
  inputPricePer1k: string;
  outputPricePer1k: string;
}

export const EditLLMProviderDialog = ({ 
  open, 
  onOpenChange, 
  provider, 
  onProviderUpdated 
}: EditLLMProviderDialogProps) => {
  const [formData, setFormData] = useState<EditFormData>({
    displayName: '',
    apiEndpoint: '',
    models: [],
    inputPricePer1k: '0.001',
    outputPricePer1k: '0.002'
  });
  const [newModel, setNewModel] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && provider) {
      setFormData({
        displayName: provider.display_name,
        apiEndpoint: provider.api_endpoint,
        models: Array.isArray(provider.models) ? [...provider.models] : [],
        inputPricePer1k: String(provider.pricing_config?.inputPricePer1k ?? '0.001'),
        outputPricePer1k: String(provider.pricing_config?.outputPricePer1k ?? '0.002')
      });
    }
  }, [open, provider]);

  const handleInputChange = (field: keyof EditFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handleSubmit = async () => {
    if (!formData.displayName || !formData.apiEndpoint) {
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
          action: 'update',
          provider: {
            providerKey: provider.provider_key,
            displayName: formData.displayName,
            apiEndpoint: formData.apiEndpoint,
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
        title: 'Provider Updated',
        description: `${formData.displayName} has been updated successfully`
      });

      onProviderUpdated();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Update Failed',
        description: err instanceof Error ? err.message : 'Could not update provider',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            Edit Provider
          </DialogTitle>
          <DialogDescription>
            Update settings for {provider.display_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Provider Name */}
          <div className="space-y-2">
            <Label htmlFor="editDisplayName">Provider Name *</Label>
            <Input
              id="editDisplayName"
              placeholder="e.g., Anthropic Claude"
              value={formData.displayName}
              onChange={(e) => handleInputChange('displayName', e.target.value)}
            />
          </div>

          {/* Provider Key (read-only) */}
          <div className="space-y-2">
            <Label>Provider Key</Label>
            <Input
              value={provider.provider_key}
              disabled
              className="font-mono bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Provider key cannot be changed after creation.
            </p>
          </div>

          {/* API Endpoint */}
          <div className="space-y-2">
            <Label htmlFor="editApiEndpoint">API Endpoint *</Label>
            <Input
              id="editApiEndpoint"
              placeholder="e.g., https://api.anthropic.com/v1"
              value={formData.apiEndpoint}
              onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
            />
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
              <Label htmlFor="editInputPrice">Input Price (per 1K tokens)</Label>
              <Input
                id="editInputPrice"
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.001"
                value={formData.inputPricePer1k}
                onChange={(e) => handleInputChange('inputPricePer1k', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editOutputPrice">Output Price (per 1K tokens)</Label>
              <Input
                id="editOutputPrice"
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
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
