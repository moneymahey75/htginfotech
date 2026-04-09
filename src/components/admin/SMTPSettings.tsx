import React, { useEffect, useState } from 'react';
import { invokeAdminFunction, supabase } from '../../lib/adminClient';
import { useNotification } from '../ui/NotificationProvider';
import { Eye, EyeOff, Key, Mail, Save, Server } from 'lucide-react';

interface SmtpSettingsFormData {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
}

const emptyForm: SmtpSettingsFormData = {
  smtpHost: '',
  smtpPort: '',
  smtpUser: '',
  smtpPass: '',
  smtpSecure: false,
};

interface SmtpSettingsResponse {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
}

const SMTPSettings: React.FC = () => {
  const notification = useNotification();
  const [formData, setFormData] = useState<SmtpSettingsFormData>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadSmtpSettings();
  }, []);

  const parseSettingValue = (value: unknown) => {
    if (typeof value !== 'string') {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const mapSettingsToForm = (settings: Record<string, unknown>): SmtpSettingsResponse => {
    const encryption = String(settings.smtp_encryption || '').trim().toLowerCase();

    return {
      smtpHost: String(settings.smtp_host || ''),
      smtpPort: Number(settings.smtp_port || 587),
      smtpUser: String(settings.smtp_username || ''),
      smtpPass: String(settings.smtp_password || ''),
      smtpSecure: encryption === 'ssl' || encryption === 'true' || Number(settings.smtp_port || 0) === 465,
    };
  };

  const loadSmtpSettings = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('tbl_system_settings')
        .select('tss_setting_key, tss_setting_value')
        .in('tss_setting_key', ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'smtp_encryption']);

      if (error) {
        throw new Error(error?.message || 'Failed to load SMTP settings.');
      }

      const settingsMap = (data || []).reduce<Record<string, unknown>>((acc, item: { tss_setting_key: string; tss_setting_value: unknown }) => {
        acc[item.tss_setting_key] = parseSettingValue(item.tss_setting_value);
        return acc;
      }, {});

      const smtpSettings = mapSettingsToForm(settingsMap);

      setFormData({
        smtpHost: smtpSettings.smtpHost,
        smtpPort: smtpSettings.smtpPort ? String(smtpSettings.smtpPort) : '',
        smtpUser: smtpSettings.smtpUser,
        smtpPass: smtpSettings.smtpPass,
        smtpSecure: Boolean(smtpSettings.smtpSecure),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load SMTP settings.';
      notification.showError('SMTP Load Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.smtpHost.trim() || !formData.smtpPort.trim() || !formData.smtpUser.trim() || !formData.smtpPass.trim()) {
      return 'All SMTP fields are required.';
    }

    if (!/^\d+$/.test(formData.smtpPort.trim())) {
      return 'SMTP Port must be numeric.';
    }

    return null;
  };

  const getPayload = () => ({
    smtpHost: formData.smtpHost.trim(),
    smtpPort: Number(formData.smtpPort),
    smtpUser: formData.smtpUser.trim(),
    smtpPass: formData.smtpPass.trim(),
    smtpSecure: formData.smtpSecure,
  });

  const buildSettingsPayload = () => {
    const payload = getPayload();

    return [
      {
        tss_setting_key: 'smtp_host',
        tss_setting_value: JSON.stringify(payload.smtpHost),
        tss_description: 'SMTP host',
      },
      {
        tss_setting_key: 'smtp_port',
        tss_setting_value: JSON.stringify(payload.smtpPort),
        tss_description: 'SMTP port',
      },
      {
        tss_setting_key: 'smtp_username',
        tss_setting_value: JSON.stringify(payload.smtpUser),
        tss_description: 'SMTP username',
      },
      {
        tss_setting_key: 'smtp_password',
        tss_setting_value: JSON.stringify(payload.smtpPass),
        tss_description: 'SMTP password',
      },
      {
        tss_setting_key: 'smtp_encryption',
        tss_setting_value: JSON.stringify(payload.smtpSecure ? 'ssl' : 'tls'),
        tss_description: 'SMTP encryption',
      },
    ];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      notification.showError('Validation Error', validationError);
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('tbl_system_settings')
        .upsert(buildSettingsPayload(), {
          onConflict: 'tss_setting_key',
        });

      if (error) {
        throw new Error(error.message);
      }

      notification.showSuccess('SMTP Updated', 'SMTP details were saved to system settings successfully.');
      await loadSmtpSettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save SMTP settings.';
      notification.showError('SMTP Update Failed', message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const validationError = validateForm();
    if (validationError) {
      notification.showError('Validation Error', validationError);
      return;
    }

    setTesting(true);

    try {
      const { error } = await invokeAdminFunction('smtp-settings', {
        method: 'POST',
        body: getPayload(),
      });

      if (error) {
        throw new Error(error.message);
      }

      notification.showSuccess('SMTP Test Passed', 'SMTP connection verified successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to test SMTP connection.';
      notification.showError('SMTP Test Failed', message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-sm font-medium text-gray-900">Loading SMTP details...</p>
          <p className="text-sm text-gray-500 mt-1">Fetching values from system settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-blue-100 p-3 rounded-lg">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">SMTP Details</h3>
          <p className="text-gray-600">Manage SMTP configuration from admin system settings</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="smtpHost" className="block text-sm font-medium text-gray-700 mb-2">
              SMTP_HOST *
            </label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="smtpHost"
                name="smtpHost"
                type="text"
                required
                value={formData.smtpHost}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="smtp.gmail.com"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label htmlFor="smtpPort" className="block text-sm font-medium text-gray-700 mb-2">
              SMTP_PORT *
            </label>
            <input
              id="smtpPort"
              name="smtpPort"
              type="number"
              required
              min="1"
              value={formData.smtpPort}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="587"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="smtpUser" className="block text-sm font-medium text-gray-700 mb-2">
              SMTP_USER *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="smtpUser"
                name="smtpUser"
                type="text"
                required
                value={formData.smtpUser}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="user@example.com"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label htmlFor="smtpPass" className="block text-sm font-medium text-gray-700 mb-2">
              SMTP_PASS *
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="smtpPass"
                name="smtpPass"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.smtpPass}
                onChange={handleChange}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter SMTP password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Hide SMTP password' : 'Show SMTP password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="smtpSecure" className="block text-sm font-medium text-gray-900">
                SMTP_SECURE *
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Enable for SSL/TLS secure mode. Disable for STARTTLS-style connections.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="smtpSecure"
                name="smtpSecure"
                type="checkbox"
                checked={formData.smtpSecure}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-12 h-7 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
              <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || saving}
            className="bg-gray-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {testing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Testing...</span>
              </>
            ) : (
              <>
                <Server className="h-4 w-4" />
                <span>Test SMTP Connection</span>
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={saving || testing}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save SMTP Details</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SMTPSettings;
