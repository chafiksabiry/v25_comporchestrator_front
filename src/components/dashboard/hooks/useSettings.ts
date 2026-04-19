import { useState, useCallback } from 'react';
import { settingsApi, CompanySettings } from '../services/api/settings';
import { toast } from 'react-toastify';

export function useSettings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsApi.getSettings();
      console.log('Settings data:', data.data);
      setSettings(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(new Error(message));
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<CompanySettings>) => {
    try {
      setSaving(true);
      const updatedSettings = await settingsApi.updateSettings(newSettings);
      setSettings(updatedSettings);
      toast.success('Settings updated successfully');
      return updatedSettings;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update settings';
      setError(new Error(message));
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateLogo = useCallback(async (file: File) => {
    try {
      setSaving(true);
      const updatedSettings = await settingsApi.updateLogo(file);
      setSettings(updatedSettings);
      toast.success('Logo updated successfully');
      return updatedSettings;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update logo';
      setError(new Error(message));
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    settings,
    loading,
    saving,
    error,
    fetchSettings,
    updateSettings,
    updateLogo
  };
}
