import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SiteSettings {
  parent_signup_enabled: boolean;
  site_maintenance_mode: boolean;
  max_families_per_parent: number;
}

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>({
    parent_signup_enabled: true,
    site_maintenance_mode: false,
    max_families_per_parent: 5,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['parent_signup_enabled', 'site_maintenance_mode', 'max_families_per_parent']);

      if (error) {
        throw error;
      }

      const parsedSettings: Partial<SiteSettings> = {};
      data?.forEach((setting) => {
        const key = setting.setting_key;
        const rawValue = setting.setting_value;
        
        if (rawValue === null) return;
        
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

      setSettings(prev => ({ ...prev, ...parsedSettings }));
      setError(null);
    } catch (err) {
      console.error('Error loading site settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    loading,
    error,
    refresh: loadSettings,
  };
};
