import { useState, useEffect } from 'react';
import { Shield, Save, RefreshCw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getUserPrivacySettings, updatePrivacySettings, type PrivacySettings } from '@/utils/privacySettings';
import { supabase } from '@/integrations/supabase/client';

export default function PrivacySettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const privacySettings = await getUserPrivacySettings();
      setSettings(privacySettings);
    } catch (error) {
      console.error('Error loading privacy settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading settings',
        description: 'Failed to load your privacy settings. Please refresh the page.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const success = await updatePrivacySettings({
        behavioral_tracking_consent: settings.behavioral_tracking_consent,
        data_retention_days: settings.data_retention_days,
        analytics_sharing_consent: settings.analytics_sharing_consent
      });

      if (success) {
        setIsDirty(false);
        toast({
          title: 'Settings saved',
          description: 'Your privacy preferences have been updated successfully.'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error saving settings',
          description: 'Failed to save your privacy preferences. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!confirm('Are you sure you want to delete all your behavioral data? This action cannot be undone.')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('behavioral_events')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Data deleted',
        description: 'All your behavioral data has been permanently deleted.'
      });
    } catch (error) {
      console.error('Error deleting data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete your data. Please try again.'
      });
    }
  };

  const updateSetting = <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
    if (!settings) return;
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
    setIsDirty(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <Alert>
        <AlertDescription>
          Unable to load privacy settings. Please refresh the page to try again.
        </AlertDescription>
      </Alert>
    );
  }

  const retentionOptions = [
    { value: 30, label: '30 days' },
    { value: 90, label: '3 months' },
    { value: 180, label: '6 months' },
    { value: 365, label: '1 year' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Privacy & Data Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your privacy preferences and control how your data is used.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Collection Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Behavioral Tracking */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Behavioral Analytics</Label>
                <p className="text-sm text-muted-foreground">
                  Collect usage data to personalize your experience and provide insights.
                </p>
              </div>
              <Switch
                checked={settings.behavioral_tracking_consent}
                onCheckedChange={(checked) => 
                  updateSetting('behavioral_tracking_consent', checked)
                }
              />
            </div>
          </div>

          <Separator />

          {/* Data Retention */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Data Retention Period</Label>
            <p className="text-sm text-muted-foreground">
              How long your activity data is kept before automatic deletion.
            </p>
            <Select
              value={settings.data_retention_days.toString()}
              onValueChange={(value) => 
                updateSetting('data_retention_days', parseInt(value))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {retentionOptions.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Analytics Sharing */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Share Analytics with Connections</Label>
                <p className="text-sm text-muted-foreground">
                  Allow family connections to view anonymized progress insights.
                </p>
              </div>
              <Switch
                checked={settings.analytics_sharing_consent}
                onCheckedChange={(checked) => 
                  updateSetting('analytics_sharing_consent', checked)
                }
              />
            </div>
          </div>

          {!settings.behavioral_tracking_consent && (
            <Alert>
              <AlertDescription>
                <strong>Note:</strong> Disabling behavioral tracking may limit personalized 
                recommendations and family insights, but all core features will remain functional.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Delete All Behavioral Data</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Permanently delete all your stored behavioral and analytics data. 
              This action cannot be undone.
            </p>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDeleteAllData}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {isDirty && (
        <div className="fixed bottom-6 right-6">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}