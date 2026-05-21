import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Save, Shield } from 'lucide-react';
import { supabase } from '../../lib/adminClient';
import { invalidateTurnstileConfigCache } from '../../lib/turnstile';

const SITE_KEY = 'cloudflare_turnstile_site_key';
const SECRET_KEY = 'cloudflare_turnstile_secret_key';

const CloudflareTurnstileSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    siteKey: '',
    secretKey: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setMessage(null);

        const { data, error } = await supabase
          .from('tbl_system_settings')
          .select('tss_setting_key, tss_setting_value')
          .in('tss_setting_key', [SITE_KEY, SECRET_KEY]);

        if (error) {
          throw error;
        }

        const settingsMap = (data || []).reduce<Record<string, string>>((acc, setting: any) => {
          let value = setting.tss_setting_value;
          if (typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch {
              // Keep original value.
            }
          }
          acc[setting.tss_setting_key] = String(value || '');
          return acc;
        }, {});

        setFormData({
          siteKey: settingsMap[SITE_KEY] || '',
          secretKey: settingsMap[SECRET_KEY] || '',
        });
      } catch (error) {
        console.error('Failed to load Cloudflare Turnstile settings:', error);
        setMessage({ type: 'error', text: 'Failed to load Cloudflare Turnstile settings.' });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload = [
        {
          tss_setting_key: SITE_KEY,
          tss_setting_value: JSON.stringify(formData.siteKey.trim()),
          tss_description: 'Cloudflare Turnstile site key',
        },
        {
          tss_setting_key: SECRET_KEY,
          tss_setting_value: JSON.stringify(formData.secretKey.trim()),
          tss_description: 'Cloudflare Turnstile secret key',
        },
      ];

      const { error } = await supabase
        .from('tbl_system_settings')
        .upsert(payload, { onConflict: 'tss_setting_key' });

      if (error) {
        throw error;
      }

      invalidateTurnstileConfigCache();
      setMessage({ type: 'success', text: 'Cloudflare Turnstile settings updated successfully.' });
    } catch (error) {
      console.error('Failed to save Cloudflare Turnstile settings:', error);
      setMessage({ type: 'error', text: 'Failed to save Cloudflare Turnstile settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="rounded-lg bg-indigo-100 p-3">
          <Shield className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Cloudflare CAPTCHA Settings</h4>
          <p className="text-gray-600">Save your Cloudflare Turnstile site key and secret key for frontend forms.</p>
        </div>
      </div>

      {message ? (
        <div className={`rounded-xl border p-4 ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-start gap-3">
            {message.type === 'success' ? (
              <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            )}
            <p className={`text-sm ${message.type === 'success' ? 'text-emerald-800' : 'text-red-700'}`}>{message.text}</p>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <p>Use Cloudflare Turnstile keys here. The site key is used in the frontend widget, and the secret key is used only for server-side validation.</p>
        <p className="mt-2">On localhost, the app falls back to Cloudflare’s official test keys until real keys are saved.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-12">
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-indigo-600" />
          <span className="text-sm text-gray-600">Loading Cloudflare Turnstile settings...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Site Key</label>
            <input
              type="text"
              value={formData.siteKey}
              onChange={(event) => setFormData((current) => ({ ...current, siteKey: event.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="1x00000000000000000000AA"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Secret Key</label>
            <input
              type="password"
              value={formData.secretKey}
              onChange={(event) => setFormData((current) => ({ ...current, secretKey: event.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="1x0000000000000000000000000000000AA"
              autoComplete="new-password"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CloudflareTurnstileSettings;
