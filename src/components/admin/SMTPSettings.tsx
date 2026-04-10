import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { supabase } from '../../lib/adminClient';
import { Mail, Server, Key, AlertCircle, CheckCircle, Save } from 'lucide-react';

const buildSmtpUpdates = (formData: {
  host: string;
  port: number;
  username: string;
  password: string;
  encryption: string;
}) => ([
  { tss_setting_key: 'smtp_host', tss_setting_value: JSON.stringify(formData.host), tss_description: 'smtp host setting' },
  { tss_setting_key: 'smtp_port', tss_setting_value: JSON.stringify(Number(formData.port) || 587), tss_description: 'smtp port setting' },
  { tss_setting_key: 'smtp_username', tss_setting_value: JSON.stringify(formData.username), tss_description: 'smtp username setting' },
  { tss_setting_key: 'smtp_password', tss_setting_value: JSON.stringify(formData.password), tss_description: 'smtp password setting' },
  { tss_setting_key: 'smtp_encryption', tss_setting_value: JSON.stringify(formData.encryption), tss_description: 'smtp encryption setting' }
]);

const SMTPSettings: React.FC = () => {
  const { emailSMTP, updateEmailSMTP } = useAdmin();
  const [formData, setFormData] = useState(emailSMTP);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setFormData(emailSMTP);
  }, [emailSMTP]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setResult(null);

    try {
      const normalizedFormData = {
        ...formData,
        host: formData.host.trim(),
        port: Number(formData.port) || 587,
        username: formData.username.trim(),
        password: formData.password.trim(),
        encryption: formData.encryption.trim().toUpperCase()
      };

      const { error } = await supabase
        .from('tbl_system_settings')
        .upsert(buildSmtpUpdates(normalizedFormData), {
          onConflict: 'tss_setting_key'
        });

      if (error) {
        throw error;
      }

      updateEmailSMTP(normalizedFormData);
      setFormData(normalizedFormData);
      setResult({
        success: true,
        message: 'SMTP settings updated successfully.'
      });
    } catch (error) {
      console.error('Failed to save SMTP settings:', error);
      setResult({
        success: false,
        message: 'Failed to save SMTP settings. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const testSMTPConnection = async () => {
    setTesting(true);
    setResult(null);

    try {
      // Simulate SMTP test - in production, this would test via Supabase
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock test result
      const isValid = formData.host && formData.port && formData.username && formData.password && formData.encryption;
      
      if (isValid) {
        setResult({
          success: true,
          message: 'SMTP configuration looks valid.'
        });
      } else {
        setResult({
          success: false,
          message: 'SMTP configuration incomplete. Please fill all required fields.'
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: `Configuration test failed: ${error.message}`
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-blue-100 p-3 rounded-lg">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">SMTP Settings</h3>
          <p className="text-gray-600">Auto-fill and update SMTP values stored in system settings</p>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-2">
          <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">SMTP Configuration</h4>
            <div className="text-sm text-blue-700 mt-1">
              <ol className="list-decimal list-inside space-y-1">
                <li>Values here are loaded from `tbl_system_settings` automatically.</li>
                <li>Update the SMTP host, port, username, password, and encryption used for outgoing mail.</li>
                <li>After saving, all edge functions will use these values for email delivery.</li>
                <li>If you use Resend, set host to <span className="font-medium">smtp.resend.com</span>.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className={`border rounded-lg p-4 mb-6 ${
          result.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={`text-sm font-medium ${
              result.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {result.message}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Host
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Server className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="host"
                name="host"
                value={formData.host}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="smtp.resend.com"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Example: `smtp.resend.com`</p>
          </div>

          <div>
            <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-2">
              Port
            </label>
            <input
              type="number"
              id="port"
              name="port"
              value={formData.port}
              onChange={handleChange}
              className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">Common values: `587`, `465`, `2525`</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
            SMTP Username / From Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              id="username"
              name="username"
              required
              value={formData.username}
              onChange={handleChange}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="noreply@yourdomain.com"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Usually your sender email or SMTP username</p>
          </div>

          <div>
            <label htmlFor="encryption" className="block text-sm font-medium text-gray-700 mb-2">
              Encryption
            </label>
            <select
              id="encryption"
              name="encryption"
              value={formData.encryption}
              onChange={handleChange}
              className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="TLS">TLS</option>
              <option value="SSL">SSL</option>
              <option value="STARTTLS">STARTTLS</option>
              <option value="NONE">NONE</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Matches the SMTP server security mode</p>
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            SMTP Password / API Key
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Key className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              id="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="re_xxxxxxxxxxxxxxxxx"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Stored in `tbl_system_settings` and reused by mail functions</p>
        </div>

        <div className="flex space-x-4">
          <button
            type="button"
            onClick={testSMTPConnection}
            disabled={testing}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {testing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Testing...</span>
              </>
            ) : (
              <>
                <Server className="h-4 w-4" />
                <span>Test Configuration</span>
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save SMTP Settings'}</span>
          </button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Helpful Notes</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-gray-50 p-3 rounded-lg">
            <h5 className="font-medium text-gray-900">Auto-Fill</h5>
            <p>Saved values are loaded from `tbl_system_settings` when the admin page opens.</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <h5 className="font-medium text-gray-900">Shared Mail Config</h5>
            <p>Contact, reset-password, welcome, and verification emails use these saved settings.</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <h5 className="font-medium text-gray-900">Update Anytime</h5>
            <p>You can edit the values here and save without opening Supabase SQL manually.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SMTPSettings;
