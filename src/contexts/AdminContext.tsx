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

  // Default settings with username validation
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

  // Load settings from database
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

            // Handle JSON parsing
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

        // Update settings with database values, maintaining defaults for missing values
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

          // Username validation settings
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

  // Load settings on mount
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