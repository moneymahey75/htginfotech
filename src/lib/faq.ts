import { supabase } from './supabase';
import { supabase as adminSupabase } from './adminClient';

export type FAQCategoryIcon = 'help' | 'users' | 'card' | 'shield' | 'settings';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FAQCategory {
  id: string;
  title: string;
  icon: FAQCategoryIcon;
  items: FAQItem[];
}

export interface FAQContent {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    searchPlaceholder: string;
  };
  cta: {
    title: string;
    subtitle: string;
    supportButtonText: string;
    emailButtonText: string;
  };
  categories: FAQCategory[];
}

const FAQ_SETTING_KEY = 'faq_management';

export const defaultFAQContent: FAQContent = {
  hero: {
    badge: 'Help Center',
    title: 'Frequently Asked Questions',
    subtitle: 'Find quick answers to common questions about our HTG Infotech platform.',
    searchPlaceholder: 'Search for answers...',
  },
  cta: {
    title: 'Still have questions?',
    subtitle: 'Our support team is here to help you succeed. Get personalized assistance from our experts.',
    supportButtonText: 'Contact Support',
    emailButtonText: 'Email Us',
  },
  categories: [
    {
      id: 'general',
      title: 'General',
      icon: 'help',
      items: [
        {
          id: 'what-is-htg',
          question: 'What is HTG Infotech?',
          answer: 'HTG Infotech is a platform that connects learners, tutors, job seekers, and job providers through one digital ecosystem.',
        },
        {
          id: 'how-contact-support',
          question: 'How can I contact support?',
          answer: 'You can contact support from the Contact Us page or email the support team using the email listed in site settings.',
        },
      ],
    },
    {
      id: 'account-registration',
      title: 'Account & Registration',
      icon: 'users',
      items: [
        {
          id: 'create-account',
          question: 'How do I create an account?',
          answer: 'Choose the registration option that matches your role, complete the form, verify your details, and sign in to your dashboard.',
        },
        {
          id: 'forgot-password',
          question: 'What should I do if I forgot my password?',
          answer: 'Use the forgot password option on the login page and follow the instructions sent to your registered email address.',
        },
      ],
    },
    {
      id: 'payments-billing',
      title: 'Payments & Billing',
      icon: 'card',
      items: [
        {
          id: 'payment-methods',
          question: 'What payment methods are supported?',
          answer: 'Supported payment options may vary by service. Available payment methods are shown during checkout.',
        },
        {
          id: 'payment-history',
          question: 'Where can I view my payments?',
          answer: 'Learners can view payment details in their dashboard payment history section.',
        },
      ],
    },
    {
      id: 'security-privacy',
      title: 'Security & Privacy',
      icon: 'shield',
      items: [
        {
          id: 'data-secure',
          question: 'Is my data secure?',
          answer: 'We use access controls, secure platform practices, and verification tools to help protect user accounts and platform data.',
        },
        {
          id: 'privacy-policy',
          question: 'Where can I read the privacy policy?',
          answer: 'You can read the Privacy Policy from the Site Policies page linked in the footer.',
        },
      ],
    },
    {
      id: 'technical-support',
      title: 'Technical Support',
      icon: 'settings',
      items: [
        {
          id: 'supported-browsers',
          question: 'What browsers are supported?',
          answer: 'The platform supports current versions of major browsers including Chrome, Edge, Firefox, and Safari.',
        },
        {
          id: 'mobile-app',
          question: 'Is there a mobile app available?',
          answer: 'The website is responsive and works on mobile browsers. Mobile app availability will be announced when supported.',
        },
        {
          id: 'slow-dashboard',
          question: 'Why is my dashboard loading slowly?',
          answer: 'Slow loading can be caused by network issues, browser cache, or large account data. Try refreshing, clearing cache, or contacting support.',
        },
        {
          id: 'report-bug',
          question: 'How do I report a technical bug?',
          answer: 'Use the Contact Us page and include the issue, steps to reproduce, screenshots, and your browser/device details.',
        },
      ],
    },
  ],
};

type SystemSettingRow = {
  tss_id?: string;
  tss_setting_key: string;
  tss_setting_value: string | { content?: FAQContent | string };
};

const makeId = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `faq-${Date.now()}`;

