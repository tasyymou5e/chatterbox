import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Bot, Save, Loader2, TestTube } from 'lucide-react';

interface LLMProvider {
  provider_key: string;
  display_name: string;
  models: string[];
  is_active: boolean | null;
}

export default function AdminAISettings() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [provider, setProvider] = useState('lovable');
  const [model, setModel] = useState('google/gemini-3-flash-preview');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    loadProviders();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['ai_enabled', 'ai_provider', 'ai_model', 'ai_system_prompt']);

      data?.forEach(s => {
        const val = typeof s.setting_value === 'string'
          ? s.setting_value.replace(/^"|"$/g, '')
          : String(s.setting_value);

        switch (s.setting_key) {
          case 'ai_enabled': setAiEnabled(val === 'true'); break;
          case 'ai_provider': setProvider(val); break;
          case 'ai_model': setModel(val); break;
          case 'ai_system_prompt': setSystemPrompt(val); break;
        }
      });
    } catch (err) {
      console.error('Failed to load AI settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const { data } = await supabase
        .from('llm_providers')
        .select('provider_key, display_name, models, is_active')
        .order('display_name');

      if (data) {
        // Always include Lovable as an option
        const lovable: LLMProvider = {
          provider_key: 'lovable',
          display_name: 'Lovable AI Gateway',
          models: ['google/gemini-3-flash-preview', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'openai/gpt-5', 'openai/gpt-5-mini'],
          is_active: true,
        };
        setProviders([lovable, ...(data as LLMProvider[])]);
      }
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  };

  const selectedProvider = providers.find(p => p.provider_key === provider);
  const availableModels = selectedProvider?.models || [];

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = [
        { setting_key: 'ai_enabled', setting_value: String(aiEnabled) },
        { setting_key: 'ai_provider', setting_value: `"${provider}"` },
        { setting_key: 'ai_model', setting_value: `"${model}"` },
        { setting_key: 'ai_system_prompt', setting_value: `"${systemPrompt}"` },
      ];

      for (const s of settings) {
        const { error } = await supabase
          .from('site_settings')
          .update({ setting_value: s.setting_value })
          .eq('setting_key', s.setting_key);

        if (error) throw error;
      }

      toast({ title: 'Saved', description: 'AI settings updated successfully' });
    } catch (err) {
      console.error('Failed to save:', err);
      toast({ title: 'Error', description: 'Failed to save AI settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello, this is a test. Reply with "AI is working!" only.' }],
          stream: false,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const reply = data.choices?.[0]?.message?.content || 'No response';
      toast({ title: 'Connection Test', description: `AI replied: "${reply.substring(0, 100)}"` });
    } catch (err) {
      toast({
        title: 'Test Failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border shadow-soft">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border shadow-soft">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Assistant Settings
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Configure the AI assistant for all users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="ai-enabled">AI Assistant</Label>
            <p className="text-xs text-muted-foreground">Enable or disable the AI chat widget</p>
          </div>
          <Switch id="ai-enabled" checked={aiEnabled} onCheckedChange={setAiEnabled} />
        </div>

        {/* Provider */}
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select value={provider} onValueChange={(v) => { setProvider(v); setModel(''); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providers.filter(p => p.is_active).map(p => (
                <SelectItem key={p.provider_key} value={p.provider_key}>
                  {p.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model */}
        <div className="space-y-2">
          <Label>Model</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* System Prompt */}
        <div className="space-y-2">
          <Label>System Prompt</Label>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            placeholder="Instructions for the AI assistant..."
            className="resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
          <Button onClick={handleTest} variant="outline" disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
            Test
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
