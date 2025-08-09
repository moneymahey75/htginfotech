import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { supabase } from '../../lib/supabase';
import { Settings, Upload, Save, AlertCircle, CheckCircle } from 'lucide-react';

const GeneralSettings: React.FC = () => {
    const { settings, updateSettings } = useAdmin();
    const [formData, setFormData] = useState({
        siteName: settings.siteName,
        logoUrl: settings.logoUrl,
        dateFormat: settings.dateFormat,
        timezone: settings.timezone,
        defaultParentAccount: settings.defaultParentAccount
    });
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        setFormData({
            siteName: settings.siteName,
            logoUrl: settings.logoUrl,
            dateFormat: settings.dateFormat,
            timezone: settings.timezone,
            defaultParentAccount: settings.defaultParentAccount
        });
    }, [settings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveResult(null);

        try {
            // Update settings in database
            const updates = [
                { key: 'site_name', value: JSON.stringify(formData.siteName) },
                { key: 'logo_url', value: JSON.stringify(formData.logoUrl) },
                { key: 'date_format', value: JSON.stringify(formData.dateFormat) },
                { key: 'timezone', value: JSON.stringify(formData.timezone) },
                { key: 'default_parent_account', value: JSON.stringify(formData.defaultParentAccount) }
            ];

            for (const update of updates) {
                const { error } = await supabase
                    .from('tbl_system_settings')
                    .upsert({
                        tss_setting_key: update.key,
                        tss_setting_value: update.value,
                        tss_description: `${update.key.replace('_', ' ')} setting`
                    }, {
                        onConflict: 'tss_setting_key'
                    });

                if (error) {
                    throw error;
                }
            }

            // Update context
            updateSettings(formData);

            setSaveResult({
                success: true,
                message: 'General settings updated successfully!'
            });
        } catch (error) {
            console.error('Failed to save settings:', error);
            setSaveResult({
                success: false,
                message: 'Failed to save settings. Please try again.'
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

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-6">
                <div className="bg-blue-100 p-3 rounded-lg">
                    <Settings className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
                    <p className="text-gray-600">Configure basic site settings and branding</p>
                </div>
            </div>

            {saveResult && (
                <div className={`border rounded-lg p-4 mb-6 ${
                    saveResult.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                }`}>
                    <div className="flex items-center space-x-2">
                        {saveResult.success ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${
                            saveResult.success ? 'text-green-800' : 'text-red-800'
                        }`}>
              {saveResult.message}
            </span>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="siteName" className="block text-sm font-medium text-gray-700 mb-2">
                            Site Name *
                        </label>
                        <input
                            type="text"
                            id="siteName"
                            name="siteName"
                            required
                            value={formData.siteName}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter site name"
                        />
                    </div>

                    <div>
                        <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                            Logo URL *
                        </label>
                        <div className="flex space-x-2">
                            <input
                                type="url"
                                id="logoUrl"
                                name="logoUrl"
                                required
                                value={formData.logoUrl}
                                onChange={handleChange}
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="https://example.com/logo.png"
                            />
                            <button
                                type="button"
                                className="bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                            >
                                <Upload className="h-4 w-4" />
                                <span>Upload</span>
                            </button>
                        </div>
                        {formData.logoUrl && (
                            <div className="mt-2">
                                <img
                                    src={formData.logoUrl}
                                    alt="Logo Preview"
                                    className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="dateFormat" className="block text-sm font-medium text-gray-700 mb-2">
                            Date Format
                        </label>
                        <select
                            id="dateFormat"
                            name="dateFormat"
                            value={formData.dateFormat}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                            Timezone
                        </label>
                        <select
                            id="timezone"
                            name="timezone"
                            value={formData.timezone}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="UTC">UTC</option>
                            <option value="America/New_York">Eastern Time</option>
                            <option value="America/Chicago">Central Time</option>
                            <option value="America/Denver">Mountain Time</option>
                            <option value="America/Los_Angeles">Pacific Time</option>
                            <option value="Europe/London">London</option>
                            <option value="Asia/Kolkata">India Standard Time</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="defaultParentAccount" className="block text-sm font-medium text-gray-700 mb-2">
                        Default Parent Account
                    </label>
                    <input
                        type="text"
                        id="defaultParentAccount"
                        name="defaultParentAccount"
                        value={formData.defaultParentAccount}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Default parent account for orphaned users"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Used when a user registers without a valid referral
                    </p>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                <span>Save Settings</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default GeneralSettings;