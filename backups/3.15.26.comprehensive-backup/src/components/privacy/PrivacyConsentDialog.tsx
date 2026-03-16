import { useState } from 'react';
import { Shield, Eye, Clock, BarChart3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { updatePrivacySettings, type PrivacySettings } from '@/utils/privacySettings';

interface PrivacyConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  isFirstTime?: boolean;
}

export default function PrivacyConsentDialog({ 
  open, 
  onOpenChange, 
  onComplete, 
  isFirstTime = false 
}: PrivacyConsentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Partial<PrivacySettings>>({
    behavioral_tracking_consent: false,
    data_retention_days: 90,
    analytics_sharing_consent: false
  });

  const retentionOptions = [
    { value: 30, label: '30 days' },
    { value: 90, label: '3 months (recommended)' },
    { value: 180, label: '6 months' },
    { value: 365, label: '1 year' }
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      const success = await updatePrivacySettings(settings);
      
      if (success) {
        toast({
          title: 'Privacy settings saved',
          description: 'Your privacy preferences have been updated successfully.'
        });
        onComplete();
        onOpenChange(false);
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
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {isFirstTime ? 'Privacy & Data Settings' : 'Update Privacy Settings'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {isFirstTime && (
            <Alert>
              <Eye className="h-4 w-4" />
              <AlertDescription>
                We respect your privacy. Please review and configure your data preferences below. 
                You can change these settings at any time.
              </AlertDescription>
            </Alert>
          )}

          {/* Behavioral Tracking */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Behavioral Analytics</Label>
                <p className="text-sm text-muted-foreground">
                  Allow us to collect anonymous usage data to improve the app experience. 
                  This includes page visits, feature usage, and interaction patterns.
                </p>
              </div>
              <Switch
                checked={settings.behavioral_tracking_consent}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, behavioral_tracking_consent: checked }))
                }
              />
            </div>
          </div>

          {/* Data Retention */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-medium">Data Retention Period</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              How long should we keep your activity data? Older data will be automatically deleted.
            </p>
            <Select
              value={settings.data_retention_days?.toString()}
              onValueChange={(value) => 
                setSettings(prev => ({ ...prev, data_retention_days: parseInt(value) }))
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

          {/* Analytics Sharing */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base font-medium">Analytics Insights Sharing</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share anonymized insights with family connections (like grandparents or tutors) 
                  to help them understand your child's progress.
                </p>
              </div>
              <Switch
                checked={settings.analytics_sharing_consent}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, analytics_sharing_consent: checked }))
                }
              />
            </div>
          </div>

          {!settings.behavioral_tracking_consent && (
            <Alert>
              <AlertDescription>
                <strong>Note:</strong> Disabling behavioral tracking may limit personalized recommendations 
                and insights, but core app functionality will remain available.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {isFirstTime ? 'Skip for now' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}