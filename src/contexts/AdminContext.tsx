import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../lib/supabase';

interface GeneralSettings {
  siteName: string;
  logoUrl: string;
  dateFormat: string;
  timezone: string;
  emailVerificationRequired: boolean;
  mobileVerificationRequired: boolean;
  eitherVerificationRequired: boolean;
  referralMandatory: boolean;
  autoTutorAssignment: boolean;
  maxStudentsPerTutor: number;
  jobSeekerVideoUrl: string;
  jobProviderVideoUrl: string;

  // Contact Information
  primaryPhone: string;
  primaryPhoneTagline: string;
  secondaryPhone: string;
  secondaryPhoneTagline: string;
  primaryEmail: string;
  primaryEmailTagline: string;
  supportEmail: string;
  supportEmailTagline: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  businessHours: string;

  // Social Media Links
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  whatsappNumber: string;

  // Additional Links
  websiteUrl: string;
  blogUrl: string;

  // Username validation settings
  usernameMinLength: number;
  usernameMaxLength: number;
  usernameAllowSpaces: boolean;
  usernameAllowSpecialChars: boolean;
  usernameAllowedSpecialChars: string;
  usernameForceLowerCase: boolean;
  usernameUniqueRequired: boolean;
  usernameAllowNumbers: boolean;
  usernameMustStartWithLetter: boolean;
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
    siteName: 'HTG Infotech',
    logoUrl: '',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'UTC',
    emailVerificationRequired: true,
    mobileVerificationRequired: true,
    eitherVerificationRequired: false,
    referralMandatory: false,
    autoTutorAssignment: true,
    maxStudentsPerTutor: 20,
    jobSeekerVideoUrl: '',
    jobProviderVideoUrl: '',

    // Contact Information defaults
    primaryPhone: '',
    primaryPhoneTagline: '',
    secondaryPhone: '',
    secondaryPhoneTagline: '',
    primaryEmail: '',
    primaryEmailTagline: ''
,   supportEmail: '',
    supportEmailTagline: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    businessHours: '',

    // Social Media defaults
    facebookUrl: '',
    instagramUrl: '',
    linkedinUrl: '',
    twitterUrl: '',
    youtubeUrl: '',
    whatsappNumber: '',

    // Additional Links defaults
    websiteUrl: '',
    blogUrl: '',

    // Username validation defaults
    usernameMinLength: 8,
    usernameMaxLength: 30,
    usernameAllowSpaces: false,
    usernameAllowSpecialChars: true,
    usernameAllowedSpecialChars: '._-',
    usernameForceLowerCase: true,
    usernameUniqueRequired: true,
    usernameAllowNumbers: true,
    usernameMustStartWithLetter: true
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

      const { data, error } = await supabase
          .from('tbl_system_settings')
          .select('tss_setting_key, tss_setting_value');

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

        setSettings({
          siteName: settingsMap.site_name || defaultSettings.siteName,
          logoUrl: settingsMap.logo_url || defaultSettings.logoUrl,
          dateFormat: settingsMap.date_format || defaultSettings.dateFormat,
          timezone: settingsMap.timezone || defaultSettings.timezone,
          emailVerificationRequired: settingsMap.email_verification_required ?? defaultSettings.emailVerificationRequired,
          mobileVerificationRequired: settingsMap.mobile_verification_required ?? defaultSettings.mobileVerificationRequired,
          eitherVerificationRequired: settingsMap.either_verification_required ?? defaultSettings.eitherVerificationRequired,
          referralMandatory: settingsMap.referral_mandatory ?? defaultSettings.referralMandatory,
          autoTutorAssignment: settingsMap.auto_tutor_assignment ?? defaultSettings.autoTutorAssignment,
          maxStudentsPerTutor: settingsMap.max_students_per_tutor ?? defaultSettings.maxStudentsPerTutor,
          jobSeekerVideoUrl: settingsMap.job_seeker_video_url || defaultSettings.jobSeekerVideoUrl,
          jobProviderVideoUrl: settingsMap.job_provider_video_url || defaultSettings.jobProviderVideoUrl,

          primaryPhone: settingsMap.primary_phone || defaultSettings.primaryPhone,
          primaryPhoneTagline: settingsMap.primary_phone_tagline || defaultSettings.primaryPhoneTagline,
          secondaryPhone: settingsMap.secondary_phone || defaultSettings.secondaryPhone,
          secondaryPhoneTagline: settingsMap.secondary_phone || defaultSettings.secondaryPhoneTagline,
          primaryEmail: settingsMap.primary_email || defaultSettings.primaryEmail,
          primaryEmailTagline: settingsMap.primary_email_tagline || defaultSettings.primaryEmailTagline,
          supportEmail: settingsMap.support_email || defaultSettings.supportEmail,
          supportEmailTagline: settingsMap.support_email_tagline || defaultSettings.supportEmailTagline,
          address: settingsMap.address || defaultSettings.address,
          city: settingsMap.city || defaultSettings.city,
          state: settingsMap.state || defaultSettings.state,
          zipCode: settingsMap.zip_code || defaultSettings.zipCode,
          country: settingsMap.country || defaultSettings.country,
          businessHours: settingsMap.business_hours || defaultSettings.businessHours,

          facebookUrl: settingsMap.facebook_url || defaultSettings.facebookUrl,
          instagramUrl: settingsMap.instagram_url || defaultSettings.instagramUrl,
          linkedinUrl: settingsMap.linkedin_url || defaultSettings.linkedinUrl,
          twitterUrl: settingsMap.twitter_url || defaultSettings.twitterUrl,
          youtubeUrl: settingsMap.youtube_url || defaultSettings.youtubeUrl,
          whatsappNumber: settingsMap.whatsapp_number || defaultSettings.whatsappNumber,

          websiteUrl: settingsMap.website_url || defaultSettings.websiteUrl,
          blogUrl: settingsMap.blog_url || defaultSettings.blogUrl,

          usernameMinLength: settingsMap.username_min_length ?? defaultSettings.usernameMinLength,
          usernameMaxLength: settingsMap.username_max_length ?? defaultSettings.usernameMaxLength,
          usernameAllowSpaces: settingsMap.username_allow_spaces ?? defaultSettings.usernameAllowSpaces,
          usernameAllowSpecialChars: settingsMap.username_allow_special_chars ?? defaultSettings.usernameAllowSpecialChars,
          usernameAllowedSpecialChars: settingsMap.username_allowed_special_chars || defaultSettings.usernameAllowedSpecialChars,
          usernameForceLowerCase: settingsMap.username_force_lower_case ?? defaultSettings.usernameForceLowerCase,
          usernameUniqueRequired: settingsMap.username_unique_required ?? defaultSettings.usernameUniqueRequired,
          usernameAllowNumbers: settingsMap.username_allow_numbers ?? defaultSettings.usernameAllowNumbers,
          usernameMustStartWithLetter: settingsMap.username_must_start_with_letter ?? defaultSettings.usernameMustStartWithLetter
        });

        console.log('✅ Settings loaded from database');
      } else {
        console.log('No settings found in database, using defaults');
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading settings from database:', error);
      setSettings(defaultSettings);
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