const normalizeFAQContent = (content: Partial<FAQContent>): FAQContent => ({
  hero: { ...defaultFAQContent.hero, ...(content.hero || {}) },
  cta: { ...defaultFAQContent.cta, ...(content.cta || {}) },
  categories: content.categories?.length
    ? content.categories.map((category, categoryIndex) => ({
        ...defaultFAQContent.categories[categoryIndex % defaultFAQContent.categories.length],
        ...category,
        id: category.id || makeId(category.title || `category-${categoryIndex + 1}`),
        items: category.items?.length
          ? category.items.map((item, itemIndex) => ({
              id: item.id || makeId(item.question || `question-${itemIndex + 1}`),
              question: item.question || '',
              answer: item.answer || '',
            }))
          : [],
      }))
    : defaultFAQContent.categories,
});

export const parseFAQContent = (value?: string | null): FAQContent => {
  if (!value) return defaultFAQContent;

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return normalizeFAQContent(parsed as Partial<FAQContent>);
    }
  } catch {
    return defaultFAQContent;
  }

  return defaultFAQContent;
};

const parseSettingValue = (value: SystemSettingRow['tss_setting_value']) => {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed?.content ? JSON.stringify(parsed.content) : String(parsed ?? '');
    } catch {
      return value;
    }
  }

  if (!value?.content) {
    return '';
  }

  return typeof value.content === 'string' ? value.content : JSON.stringify(value.content);
};

const normalizeForSave = (content: FAQContent): FAQContent => ({
  ...content,
  categories: content.categories.map((category, categoryIndex) => ({
    ...category,
    id: category.id || makeId(category.title || `category-${categoryIndex + 1}`),
    items: category.items.map((item, itemIndex) => ({
      ...item,
      id: item.id || makeId(item.question || `question-${itemIndex + 1}`),
    })),
  })),
});

const stableFAQString = (content: FAQContent) => JSON.stringify(normalizeForSave(content));

export const getFAQContent = async (): Promise<FAQContent> => {
  const { data, error } = await supabase
    .from('tbl_system_settings')
    .select('tss_id, tss_setting_key, tss_setting_value')
    .eq('tss_setting_key', FAQ_SETTING_KEY)
    .maybeSingle();

  if (error || !data) {
    return defaultFAQContent;
  }

  return parseFAQContent(parseSettingValue(data as SystemSettingRow));
};

export const getFAQContentForAdmin = async (): Promise<FAQContent> => {
  const { data, error } = await adminSupabase
    .from('tbl_system_settings')
    .select('tss_id, tss_setting_key, tss_setting_value')
    .eq('tss_setting_key', FAQ_SETTING_KEY)
    .maybeSingle();

  if (error || !data) {
    return defaultFAQContent;
  }

  return parseFAQContent(parseSettingValue(data as SystemSettingRow));
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || fallback);
  }
  return fallback;
};

export const saveFAQContentForAdmin = async (content: FAQContent): Promise<FAQContent> => {
  const normalizedContent = normalizeForSave(content);
  const payload = {
    tss_setting_key: FAQ_SETTING_KEY,
    tss_setting_value: JSON.stringify({
      title: 'FAQ',
      content: normalizedContent,
      updated_at: new Date().toISOString(),
    }),
    tss_description: 'FAQ categories and questions',
    tss_is_public: true,
  };

  let response = await adminSupabase
    .from('tbl_system_settings')
    .upsert(payload, { onConflict: 'tss_setting_key' });

  if (response.error && getErrorMessage(response.error, '').includes('tss_is_public')) {
    const { tss_is_public: _unused, ...payloadWithoutPublicFlag } = payload;
    response = await adminSupabase
      .from('tbl_system_settings')
      .upsert(payloadWithoutPublicFlag, { onConflict: 'tss_setting_key' });
  }

  if (response.error) {
    throw new Error(getErrorMessage(response.error, 'Failed to save FAQ content'));
  }

  const verificationResponse = await adminSupabase
    .from('tbl_system_settings')
    .select('tss_id, tss_setting_value')
    .eq('tss_setting_key', FAQ_SETTING_KEY)
    .maybeSingle();

  if (verificationResponse.error || !verificationResponse.data) {
    throw new Error(getErrorMessage(verificationResponse.error, 'FAQ save could not be verified'));
  }

  const storedContent = parseFAQContent(
    parseSettingValue((verificationResponse.data as SystemSettingRow).tss_setting_value)
  );

  if (stableFAQString(storedContent) !== stableFAQString(normalizedContent)) {
    throw new Error('FAQ save verification failed. The saved data did not match your latest changes.');
  }

  return normalizedContent;
};

export const createFAQCategory = (title = 'New Category'): FAQCategory => ({
  id: makeId(`${title}-${Date.now()}`),
  title,
  icon: 'help',
  items: [],
});

export const createFAQItem = (): FAQItem => ({
  id: makeId(`question-${Date.now()}`),
  question: 'New question',
  answer: 'Add the answer here.',
});
