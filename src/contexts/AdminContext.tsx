import React, { createContext, useContext, useState } from 'react';

interface GeneralSettings {
  siteName: string;
  logoUrl: string;
  dateFormat: string;
  timezone: string;
  emailVerificationRequired: boolean;
  mobileVerificationRequired: boolean;
  autoTutorAssignment: boolean;
  maxStudentsPerTutor: number;
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
  updateSettings: (settings: Partial<GeneralSettings>) => void;
  updateSMSGateway: (gateway: SMSGateway) => void;
  updateEmailSMTP: (smtp: EmailSMTP) => void;
  updateSubscriptionPlans: (plans: SubscriptionPlan[]) => void;
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
  const [settings, setSettings] = useState<GeneralSettings>({
    siteName: 'EduMaster',
    logoUrl: 'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'UTC',
    emailVerificationRequired: true,
    mobileVerificationRequired: true,
    autoTutorAssignment: true,
    maxStudentsPerTutor: 20
  });

  const [smsGateway, setSMSGateway] = useState<SMSGateway>({
    provider: 'Twilio (via Supabase)',
    apiKey: '',
    apiSecret: '',
    senderId: 'MLM-PLATFORM'
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
      tsp_price: 99,
      tsp_duration_days: 30,
      tsp_features: ['Free Course Access', 'Basic Dashboard', 'Email Support'],
      tsp_is_active: true
    },
    {
      id: '2',
      tsp_name: 'Premium Learning Plan',
      tsp_price: 199,
      tsp_duration_days: 30,
      tsp_features: ['All Course Access', 'Advanced Dashboard', 'Priority Support', 'Progress Analytics'],
      tsp_is_active: true
    },
    {
      id: '3',
      tsp_name: 'Pro Learning Plan',
      tsp_price: 399,
      tsp_duration_days: 30,
      tsp_features: ['All Course Access', 'Personal Tutor Assignment', '1-on-1 Sessions', 'Advanced Analytics', 'Certificate Generation'],
      tsp_is_active: true
    }
  ]);

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

  const value = {
    settings,
    smsGateway,
    emailSMTP,
    subscriptionPlans,
    updateSettings,
    updateSMSGateway,
    updateEmailSMTP,
    updateSubscriptionPlans
  };

  return (
      <AdminContext.Provider value={value}>
        {children}
      </AdminContext.Provider>
  );
};