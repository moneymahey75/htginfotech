import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { supabase } from '../../lib/supabase';
import { Phone, Mail, MapPin, Globe, Save, AlertCircle, CheckCircle, Facebook, Instagram, Linkedin, Twitter, Youtube, MessageCircle, Clock } from 'lucide-react';

const ContactSocialSettings: React.FC = () => {
    const { settings, updateSettings } = useAdmin();
    const [formData, setFormData] = useState({
        primaryPhone: settings.primaryPhone || '',
        secondaryPhone: settings.secondaryPhone || '',
        primaryEmail: settings.primaryEmail || '',
        supportEmail: settings.supportEmail || '',
        address: settings.address || '',
        city: settings.city || '',
        state: settings.state || '',
        zipCode: settings.zipCode || '',
        country: settings.country || '',
        businessHours: settings.businessHours || '',
        facebookUrl: settings.facebookUrl || '',
        instagramUrl: settings.instagramUrl || '',
        linkedinUrl: settings.linkedinUrl || '',
        twitterUrl: settings.twitterUrl || '',
        youtubeUrl: settings.youtubeUrl || '',
        whatsappNumber: settings.whatsappNumber || '',
        websiteUrl: settings.websiteUrl || '',
        blogUrl: settings.blogUrl || '',
        // New tagline fields
        primaryPhoneTagline: settings.primaryPhoneTagline || '',
        secondaryPhoneTagline: settings.secondaryPhoneTagline || '',
        primaryEmailTagline: settings.primaryEmailTagline || '',
        supportEmailTagline: settings.supportEmailTagline || ''
    });
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        setFormData({
            primaryPhone: settings.primaryPhone || '',
            secondaryPhone: settings.secondaryPhone || '',
            primaryEmail: settings.primaryEmail || '',
            supportEmail: settings.supportEmail || '',
            address: settings.address || '',
            city: settings.city || '',
            state: settings.state || '',
            zipCode: settings.zipCode || '',
            country: settings.country || '',
            businessHours: settings.businessHours || '',
            facebookUrl: settings.facebookUrl || '',
            instagramUrl: settings.instagramUrl || '',
            linkedinUrl: settings.linkedinUrl || '',
            twitterUrl: settings.twitterUrl || '',
            youtubeUrl: settings.youtubeUrl || '',
            whatsappNumber: settings.whatsappNumber || '',
            websiteUrl: settings.websiteUrl || '',
            blogUrl: settings.blogUrl || '',
            primaryPhoneTagline: settings.primaryPhoneTagline || '',
            secondaryPhoneTagline: settings.secondaryPhoneTagline || '',
            primaryEmailTagline: settings.primaryEmailTagline || '',
            supportEmailTagline: settings.supportEmailTagline || ''
        });
    }, [settings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveResult(null);

        try {
            const updates = [
                { key: 'primary_phone', value: JSON.stringify(formData.primaryPhone) },
                { key: 'secondary_phone', value: JSON.stringify(formData.secondaryPhone) },
                { key: 'primary_email', value: JSON.stringify(formData.primaryEmail) },
                { key: 'support_email', value: JSON.stringify(formData.supportEmail) },
                { key: 'address', value: JSON.stringify(formData.address) },
                { key: 'city', value: JSON.stringify(formData.city) },
                { key: 'state', value: JSON.stringify(formData.state) },
                { key: 'zip_code', value: JSON.stringify(formData.zipCode) },
                { key: 'country', value: JSON.stringify(formData.country) },
                { key: 'business_hours', value: JSON.stringify(formData.businessHours) },
                { key: 'facebook_url', value: JSON.stringify(formData.facebookUrl) },
                { key: 'instagram_url', value: JSON.stringify(formData.instagramUrl) },
                { key: 'linkedin_url', value: JSON.stringify(formData.linkedinUrl) },
                { key: 'twitter_url', value: JSON.stringify(formData.twitterUrl) },
                { key: 'youtube_url', value: JSON.stringify(formData.youtubeUrl) },
                { key: 'whatsapp_number', value: JSON.stringify(formData.whatsappNumber) },
                { key: 'website_url', value: JSON.stringify(formData.websiteUrl) },
                { key: 'blog_url', value: JSON.stringify(formData.blogUrl) },
                // New tagline fields
                { key: 'primary_phone_tagline', value: JSON.stringify(formData.primaryPhoneTagline) },
                { key: 'secondary_phone_tagline', value: JSON.stringify(formData.secondaryPhoneTagline) },
                { key: 'primary_email_tagline', value: JSON.stringify(formData.primaryEmailTagline) },
                { key: 'support_email_tagline', value: JSON.stringify(formData.supportEmailTagline) }
            ];

            for (const update of updates) {
                const { error } = await supabase
                    .from('tbl_system_settings')
                    .upsert({
                        tss_setting_key: update.key,
                        tss_setting_value: update.value,
                        tss_description: `${update.key.replace(/_/g, ' ')} setting`
                    }, {
                        onConflict: 'tss_setting_key'
                    });

                if (error) {
                    throw error;
                }
            }

            updateSettings(formData);

            setSaveResult({
                success: true,
                message: 'Contact and social media settings updated successfully!'
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-6">
                <div className="bg-purple-100 p-3 rounded-lg">
                    <Phone className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Contact & Social Media</h3>
                    <p className="text-gray-600">Manage contact information and social media links</p>
                </div>
            </div>

            {saveResult && (
                <div className={`border rounded-lg p-4 mb-6 ${
                    saveResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
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

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Contact Information Section */}
                <div>
                    <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-gray-200">
                        <Phone className="h-5 w-5 text-purple-600" />
                        <h4 className="text-md font-semibold text-gray-900">Contact Information</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Primary Phone with Tagline */}
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="primaryPhone" className="block text-sm font-medium text-gray-700 mb-2">
                                    Primary Phone
                                </label>
                                <input
                                    type="tel"
                                    id="primaryPhone"
                                    name="primaryPhone"
                                    value={formData.primaryPhone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>
                            <div>
                                <label htmlFor="primaryPhoneTagline" className="block text-sm font-medium text-gray-700 mb-2">
                                    Primary Phone Tagline
                                </label>
                                <input
                                    type="text"
                                    id="primaryPhoneTagline"
                                    name="primaryPhoneTagline"
                                    value={formData.primaryPhoneTagline}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="24/7 Support Available"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Short description shown below the phone number
                                </p>
                            </div>
                        </div>

                        {/* Secondary Phone with Tagline */}
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="secondaryPhone" className="block text-sm font-medium text-gray-700 mb-2">
                                    Secondary Phone
                                </label>
                                <input
                                    type="tel"
                                    id="secondaryPhone"
                                    name="secondaryPhone"
                                    value={formData.secondaryPhone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="+1 (555) 987-6543"
                                />
                            </div>
                            <div>
                                <label htmlFor="secondaryPhoneTagline" className="block text-sm font-medium text-gray-700 mb-2">
                                    Secondary Phone Tagline
                                </label>
                                <input
                                    type="text"
                                    id="secondaryPhoneTagline"
                                    name="secondaryPhoneTagline"
                                    value={formData.secondaryPhoneTagline}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Mon-Fri: 9AM-6PM EST"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Short description shown below the phone number
                                </p>
                            </div>
                        </div>

                        {/* Primary Email with Tagline */}
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="primaryEmail" className="block text-sm font-medium text-gray-700 mb-2">
                                    Primary Email
                                </label>
                                <input
                                    type="email"
                                    id="primaryEmail"
                                    name="primaryEmail"
                                    value={formData.primaryEmail}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="contact@company.com"
                                />
                            </div>
                            <div>
                                <label htmlFor="primaryEmailTagline" className="block text-sm font-medium text-gray-700 mb-2">
                                    Primary Email Tagline
                                </label>
                                <input
                                    type="text"
                                    id="primaryEmailTagline"
                                    name="primaryEmailTagline"
                                    value={formData.primaryEmailTagline}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="General Inquiries"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Short description shown below the email
                                </p>
                            </div>
                        </div>

                        {/* Support Email with Tagline */}
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="supportEmail" className="block text-sm font-medium text-gray-700 mb-2">
                                    Support Email
                                </label>
                                <input
                                    type="email"
                                    id="supportEmail"
                                    name="supportEmail"
                                    value={formData.supportEmail}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="support@company.com"
                                />
                            </div>
                            <div>
                                <label htmlFor="supportEmailTagline" className="block text-sm font-medium text-gray-700 mb-2">
                                    Support Email Tagline
                                </label>
                                <input
                                    type="text"
                                    id="supportEmailTagline"
                                    name="supportEmailTagline"
                                    value={formData.supportEmailTagline}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Technical Support & Help"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Short description shown below the email
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Address Section */}
                <div>
                    <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-gray-200">
                        <MapPin className="h-5 w-5 text-purple-600" />
                        <h4 className="text-md font-semibold text-gray-900">Office Address</h4>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                                Street Address
                            </label>
                            <textarea
                                id="address"
                                name="address"
                                rows={2}
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="123 Business Avenue"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                                    City
                                </label>
                                <input
                                    type="text"
                                    id="city"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Tech City"
                                />
                            </div>

                            <div>
                                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                                    State / Province
                                </label>
                                <input
                                    type="text"
                                    id="state"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="TC"
                                />
                            </div>

                            <div>
                                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-2">
                                    ZIP / Postal Code
                                </label>
                                <input
                                    type="text"
                                    id="zipCode"
                                    name="zipCode"
                                    value={formData.zipCode}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="12345"
                                />
                            </div>

                            <div>
                                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                                    Country
                                </label>
                                <input
                                    type="text"
                                    id="country"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="United States"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Business Hours Section */}
                <div>
                    <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-gray-200">
                        <Clock className="h-5 w-5 text-purple-600" />
                        <h4 className="text-md font-semibold text-gray-900">Business Hours</h4>
                    </div>

                    <div>
                        <label htmlFor="businessHours" className="block text-sm font-medium text-gray-700 mb-2">
                            Operating Hours
                        </label>
                        <textarea
                            id="businessHours"
                            name="businessHours"
                            rows={3}
                            value={formData.businessHours}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="Monday - Friday: 9:00 AM - 6:00 PM&#10;Saturday: 10:00 AM - 4:00 PM&#10;Sunday: Closed"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Enter your business hours (one line per entry)
                        </p>
                    </div>
                </div>

                {/* Social Media Section */}
                <div>
                    <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-gray-200">
                        <Globe className="h-5 w-5 text-purple-600" />
                        <h4 className="text-md font-semibold text-gray-900">Social Media Links</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="facebookUrl" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                                Facebook
                            </label>
                            <input
                                type="url"
                                id="facebookUrl"
                                name="facebookUrl"
                                value={formData.facebookUrl}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="https://facebook.com/yourpage"
                            />
                        </div>

                        <div>
                            <label htmlFor="instagramUrl" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                <Instagram className="h-4 w-4 mr-2 text-pink-600" />
                                Instagram
                            </label>
                            <input
                                type="url"
                                id="instagramUrl"
                                name="instagramUrl"
                                value={formData.instagramUrl}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="https://instagram.com/yourprofile"
                            />
                        </div>

                        <div>
                            <label htmlFor="linkedinUrl" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                <Linkedin className="h-4 w-4 mr-2 text-blue-700" />
                                LinkedIn
                            </label>
                            <input
                                type="url"
                                id="linkedinUrl"
                                name="linkedinUrl"
                                value={formData.linkedinUrl}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="https://linkedin.com/company/yourcompany"
                            />
                        </div>

                        <div>
                            <label htmlFor="twitterUrl" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                <Twitter className="h-4 w-4 mr-2 text-sky-500" />
                                Twitter / X
                            </label>
                            <input
                                type="url"
                                id="twitterUrl"
                                name="twitterUrl"
                                value={formData.twitterUrl}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="https://twitter.com/yourhandle"
                            />
                        </div>

                        <div>
                            <label htmlFor="youtubeUrl" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                <Youtube className="h-4 w-4 mr-2 text-red-600" />
                                YouTube
                            </label>
                            <input
                                type="url"
                                id="youtubeUrl"
                                name="youtubeUrl"
                                value={formData.youtubeUrl}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="https://youtube.com/@yourchannel"
                            />
                        </div>

                        <div>
                            <label htmlFor="whatsappNumber" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                                WhatsApp Number
                            </label>
                            <input
                                type="tel"
                                id="whatsappNumber"
                                name="whatsappNumber"
                                value={formData.whatsappNumber}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="+1234567890"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Include country code without spaces or special characters
                            </p>
                        </div>
                    </div>
                </div>

                {/* Additional Links Section */}
                <div>
                    <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-gray-200">
                        <Mail className="h-5 w-5 text-purple-600" />
                        <h4 className="text-md font-semibold text-gray-900">Additional Links</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-2">
                                Website URL
                            </label>
                            <input
                                type="url"
                                id="websiteUrl"
                                name="websiteUrl"
                                value={formData.websiteUrl}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="https://www.yourwebsite.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="blogUrl" className="block text-sm font-medium text-gray-700 mb-2">
                                Blog URL
                            </label>
                            <input
                                type="url"
                                id="blogUrl"
                                name="blogUrl"
                                value={formData.blogUrl}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="https://blog.yourwebsite.com"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
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

export default ContactSocialSettings;