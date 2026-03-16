import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

import { toast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gauge, Save, Loader2 } from 'lucide-react';

interface QuotaRow {
  id: string;
  role: string;
  daily_message_limit: number;
  enabled: boolean;
}

interface UsageCount {
  role: string;
  count: number;
}

export default function AdminAIQuotaSettings() {
  const [quotas, setQuotas] = useState<QuotaRow[]>([]);
  const [usageCounts, setUsageCounts] = useState<UsageCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadQuotas();
  }, []);

  const loadQuotas = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_usage_quotas')
        .select('id, role, daily_message_limit, enabled')
        .order('role');

      if (error) throw error;
      setQuotas((data as QuotaRow[]) || []);

      // Fetch today's usage counts per role
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      // Get message counts grouped by user role for today
      const { data: msgData } = await supabase.rpc('get_ai_usage_by_role_today' as never);
      if (msgData && Array.isArray(msgData)) {
        setUsageCounts(msgData as UsageCount[]);
      }
    } catch (err) {
      console.error('Failed to load quotas:', err);
      toast({ title: 'Error', description: 'Failed to load AI quotas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateQuota = (id: string, field: keyof QuotaRow, value: number | boolean) => {
    setQuotas(prev =>
      prev.map(q => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const q of quotas) {
        const { error } = await supabase
          .from('ai_usage_quotas')
          .update({
            daily_message_limit: q.daily_message_limit,
            enabled: q.enabled,
          })
          .eq('id', q.id);

        if (error) throw error;
      }
      toast({ title: 'Saved', description: 'AI usage quotas updated successfully' });
    } catch (err) {
      console.error('Failed to save quotas:', err);
      toast({ title: 'Error', description: 'Failed to save quotas', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getUsageForRole = (role: string) => {
    return usageCounts.find(u => u.role === role)?.count || 0;
  };

  const formatLimit = (limit: number) => (limit === -1 ? 'Unlimited' : String(limit));

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
          <Gauge className="h-5 w-5" />
          AI Usage Quotas
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Configure daily message limits per user role. Set to -1 for unlimited.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Daily Limit</TableHead>
              <TableHead>Used Today</TableHead>
              <TableHead>Enabled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotas.map(q => (
              <TableRow key={q.id}>
                <TableCell className="font-medium capitalize">{q.role}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={-1}
                    value={q.daily_message_limit}
                    onChange={(e) => updateQuota(q.id, 'daily_message_limit', parseInt(e.target.value) || 0)}
                    className="w-24"
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {getUsageForRole(q.role)} / {formatLimit(q.daily_message_limit)}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={q.enabled}
                    onCheckedChange={(v) => updateQuota(q.id, 'enabled', v)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Quotas
        </Button>
      </CardContent>
    </Card>
  );
}
