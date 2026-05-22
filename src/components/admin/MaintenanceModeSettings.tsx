import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, Loader2, Power, Save, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/adminClient';

const SETTING_KEYS = [
  'maintenance_mode_enabled',
  'maintenance_notify_from_at',
  'maintenance_start_at',
  'maintenance_end_at',
  'maintenance_allowed_ips',
];

const toLocalDateTimeInput = (value: string) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const localDateTimeToIso = (value: string) => (value ? new Date(value).toISOString() : '');

const parseIpInput = (value: string) =>
  value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

type SettingRow = {
  tss_setting_key: string;
  tss_setting_value: unknown;
};

const MaintenanceModeSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    enabled: false,
    notifyFromAt: '',
    startAt: '',
    endAt: '',
    allowedIps: '',
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setMessage(null);

        const { data, error } = await supabase
          .from('tbl_system_settings')
          .select('tss_setting_key, tss_setting_value')
          .in('tss_setting_key', SETTING_KEYS);

        if (error) {
          throw error;
        }

        const settingsMap = ((data || []) as SettingRow[]).reduce<Record<string, unknown>>((acc, setting) => {
          let value = setting.tss_setting_value;

          if (typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch {
              // Keep original string.
            }
          }

          acc[setting.tss_setting_key] = value;
          return acc;
        }, {});

        const allowedIps = Array.isArray(settingsMap.maintenance_allowed_ips)
          ? settingsMap.maintenance_allowed_ips.join('\n')
          : String(settingsMap.maintenance_allowed_ips || '');

        setFormData({
          enabled: Boolean(settingsMap.maintenance_mode_enabled),
          notifyFromAt: toLocalDateTimeInput(String(settingsMap.maintenance_notify_from_at || '')),
          startAt: toLocalDateTimeInput(String(settingsMap.maintenance_start_at || '')),
          endAt: toLocalDateTimeInput(String(settingsMap.maintenance_end_at || '')),
          allowedIps,
        });
      } catch (error) {
        console.error('Failed to load maintenance settings:', error);
        setMessage({ type: 'error', text: 'Failed to load maintenance settings.' });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const validate = () => {
    if (!formData.notifyFromAt || !formData.startAt || !formData.endAt) {
      return 'Please fill all maintenance date/time fields.';
    }

    const notifyTime = new Date(formData.notifyFromAt).getTime();
    const startTime = new Date(formData.startAt).getTime();
    const endTime = new Date(formData.endAt).getTime();

    if (![notifyTime, startTime, endTime].every(Number.isFinite)) {
      return 'Please enter valid date/time values.';
    }

    if (startTime <= notifyTime) {
      return 'Maintenance Mode Start DateTime must be greater than Show Frontend User From DateTime.';
    }

    if (endTime <= startTime) {
      return 'Auto Finish Maintenance Mode DateTime must be greater than Maintenance Mode Start DateTime.';
    }

    return '';
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const validationError = validate();

      if (validationError) {
        setMessage({ type: 'error', text: validationError });
        return;
      }

      const payload = [
        {
          tss_setting_key: 'maintenance_mode_enabled',
          tss_setting_value: JSON.stringify(formData.enabled),
          tss_description: 'Enable or disable frontend maintenance mode',
        },
        {
          tss_setting_key: 'maintenance_notify_from_at',
          tss_setting_value: JSON.stringify(localDateTimeToIso(formData.notifyFromAt)),
          tss_description: 'When frontend users should start seeing upcoming maintenance notice',
        },
        {
          tss_setting_key: 'maintenance_start_at',
          tss_setting_value: JSON.stringify(localDateTimeToIso(formData.startAt)),
          tss_description: 'When maintenance mode should begin',
        },
        {
          tss_setting_key: 'maintenance_end_at',
          tss_setting_value: JSON.stringify(localDateTimeToIso(formData.endAt)),
          tss_description: 'When maintenance mode should automatically end',
        },
        {
          tss_setting_key: 'maintenance_allowed_ips',
          tss_setting_value: JSON.stringify(parseIpInput(formData.allowedIps)),
          tss_description: 'IP addresses allowed to bypass maintenance mode',
        },
      ];

      const { error } = await supabase
        .from('tbl_system_settings')
        .upsert(payload, { onConflict: 'tss_setting_key' });

      if (error) {
        throw error;
      }

      setMessage({ type: 'success', text: 'Maintenance mode settings saved successfully.' });
    } catch (error) {
      console.error('Failed to save maintenance settings:', error);
      setMessage({ type: 'error', text: 'Failed to save maintenance settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="rounded-lg bg-amber-100 p-3">
          <Clock className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Maintenance Mode</h4>
          <p className="text-gray-600">Schedule downtime, notify users, and allow trusted IPs to bypass maintenance.</p>
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

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-12">
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-amber-600" />
          <span className="text-sm text-gray-600">Loading maintenance settings...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
            Date/time values are saved as UTC ISO timestamps after being selected in your local browser time.
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-gray-900">Manual Maintenance Control</p>
              <p className="text-sm text-gray-600">Enable or disable maintenance mode manually at any time.</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData((current) => ({ ...current, enabled: !current.enabled }))}
              className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
                formData.enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Power className="mr-2 h-4 w-4" />
              {formData.enabled ? 'Disable Maintenance' : 'Enable Maintenance'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Show Frontend User From DateTime</label>
              <input
                type="datetime-local"
                value={formData.notifyFromAt}
                onChange={(event) => setFormData((current) => ({ ...current, notifyFromAt: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Maintenance Mode Start DateTime</label>
              <input
                type="datetime-local"
                value={formData.startAt}
                onChange={(event) => setFormData((current) => ({ ...current, startAt: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Auto Finish Maintenance Mode DateTime</label>
              <input
                type="datetime-local"
                value={formData.endAt}
                onChange={(event) => setFormData((current) => ({ ...current, endAt: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Allowed IP Addresses</label>
            <textarea
              rows={5}
              value={formData.allowedIps}
              onChange={(event) => setFormData((current) => ({ ...current, allowedIps: event.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              placeholder={`203.0.113.10\n198.51.100.25`}
            />
            <p className="mt-2 flex items-start gap-2 text-xs text-gray-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
              Add multiple IPs separated by commas or new lines. Matching IPs can fully access the frontend during maintenance.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Maintenance Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default MaintenanceModeSettings;
