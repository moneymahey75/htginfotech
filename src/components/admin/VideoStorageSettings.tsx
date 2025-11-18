import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { videoStorage, StorageProvider } from '../../lib/videoStorage';
import { Save, HardDrive, Cloud, Zap, AlertCircle, CheckCircle } from 'lucide-react';

interface Settings {
  tvss_id: string;
  tvss_active_provider: StorageProvider;
  tvss_supabase_bucket: string;
  tvss_cloudflare_account_id: string | null;
  tvss_cloudflare_access_key: string | null;
  tvss_cloudflare_secret_key: string | null;
  tvss_cloudflare_bucket: string | null;
  tvss_cloudflare_worker_url: string | null;
  tvss_cloudflare_stream_enabled: boolean;
  tvss_bunny_api_key: string | null;
  tvss_bunny_storage_zone: string | null;
  tvss_bunny_cdn_url: string | null;
  tvss_bunny_stream_library_id: string | null;
  tvss_signed_url_expiry_seconds: number;
  tvss_max_file_size_mb: number;
  tvss_auto_compress: boolean;
}

export default function VideoStorageSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('tbl_video_storage_settings')
        .select('*')
        .single();

      if (fetchError) throw fetchError;
      setSettings(data);
    } catch (err: any) {
      setError('Failed to load storage settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { error: updateError } = await supabase
        .from('tbl_video_storage_settings')
        .update({
          tvss_active_provider: settings.tvss_active_provider,
          tvss_supabase_bucket: settings.tvss_supabase_bucket,
          tvss_cloudflare_account_id: settings.tvss_cloudflare_account_id,
          tvss_cloudflare_access_key: settings.tvss_cloudflare_access_key,
          tvss_cloudflare_secret_key: settings.tvss_cloudflare_secret_key,
          tvss_cloudflare_bucket: settings.tvss_cloudflare_bucket,
          tvss_cloudflare_worker_url: settings.tvss_cloudflare_worker_url,
          tvss_cloudflare_stream_enabled: settings.tvss_cloudflare_stream_enabled,
          tvss_bunny_api_key: settings.tvss_bunny_api_key,
          tvss_bunny_storage_zone: settings.tvss_bunny_storage_zone,
          tvss_bunny_cdn_url: settings.tvss_bunny_cdn_url,
          tvss_bunny_stream_library_id: settings.tvss_bunny_stream_library_id,
          tvss_signed_url_expiry_seconds: settings.tvss_signed_url_expiry_seconds,
          tvss_max_file_size_mb: settings.tvss_max_file_size_mb,
          tvss_auto_compress: settings.tvss_auto_compress,
        })
        .eq('tvss_id', settings.tvss_id);

      if (updateError) throw updateError;

      videoStorage.clearCache();
      setSuccess('Settings saved successfully!');
    } catch (err: any) {
      setError('Failed to save settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof Settings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Storage settings not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Video Storage Configuration</h2>
        <p className="text-gray-600">
          Choose your video storage provider and configure credentials. You can migrate videos between providers later.
        </p>
      </div>

      {/* Provider Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Storage Provider</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => updateSetting('tvss_active_provider', 'supabase')}
            className={`p-6 rounded-lg border-2 transition-all ${
              settings.tvss_active_provider === 'supabase'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <HardDrive className="h-10 w-10 mx-auto mb-3 text-blue-600" />
            <div className="font-semibold text-lg mb-1">Supabase Storage</div>
            <div className="text-sm text-gray-600 mb-2">$25/month for 100GB</div>
            <div className="text-xs text-gray-500">
              Easy integration, no setup required
            </div>
          </button>

          <button
            type="button"
            onClick={() => updateSetting('tvss_active_provider', 'cloudflare')}
            className={`p-6 rounded-lg border-2 transition-all ${
              settings.tvss_active_provider === 'cloudflare'
                ? 'border-orange-600 bg-orange-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Cloud className="h-10 w-10 mx-auto mb-3 text-orange-600" />
            <div className="font-semibold text-lg mb-1">Cloudflare R2</div>
            <div className="text-sm text-gray-600 mb-2">Free: 10GB storage</div>
            <div className="text-xs text-gray-500">
              No egress fees, global CDN
            </div>
          </button>

          <button
            type="button"
            onClick={() => updateSetting('tvss_active_provider', 'bunny')}
            className={`p-6 rounded-lg border-2 transition-all ${
              settings.tvss_active_provider === 'bunny'
                ? 'border-purple-600 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Zap className="h-10 w-10 mx-auto mb-3 text-purple-600" />
            <div className="font-semibold text-lg mb-1">Bunny.net</div>
            <div className="text-sm text-gray-600 mb-2">$0.01/GB storage</div>
            <div className="text-xs text-gray-500">
              Most cost-effective at scale
            </div>
          </button>
        </div>
      </div>

      {/* Supabase Settings */}
      {settings.tvss_active_provider === 'supabase' && (
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-4">Supabase Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bucket Name
              </label>
              <input
                type="text"
                value={settings.tvss_supabase_bucket}
                onChange={(e) => updateSetting('tvss_supabase_bucket', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="course-videos"
              />
              <p className="text-xs text-gray-600 mt-1">
                Create this bucket in your Supabase dashboard (Storage section)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cloudflare Settings */}
      {settings.tvss_active_provider === 'cloudflare' && (
        <div className="bg-orange-50 rounded-lg p-6">
          <h3 className="font-semibold text-orange-900 mb-4">Cloudflare R2 Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Worker URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={settings.tvss_cloudflare_worker_url || ''}
                onChange={(e) => updateSetting('tvss_cloudflare_worker_url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="https://course-videos.workers.dev"
              />
              <p className="text-xs text-gray-600 mt-1">
                Required: Your deployed Cloudflare Worker URL for handling video uploads
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account ID
              </label>
              <input
                type="text"
                value={settings.tvss_cloudflare_account_id || ''}
                onChange={(e) => updateSetting('tvss_cloudflare_account_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-600 mt-1">
                Find in Cloudflare Dashboard → R2 → Overview
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Key ID
              </label>
              <input
                type="text"
                value={settings.tvss_cloudflare_access_key || ''}
                onChange={(e) => updateSetting('tvss_cloudflare_access_key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-600 mt-1">
                Used by Worker for R2 authentication
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secret Access Key
              </label>
              <input
                type="password"
                value={settings.tvss_cloudflare_secret_key || ''}
                onChange={(e) => updateSetting('tvss_cloudflare_secret_key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-600 mt-1">
                Keep this secure - used by Worker only
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bucket Name
              </label>
              <input
                type="text"
                value={settings.tvss_cloudflare_bucket || ''}
                onChange={(e) => updateSetting('tvss_cloudflare_bucket', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="course-videos"
              />
              <p className="text-xs text-gray-600 mt-1">
                Your R2 bucket name (must exist in Cloudflare)
              </p>
            </div>
            <div className="bg-orange-100 border border-orange-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-orange-900 font-medium mb-2">
                📚 Setup Required
              </p>
              <p className="text-xs text-orange-800">
                Before using Cloudflare R2, you must deploy the Cloudflare Worker.
                See <code className="bg-orange-200 px-1 py-0.5 rounded">CLOUDFLARE_WORKER_SETUP.md</code> for deployment instructions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bunny Settings */}
      {settings.tvss_active_provider === 'bunny' && (
        <div className="bg-purple-50 rounded-lg p-6">
          <h3 className="font-semibold text-purple-900 mb-4">Bunny.net Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={settings.tvss_bunny_api_key || ''}
                onChange={(e) => updateSetting('tvss_bunny_api_key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Storage Zone Name
              </label>
              <input
                type="text"
                value={settings.tvss_bunny_storage_zone || ''}
                onChange={(e) => updateSetting('tvss_bunny_storage_zone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CDN URL (Pull Zone)
              </label>
              <input
                type="text"
                value={settings.tvss_bunny_cdn_url || ''}
                onChange={(e) => updateSetting('tvss_bunny_cdn_url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="https://your-pullzone.b-cdn.net"
              />
            </div>
          </div>
        </div>
      )}

      {/* General Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Signed URL Expiry (seconds)
            </label>
            <input
              type="number"
              value={settings.tvss_signed_url_expiry_seconds}
              onChange={(e) => updateSetting('tvss_signed_url_expiry_seconds', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min="300"
              max="86400"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default: 3600 (1 hour). Shorter = more secure
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max File Size (MB)
            </label>
            <input
              type="number"
              value={settings.tvss_max_file_size_mb}
              onChange={(e) => updateSetting('tvss_max_file_size_mb', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min="10"
              max="5000"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended: 500MB max per video
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.tvss_auto_compress}
              onChange={(e) => updateSetting('tvss_auto_compress', e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Show compression reminder before upload
            </span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          <Save className="h-5 w-5 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Info Panel */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Migration & Cost Information</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>Storage Costs (approx):</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Supabase: $25/month for 100GB storage + bandwidth</li>
            <li>Cloudflare R2: Free tier 10GB, then $0.015/GB (no egress fees)</li>
            <li>Bunny.net: $0.01/GB storage + $0.005/GB bandwidth</li>
          </ul>
          <p className="mt-3">
            <strong>Migration:</strong> Videos uploaded to one provider stay there. New uploads use the active provider.
            You can manually migrate individual videos using the migration tool (coming soon).
          </p>
          <p className="mt-2">
            <strong>Recommendation:</strong> Start with Supabase if client agrees ($25/month).
            Switch to Cloudflare R2 for free tier, then Bunny.net for scaling cost-effectively.
          </p>
        </div>
      </div>
    </div>
  );
}
