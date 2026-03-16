import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/utils/getErrorMessage';


export default function AdminSiteSettings() {
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [parentSignupEnabled, setParentSignupEnabled] = useState(true);
  const [siteMaintenanceMode, setSiteMaintenanceMode] = useState(false);
  const [maxFamiliesPerParent, setMaxFamiliesPerParent] = useState(5);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  useEffect(() => {
    loadSiteSettings();
  }, []);

  const loadSiteSettings = async () => {
    setLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value');

      if (error) {
        console.error('Error loading site settings:', error);
      } else {
        const parsedSettings: {
          parent_signup_enabled?: boolean;
          site_maintenance_mode?: boolean;
          max_families_per_parent?: number;
        } = {};
        
        data?.forEach((setting) => {
          const key = setting.setting_key;
          const rawValue = setting.setting_value;
          
          if (rawValue === null) return;
          
          // Parse based on known setting types
          if (key === 'parent_signup_enabled' || key === 'site_maintenance_mode') {
            if (typeof rawValue === 'boolean') {
              parsedSettings[key] = rawValue;
            } else if (rawValue === 'true' || rawValue === 'false') {
              parsedSettings[key] = rawValue === 'true';
            }
          } else if (key === 'max_families_per_parent') {
            if (typeof rawValue === 'number') {
              parsedSettings[key] = rawValue;
            } else if (typeof rawValue === 'string' && !isNaN(Number(rawValue))) {
              parsedSettings[key] = Number(rawValue);
            }
          }
        });

        setParentSignupEnabled(parsedSettings.parent_signup_enabled ?? true);
        setSiteMaintenanceMode(parsedSettings.site_maintenance_mode ?? false);
        setMaxFamiliesPerParent(parsedSettings.max_families_per_parent ?? 5);
      }
    } catch (error: unknown) {
      console.error('Error loading site settings:', getErrorMessage(error));
    } finally {
      setLoadingSettings(false);
    }
  };

  const updateSiteSetting = async (settingKey: string, settingValue: boolean | number) => {
    setUpdatingSettings(true);
    try {
      const { error } = await supabase.functions.invoke('update-site-settings', {
        body: {
          setting_key: settingKey,
          setting_value: settingValue
        }
      });

      if (error) {
        throw error;
      }

      // Update local state
      if (settingKey === 'parent_signup_enabled') {
        setParentSignupEnabled(settingValue as boolean);
      } else if (settingKey === 'site_maintenance_mode') {
        setSiteMaintenanceMode(settingValue as boolean);
      } else if (settingKey === 'max_families_per_parent') {
        setMaxFamiliesPerParent(settingValue as number);
      }

      toast({
        title: "Setting Updated",
        description: `${settingKey.replace(/_/g, ' ')} has been ${typeof settingValue === 'boolean' ? (settingValue ? 'enabled' : 'disabled') : 'updated'}`,
      });
    } catch (error: unknown) {
      console.error('Error updating site setting:', getErrorMessage(error));
      toast({
        title: "Update Failed",
        description: "Failed to update site setting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingSettings(false);
    }
  };

  return (
    <Card className="bg-gradient-card border-border shadow-soft">
      <CardHeader>
        <Button
          onClick={() => setShowSettings(!showSettings)}
          variant="ghost"
          className="w-full justify-between p-0 h-auto hover:bg-transparent"
          disabled={loadingSettings}
        >
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-primary" />
            <div className="flex flex-col items-start">
              <CardTitle className="text-foreground">Site Settings</CardTitle>
              <CardDescription className="text-muted-foreground">
                Global site configuration
              </CardDescription>
            </div>
          </div>
          {loadingSettings ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : showSettings ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>

      {showSettings && (
        <CardContent>
          <div className="space-y-6">
            {/* Parent Signup Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-foreground">
                  Parent Signup
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow new parents to sign up from the main site
                </p>
              </div>
              <Switch
                checked={parentSignupEnabled}
                onCheckedChange={(checked) => updateSiteSetting('parent_signup_enabled', checked)}
                disabled={updatingSettings}
              />
            </div>

            {/* Site Maintenance Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-foreground">
                  Maintenance Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Put the site in maintenance mode for all users
                </p>
              </div>
              <Switch
                checked={siteMaintenanceMode}
                onCheckedChange={(checked) => updateSiteSetting('site_maintenance_mode', checked)}
                disabled={updatingSettings}
              />
            </div>
            
            {/* Status Summary */}
            <div className="text-xs text-muted-foreground border-t border-border pt-4 space-y-1">
              <div>
                Parent signup:{' '}
                <span className={parentSignupEnabled ? 'text-secondary' : 'text-destructive'}>
                  {parentSignupEnabled ? 'enabled' : 'disabled'}
                </span>
              </div>
              <div>
                Maintenance mode:{' '}
                <span className={siteMaintenanceMode ? 'text-destructive' : 'text-secondary'}>
                  {siteMaintenanceMode ? 'active' : 'inactive'}
                </span>
              </div>
              <div>
                Max families per parent: <span className="text-foreground">{maxFamiliesPerParent}</span>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}