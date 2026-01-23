/**
 * AddFailoverConfigDialog Component
 * 
 * Dialog for adding new failover configuration rules
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, ArrowRight } from 'lucide-react';
import { LLMProvider } from '@/types/llmProvider';
import { FailoverConfigFormData, initialFailoverConfigFormData } from '@/types/llmFailover';

interface AddFailoverConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers: LLMProvider[];
  onConfigAdded: () => void;
}

export const AddFailoverConfigDialog = ({ 
  open, 
  onOpenChange, 
  providers,
  onConfigAdded 
}: AddFailoverConfigDialogProps) => {
  const [formData, setFormData] = useState<FailoverConfigFormData>(initialFailoverConfigFormData);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!formData.primary_provider_key || !formData.backup_provider_key) {
      toast({
        title: 'Missing Providers',
        description: 'Please select both primary and backup providers',
        variant: 'destructive'
      });
      return;
    }

    if (formData.primary_provider_key === formData.backup_provider_key) {
      toast({
        title: 'Invalid Configuration',
        description: 'Primary and backup providers must be different',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.trigger_on_rate_limit && !formData.trigger_on_timeout && !formData.trigger_on_error) {
      toast({
        title: 'No Triggers',
        description: 'Please enable at least one trigger condition',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('llm_failover_config')
        .insert({
          primary_provider_key: formData.primary_provider_key,
          backup_provider_key: formData.backup_provider_key,
          priority: formData.priority,
          trigger_on_rate_limit: formData.trigger_on_rate_limit,
          trigger_on_timeout: formData.trigger_on_timeout,
          trigger_on_error: formData.trigger_on_error,
          timeout_threshold_ms: formData.timeout_threshold_ms,
          max_retries_before_failover: formData.max_retries_before_failover,
          cooldown_seconds: formData.cooldown_seconds,
          is_active: formData.is_active
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('This failover rule already exists');
        }
        throw error;
      }

      toast({
        title: 'Rule Created',
        description: 'Failover rule has been added successfully'
      });

      setFormData(initialFailoverConfigFormData);
      onConfigAdded();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Failed to Create Rule',
        description: err instanceof Error ? err.message : 'Could not create failover rule',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFailoverConfigFormData);
    onOpenChange(false);
  };

  const getProviderName = (key: string) => {
    return providers.find(p => p.provider_key === key)?.display_name || key;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Add Failover Rule
          </DialogTitle>
          <DialogDescription>
            Configure automatic failover between LLM providers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Provider Selection */}
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label>Primary Provider</Label>
              <Select 
                value={formData.primary_provider_key} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, primary_provider_key: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select primary..." />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(p => (
                    <SelectItem 
                      key={p.provider_key} 
                      value={p.provider_key}
                      disabled={p.provider_key === formData.backup_provider_key}
                    >
                      {p.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground mt-6" />
            <div className="flex-1 space-y-2">
              <Label>Backup Provider</Label>
              <Select 
                value={formData.backup_provider_key} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, backup_provider_key: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select backup..." />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(p => (
                    <SelectItem 
                      key={p.provider_key} 
                      value={p.provider_key}
                      disabled={p.provider_key === formData.primary_provider_key}
                    >
                      {p.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Trigger Conditions */}
          <div className="space-y-3">
            <Label>Trigger Conditions</Label>
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <Label htmlFor="rate_limit" className="text-sm font-normal cursor-pointer">
                  Rate limit exceeded
                </Label>
                <Switch
                  id="rate_limit"
                  checked={formData.trigger_on_rate_limit}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, trigger_on_rate_limit: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="timeout" className="text-sm font-normal cursor-pointer">
                  Request timeout
                </Label>
                <Switch
                  id="timeout"
                  checked={formData.trigger_on_timeout}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, trigger_on_timeout: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="error" className="text-sm font-normal cursor-pointer">
                  API error
                </Label>
                <Switch
                  id="error"
                  checked={formData.trigger_on_error}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, trigger_on_error: v }))}
                />
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="100"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
              />
              <p className="text-xs text-muted-foreground">Lower = higher priority</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_retries">Max Retries Before Failover</Label>
              <Input
                id="max_retries"
                type="number"
                min="0"
                max="10"
                value={formData.max_retries_before_failover}
                onChange={(e) => setFormData(prev => ({ ...prev, max_retries_before_failover: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeout_ms">Timeout Threshold (ms)</Label>
              <Input
                id="timeout_ms"
                type="number"
                min="1000"
                max="120000"
                step="1000"
                value={formData.timeout_threshold_ms}
                onChange={(e) => setFormData(prev => ({ ...prev, timeout_threshold_ms: parseInt(e.target.value) || 30000 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cooldown">Cooldown (seconds)</Label>
              <Input
                id="cooldown"
                type="number"
                min="0"
                max="3600"
                value={formData.cooldown_seconds}
                onChange={(e) => setFormData(prev => ({ ...prev, cooldown_seconds: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">Wait before retrying primary</p>
            </div>
          </div>

          {/* Preview */}
          {formData.primary_provider_key && formData.backup_provider_key && (
            <div className="p-3 bg-muted/30 rounded-lg border text-sm">
              <p className="text-muted-foreground">
                When <span className="font-medium text-foreground">{getProviderName(formData.primary_provider_key)}</span> fails 
                {formData.max_retries_before_failover > 0 && ` after ${formData.max_retries_before_failover} retries`}, 
                automatically switch to <span className="font-medium text-foreground">{getProviderName(formData.backup_provider_key)}</span>
                {formData.cooldown_seconds > 0 && ` and wait ${formData.cooldown_seconds}s before trying primary again`}.
              </p>
            </div>
          )}
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
              'Add Rule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
