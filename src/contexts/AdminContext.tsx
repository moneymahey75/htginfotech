import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../lib/adminClient';
import { withTimeout } from '../utils/loadingRecovery';

interface GeneralSettings {
  site_name: string;
  logo_url: string;
  date_format: string;
  timezone: string;
  email_verification_required: boolean;
  mobile_verification_required: boolean;
  either_verification_required: boolean;
  referral_mandatory: boolean;
  job_seeker_video_url: string;
  job_provider_video_url: string;

  // Contact Information
  primary_phone: string;
  primary_phone_tagline: string;
  secondary_phone: string;
  secondary_phone_tagline: string;
  primary_email: string;
  primary_email_tagline: string;
  support_email: string;
  support_email_tagline: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  business_hours: string;

  // Social Media Links
  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
  twitter_url: string;
  youtube_url: string;
  whatsapp_number: string;

  // Additional Links
  website_url: string;
  blog_url: string;

  // Username validation settings
  username_min_length: number;
  username_max_length: number;
  username_allow_spaces: boolean;
  username_allow_special_chars: boolean;
  username_allowed_special_chars: string;
  username_force_lower_case: boolean;
  username_unique_required: boolean;
  username_allow_numbers: boolean;
  username_must_start_with_letter: boolean;

  // Password validation settings
  password_min_length: number;
  password_max_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_special_chars: boolean;
  password_allowed_special_chars: string;
  password_prevent_common: boolean;
  password_prevent_sequences: boolean;
  password_prevent_repeats: boolean;
  password_max_consecutive: number;
  password_min_unique_chars: number;
  password_expiry_days: number;
  password_history_count: number;
}

interface SMSGateway {
  provider: string;
  apiKey: string;
  apiSecret: string;
  senderId: string;
}

interface EmailSMTP {
  host: string;
  port: number;
  username: string;
  password: string;
  encryption: string;
}

interface SubscriptionPlan {
  id: string;
  tsp_name: string;
  price: number;
  tsp_duration_days: number;
  tsp_features: string[];
  tsp_is_active: boolean;
}

interface AdminContextType {
  settings: GeneralSettings;
  smsGateway: SMSGateway;
  emailSMTP: EmailSMTP;
  subscriptionPlans: SubscriptionPlan[];
  loading: boolean;
  updateSettings: (settings: Partial<GeneralSettings>) => void;
  updateSMSGateway: (gateway: SMSGateway) => void;
  updateEmailSMTP: (smtp: EmailSMTP) => void;
  updateSubscriptionPlans: (plans: SubscriptionPlan[]) => void;
  refreshSettings: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);
