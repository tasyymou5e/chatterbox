import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SiteSettings {
  parent_signup_enabled: boolean;
  site_maintenance_mode: boolean;
  max_families_per_parent: number;
}

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>({
    parent_signup_enabled: false,
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

      const settingsMap: Record<string, any> = {};
      data?.forEach((setting) => {
        const key = setting.setting_key;
        let value = setting.setting_value;
        
        // Handle different data types
        if (typeof value === 'string') {
          if (value === 'true' || value === 'false') {
            value = value === 'true';
          } else if (!isNaN(Number(value))) {
            value = Number(value);
          }
        }
        
        settingsMap[key] = value;
      });

      setSettings(prev => ({ ...prev, ...settingsMap as Partial<SiteSettings> }));
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