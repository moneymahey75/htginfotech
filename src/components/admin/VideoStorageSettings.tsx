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
  tvss_cloudflare_public_url: string | null;
  tvss_cloudflare_stream_enabled: boolean;
  tvss_bunny_api_key: string | null;
  tvss_bunny_storage_zone: string | null;
  tvss_bunny_cdn_url: string | null;
  tvss_bunny_stream_library_id: string | null;
  tvss_bunny_stream_api_key: string | null;
  tvss_bunny_use_stream: boolean;
  tvss_signed_url_expiry_seconds: number;
  tvss_max_file_size_mb: number;
  tvss_auto_compress: boolean;
}

export default function VideoStorageSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings && settings.tvss_active_provider !== 'bunny') {
      updateSetting('tvss_active_provider', 'bunny');
      updateSetting('tvss_bunny_use_stream', true);
    }
  }, [settings]);

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
          tvss_cloudflare_public_url: settings.tvss_cloudflare_public_url,
          tvss_cloudflare_stream_enabled: settings.tvss_cloudflare_stream_enabled,
          tvss_bunny_api_key: settings.tvss_bunny_api_key,
          tvss_bunny_storage_zone: settings.tvss_bunny_storage_zone,
          tvss_bunny_cdn_url: settings.tvss_bunny_cdn_url,
          tvss_bunny_stream_library_id: settings.tvss_bunny_stream_library_id,
          tvss_bunny_stream_api_key: settings.tvss_bunny_stream_api_key,
          tvss_bunny_use_stream: settings.tvss_bunny_use_stream,
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

  const testBunnyConnection = async () => {
    if (!settings) return;

    setTesting(true);
    setError('');
    setSuccess('');

    try {
      const apiKey = settings.tvss_bunny_api_key?.trim();
      const storageZone = settings.tvss_bunny_storage_zone?.trim();

      if (!apiKey || !storageZone) {
        setError('Please fill in Storage Zone Password and Storage Zone Name first');
        return;
      }

      console.log('Testing Bunny.net connection with:', {
        storageZone,
        apiKeyLength: apiKey.length,
        apiKeyPreview: apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 5)
      });

      const testFileName = `test-connection-${Date.now()}.txt`;
      const testContent = new Blob(['Bunny.net connection test'], { type: 'text/plain' });
      const url = `https://storage.bunnycdn.com/${storageZone}/${testFileName}`;

      console.log('Test upload URL:', url);

      const response = await fetch(url, {
        method: 'PUT',
        body: testContent,
        headers: {
          'AccessKey': apiKey,
          'Content-Type': 'application/octet-stream',
        },
      });

      console.log('Test response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('Test failed:', errorText);

        if (response.status === 401) {
          setError(
            `Authentication Failed (401): The Storage Zone Password is incorrect. ` +
            `Please verify you're using the PASSWORD (not Read Only Password) from: ` +
            `Bunny Dashboard → Storage → ${storageZone} → FTP & API Access → Password`
          );
        } else if (response.status === 404) {
          setError(
            `Storage Zone Not Found (404): The storage zone "${storageZone}" does not exist. ` +
            `Please check the Storage Zone Name in your Bunny.net dashboard.`
          );
        } else {
          setError(`Test failed (${response.status}): ${response.statusText}. ${errorText}`);
        }
        return;
      }

      await fetch(url, {
        method: 'DELETE',
        headers: {
          'AccessKey': apiKey,
        },
      }).catch(() => {});

      setSuccess('Connection successful! Your Bunny.net credentials are correct.');
    } catch (err: any) {
      console.error('Test connection error:', err);
      setError(`Test failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Bunny Stream Configuration</h2>
        <p className="text-gray-600">
          Professional video streaming with automatic transcoding and adaptive quality.
        </p>
      </div>

      {/* Bunny Stream Settings */}
      {(
        <div className="bg-purple-50 rounded-lg p-6">
          <h3 className="font-semibold text-purple-900 mb-4">Bunny.net Configuration</h3>


          <div className="space-y-4">
            <div className="bg-purple-100 border border-purple-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-purple-800">
                <strong>🎬 Bunny Stream Setup:</strong>
                <br />
                1. Log in to <strong>Bunny Dashboard</strong>
                <br />
                2. Go to <strong>Stream</strong> (left menu) → Create a Video Library
                <br />
                3. Click your library → <strong>API</strong> tab
                <br />
                4. Copy <strong>Library ID</strong> and <strong>API Key</strong>
              </p>
            </div>
            <>
              {/* Bunny Stream Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stream Library ID *
                  </label>
                  <input
                    type="text"
                    value={settings.tvss_bunny_stream_library_id || ''}
                    onChange={(e) => updateSetting('tvss_bunny_stream_library_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="12345"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Required: Found in Stream → Your Library → API → Library ID
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stream API Key *
                  </label>
                  <input
                    type="password"
                    value={settings.tvss_bunny_stream_api_key || ''}
                    onChange={(e) => updateSetting('tvss_bunny_stream_api_key', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Your Stream Library API Key"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Required: Found in Stream → Your Library → API → API Key
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✅ <strong>Bunny Stream Benefits:</strong>
                    <br />• Automatic video transcoding (multiple quality levels)
                    <br />• Built-in HLS adaptive streaming
                    <br />• Professional video player included
                    <br />• Thumbnail generation
                    <br />• Better security with token authentication
                  </p>
                </div>
              </>
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
        <h3 className="font-semibold text-gray-900 mb-2">Bunny Stream Features & Pricing</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>What You Get:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Automatic video transcoding to multiple quality levels</li>
            <li>HLS adaptive streaming for smooth playback</li>
            <li>Professional video player with quality selector</li>
            <li>Automatic thumbnail generation</li>
            <li>Video analytics and statistics</li>
            <li>Token-based security for paid content</li>
          </ul>
          <p className="mt-3">
            <strong>Pricing (100GB video library):</strong> ~$3-5/month
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Videos are stored permanently in Bunny Stream. Processing takes 2-5 minutes after upload.
          </p>
        </div>
      </div>
    </div>
  );
}