const ADMIN_SETTINGS_TIMEOUT_MS = 10000;

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);

  const defaultSettings: GeneralSettings = {
    site_name: 'HTG Infotech',
    logo_url: '',
    date_format: 'DD/MM/YYYY',
    timezone: 'UTC',
    email_verification_required: true,
    mobile_verification_required: true,
    either_verification_required: false,
    referral_mandatory: false,
    job_seeker_video_url: '',
    job_provider_video_url: '',

    // Contact Information defaults
    primary_phone: '',
    primary_phone_tagline: '',
    secondary_phone: '',
    secondary_phone_tagline: '',
    primary_email: '',
    primary_email_tagline: '',
    support_email: '',
    support_email_tagline: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    business_hours: '',

    // Social Media defaults
    facebook_url: '',
    instagram_url: '',
    linkedin_url: '',
    twitter_url: '',
    youtube_url: '',
    whatsapp_number: '',

    // Additional Links defaults
    website_url: '',
    blog_url: '',

    // Username validation defaults
    username_min_length: 8,
    username_max_length: 30,
    username_allow_spaces: false,
    username_allow_special_chars: true,
    username_allowed_special_chars: '._-',
    username_force_lower_case: true,
    username_unique_required: true,
    username_allow_numbers: true,
    username_must_start_with_letter: true,

    // Password validation defaults
    password_min_length: 8,
    password_max_length: 128,
    password_require_uppercase: true,
    password_require_lowercase: true,
    password_require_numbers: true,
    password_require_special_chars: true,
    password_allowed_special_chars: '!@#$%^&*()_+-=[]{};:\'"|,.<>?/~`',
    password_prevent_common: true,
    password_prevent_sequences: true,
    password_prevent_repeats: true,
    password_max_consecutive: 3,
    password_min_unique_chars: 5,
    password_expiry_days: 90,
    password_history_count: 5
  };

  const [settings, setSettings] = useState<GeneralSettings>(defaultSettings);

  const [smsGateway, setSMSGateway] = useState<SMSGateway>({
    provider: 'Twilio (via Supabase)',
    apiKey: '',
    apiSecret: '',
    senderId: 'HTG-PLATFORM'
  });

  const [emailSMTP, setEmailSMTP] = useState<EmailSMTP>({
    host: 'Resend.com (via Supabase)',
    port: 587,
    username: '',
    password: '',
    encryption: 'TLS'
  });

  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([
    {
      id: '1',
      tsp_name: 'Basic Learning Plan',
      price: 99,
      tsp_duration_days: 30,
      tsp_features: ['Free Course Access', 'Basic Dashboard', 'Email Support'],
      tsp_is_active: true
    },
    {
      id: '2',
      tsp_name: 'Premium Learning Plan',
      price: 199,
      tsp_duration_days: 30,
      tsp_features: ['All Course Access', 'Advanced Dashboard', 'Priority Support', 'Progress Analytics'],
      tsp_is_active: true
    },
    {
      id: '3',
      tsp_name: 'Pro Learning Plan',
      price: 399,
      tsp_duration_days: 30,
      tsp_features: ['All Course Access', 'Personal Tutor Assignment', '1-on-1 Sessions', 'Advanced Analytics', 'Certificate Generation'],
      tsp_is_active: true
    }
  ]);

  const loadSettingsFromDatabase = async () => {
    try {
      setLoading(true);

      const { data, error } = await withTimeout(
        supabase
          .from('tbl_system_settings')
          .select('tss_setting_key, tss_setting_value'),
        ADMIN_SETTINGS_TIMEOUT_MS,
        'Loading system settings timed out'
      );

      if (error) {
        console.warn('Failed to load settings from database, using defaults:', error);
        setSettings(defaultSettings);
        return;
      }

      if (data && data.length > 0) {
        const settingsMap = data.reduce((acc: any, setting: any) => {
          try {
            let value = setting.tss_setting_value;

            if (typeof value === 'string') {
              try {
                value = JSON.parse(value);
              } catch {
                // Keep as string if JSON parse fails
              }
            }

            acc[setting.tss_setting_key] = value;
          } catch (parseError) {
            console.warn('Failed to parse setting value:', setting.tss_setting_key, parseError);
            acc[setting.tss_setting_key] = setting.tss_setting_value;
          }
          return acc;
        }, {});

        setEmailSMTP({
          host: settingsMap.smtp_host || 'smtp.resend.com',
          port: Number(settingsMap.smtp_port ?? 587) || 587,
          username: settingsMap.smtp_username || '',
          password: settingsMap.smtp_password || '',
          encryption: String(settingsMap.smtp_encryption || 'TLS').toUpperCase()
        });

        setSettings({
          site_name: settingsMap.site_name || defaultSettings.site_name,
          logo_url: settingsMap.logo_url || defaultSettings.logo_url,
          date_format: settingsMap.date_format || defaultSettings.date_format,
          timezone: settingsMap.timezone || defaultSettings.timezone,
          email_verification_required: settingsMap.email_verification_required ?? defaultSettings.email_verification_required,
          mobile_verification_required: settingsMap.mobile_verification_required ?? defaultSettings.mobile_verification_required,
          either_verification_required: settingsMap.either_verification_required ?? defaultSettings.either_verification_required,
          referral_mandatory: settingsMap.referral_mandatory ?? defaultSettings.referral_mandatory,
          job_seeker_video_url: settingsMap.job_seeker_video_url || defaultSettings.job_seeker_video_url,
          job_provider_video_url: settingsMap.job_provider_video_url || defaultSettings.job_provider_video_url,
          primary_phone: settingsMap.primary_phone || defaultSettings.primary_phone,
          primary_phone_tagline: settingsMap.primary_phone_tagline || defaultSettings.primary_phone_tagline,
          secondary_phone: settingsMap.secondary_phone || defaultSettings.secondary_phone,
          secondary_phone_tagline: settingsMap.secondary_phone_tagline || defaultSettings.secondary_phone_tagline,
          primary_email: settingsMap.primary_email || defaultSettings.primary_email,
          primary_email_tagline: settingsMap.primary_email_tagline || defaultSettings.primary_email_tagline,
          support_email: settingsMap.support_email || defaultSettings.support_email,
          support_email_tagline: settingsMap.support_email_tagline || defaultSettings.support_email_tagline,
          address: settingsMap.address || defaultSettings.address,
          city: settingsMap.city || defaultSettings.city,
          state: settingsMap.state || defaultSettings.state,
          zip_code: settingsMap.zip_code || defaultSettings.zip_code,
          country: settingsMap.country || defaultSettings.country,
          business_hours: settingsMap.business_hours || defaultSettings.business_hours,
          facebook_url: settingsMap.facebook_url || defaultSettings.facebook_url,
          instagram_url: settingsMap.instagram_url || defaultSettings.instagram_url,
          linkedin_url: settingsMap.linkedin_url || defaultSettings.linkedin_url,
          twitter_url: settingsMap.twitter_url || defaultSettings.twitter_url,
          youtube_url: settingsMap.youtube_url || defaultSettings.youtube_url,
          whatsapp_number: settingsMap.whatsapp_number || defaultSettings.whatsapp_number,
          website_url: settingsMap.website_url || defaultSettings.website_url,
          blog_url: settingsMap.blog_url || defaultSettings.blog_url,
          username_min_length: settingsMap.username_min_length ?? defaultSettings.username_min_length,
          username_max_length: settingsMap.username_max_length ?? defaultSettings.username_max_length,
          username_allow_spaces: settingsMap.username_allow_spaces ?? defaultSettings.username_allow_spaces,
          username_allow_special_chars: settingsMap.username_allow_special_chars ?? defaultSettings.username_allow_special_chars,
          username_allowed_special_chars: settingsMap.username_allowed_special_chars || defaultSettings.username_allowed_special_chars,
          username_force_lower_case: settingsMap.username_force_lower_case ?? defaultSettings.username_force_lower_case,
          username_unique_required: settingsMap.username_unique_required ?? defaultSettings.username_unique_required,
          username_allow_numbers: settingsMap.username_allow_numbers ?? defaultSettings.username_allow_numbers,
          username_must_start_with_letter: settingsMap.username_must_start_with_letter ?? defaultSettings.username_must_start_with_letter,
          password_min_length: settingsMap.password_min_length ?? defaultSettings.password_min_length,
          password_max_length: settingsMap.password_max_length ?? defaultSettings.password_max_length,
          password_require_uppercase: settingsMap.password_require_uppercase ?? defaultSettings.password_require_uppercase,
          password_require_lowercase: settingsMap.password_require_lowercase ?? defaultSettings.password_require_lowercase,
          password_require_numbers: settingsMap.password_require_numbers ?? defaultSettings.password_require_numbers,
          password_require_special_chars: settingsMap.password_require_special_chars ?? defaultSettings.password_require_special_chars,
          password_allowed_special_chars: settingsMap.password_allowed_special_chars || defaultSettings.password_allowed_special_chars,
          password_prevent_common: settingsMap.password_prevent_common ?? defaultSettings.password_prevent_common,
          password_prevent_sequences: settingsMap.password_prevent_sequences ?? defaultSettings.password_prevent_sequences,
          password_prevent_repeats: settingsMap.password_prevent_repeats ?? defaultSettings.password_prevent_repeats,
          password_max_consecutive: settingsMap.password_max_consecutive ?? defaultSettings.password_max_consecutive,
          password_min_unique_chars: settingsMap.password_min_unique_chars ?? defaultSettings.password_min_unique_chars,
          password_expiry_days: settingsMap.password_expiry_days ?? defaultSettings.password_expiry_days,
          password_history_count: settingsMap.password_history_count ?? defaultSettings.password_history_count
        });

        console.log('✅ Settings loaded from database');
      } else {
        console.log('No settings found in database, using defaults');
        setSettings(defaultSettings);
        setEmailSMTP({
          host: 'smtp.resend.com',
          port: 587,
          username: '',
          password: '',
          encryption: 'TLS'
        });
      }
    } catch (error) {
      console.error('Error loading settings from database:', error);
      setSettings(defaultSettings);
      setEmailSMTP({
        host: 'smtp.resend.com',
        port: 587,
        username: '',
        password: '',
        encryption: 'TLS'
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadSettingsFromDatabase();
  }, []);

  const updateSettings = (newSettings: Partial<GeneralSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateSMSGateway = (gateway: SMSGateway) => {
    setSMSGateway(gateway);
  };

  const updateEmailSMTP = (smtp: EmailSMTP) => {
    setEmailSMTP(smtp);
  };

  const updateSubscriptionPlans = (plans: SubscriptionPlan[]) => {
    setSubscriptionPlans(plans);
  };

  const refreshSettings = async () => {
    await loadSettingsFromDatabase();
  };

  const value = {
    settings,
    smsGateway,
    emailSMTP,
    subscriptionPlans,
    loading,
    updateSettings,
    updateSMSGateway,
    updateEmailSMTP,
    updateSubscriptionPlans,
    refreshSettings
  };

  return (
      <AdminContext.Provider value={value}>
        {children}
      </AdminContext.Provider>
  );
};
